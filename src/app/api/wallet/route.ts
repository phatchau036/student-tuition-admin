import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";
import {
  getStudentWeekdays,
  ensureStudentPlan,
  getWalletBalance,
  appendLedger,
  grantCycleForPayment,
  getCycleRange,
  isDateInPlan,
} from "@/lib/wallet";
import { calcCycleGrant, formatMinutes, parseRegisteredDaysToWeekdays } from "@/lib/tuition";

/* =========================================================================
 * API VÍ GIỜ HỌC (HOUR WALLET)
 * actions: preview_cycle | grant_cycle | mark_attendance | report_absence |
 *          schedule_makeup | cancel_makeup | adjust_hours | get_wallet | get_plans
 * Mọi ghi sổ cái đều idempotent theo (ref_type, ref_id).
 * ========================================================================= */

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "get_wallet";
    const studentId = searchParams.get("student_id") || "";
    const schoolId = getSchoolIdFromRequest(req);

    if (action === "get_wallet") {
      if (!studentId) {
        return NextResponse.json({ success: false, message: "Thiếu student_id!" }, { status: 400 });
      }
      const balance = await getWalletBalance(studentId);
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("page_size") || 20)));

      const ledgerRes = await db.execute({
        sql: `SELECT * FROM hour_ledger WHERE student_id = ?
              ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        args: [studentId, pageSize, (page - 1) * pageSize],
      });
      const totalRes = await db.execute({
        sql: "SELECT COUNT(*) as total FROM hour_ledger WHERE student_id = ?",
        args: [studentId],
      });

      return NextResponse.json({
        success: true,
        data: {
          ...balance,
          formatted: {
            balance: formatMinutes(balance.balance_minutes),
            available: formatMinutes(balance.available_minutes),
            scheduled_makeup: formatMinutes(balance.scheduled_makeup_minutes),
          },
          ledger: ledgerRes.rows.map((r) => ({
            id: String(r.id),
            type: String(r.type),
            minutes: Number(r.minutes),
            ref_type: String(r.ref_type || ""),
            note: String(r.note || ""),
            created_by: String(r.created_by || ""),
            created_at: String(r.created_at || ""),
          })),
          pagination: {
            page,
            page_size: pageSize,
            total: Number(totalRes.rows[0]?.total || 0),
          },
        },
      });
    }

    if (action === "preview_cycle") {
      // Xem trước công thức cấp giờ trước khi xác nhận đóng tiền
      if (!studentId) {
        return NextResponse.json({ success: false, message: "Thiếu student_id!" }, { status: 400 });
      }
      const cycleMonth = searchParams.get("cycle_month") || "";
      if (!/^\d{4}-\d{2}$/.test(cycleMonth)) {
        return NextResponse.json({ success: false, message: "cycle_month phải dạng YYYY-MM!" }, { status: 400 });
      }

      const info = await ensureStudentPlan(studentId);
      if (!info || info.weekdays.length === 0) {
        return NextResponse.json({ success: false, message: "Học sinh chưa có lịch học cố định!" }, { status: 400 });
      }

      const stRes = await db.execute({
        sql: "SELECT start_date FROM students WHERE id = ?",
        args: [studentId],
      });
      const studentStart = stRes.rows.length > 0 && stRes.rows[0].start_date ? String(stRes.rows[0].start_date) : null;

      const range = getCycleRange(cycleMonth);
      let start = range.start;
      if (studentStart && studentStart > range.start && studentStart < range.endExclusive) {
        start = studentStart; // Em vào học giữa tháng
      }

      const grant = calcCycleGrant({
        start: new Date(start + "T00:00:00Z"),
        endExclusive: new Date(range.endExclusive + "T00:00:00Z"),
        weekdays: info.weekdays,
        minutesPerSession: info.minutesPerSession,
      });

      return NextResponse.json({
        success: true,
        data: {
          cycle_month: cycleMonth,
          start_date: start,
          end_date_exclusive: range.endExclusive,
          weekdays: info.weekdays,
          minutes_per_session: info.minutesPerSession,
          ...grant,
          formatted: formatMinutes(grant.minutes),
          breakdown: `${grant.fullWeeks} tuần + ${grant.leftoverDays} ngày = ${grant.sessions} buổi × ${info.minutesPerSession} phút`,
        },
      });
    }

    if (action === "get_plans") {
      // Lịch các buổi có thật trong chu kỳ (dùng cho báo nghỉ/chọn ngày bù ở UI)
      if (!studentId) {
        return NextResponse.json({ success: false, message: "Thiếu student_id!" }, { status: 400 });
      }
      const month = searchParams.get("month") || "";
      const info = await ensureStudentPlan(studentId);
      if (!info) {
        return NextResponse.json({ success: true, data: { weekdays: [], dates: [], minutes_per_session: 90 } });
      }

      // Sinh danh sách ngày học có thật trong tháng theo weekdays
      const dates: string[] = [];
      if (/^\d{4}-\d{2}$/.test(month)) {
        const range = getCycleRange(month);
        const startT = new Date(range.start + "T00:00:00Z").getTime();
        const endT = new Date(range.endExclusive + "T00:00:00Z").getTime();
        for (let t = startT; t < endT; t += 86400000) {
          const iso = new Date(t).toISOString().slice(0, 10);
          if (isDateInPlan(iso, info.weekdays)) dates.push(iso);
        }
      }

      return NextResponse.json({
        success: true,
        data: { weekdays: info.weekdays, dates, minutes_per_session: info.minutesPerSession },
      });
    }

    return NextResponse.json({ success: false, message: "Action GET không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Wallet GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action } = body;
    const createdBy = "admin";

    /* ---------- 1. GRANT CYCLE (Cấp giờ khi đóng tiền — có thể gọi tay) ---------- */
    if (action === "grant_cycle") {
      const { student_id, cycle_month, start_override } = body;
      if (!student_id || !/^\d{4}-\d{2}$/.test(cycle_month || "")) {
        return NextResponse.json({ success: false, message: "Thiếu student_id hoặc cycle_month sai định dạng!" }, { status: 400 });
      }
      const result = await grantCycleForPayment({
        studentId: student_id,
        cycleMonth: cycle_month,
        startOverride: start_override,
        createdBy,
      });
      return NextResponse.json({ success: true, message: result.granted ? "Đã cấp giờ cho chu kỳ!" : "Chu kỳ này đã cấp trước đó", ...result });
    }

    /* ---------- 2. MARK ATTENDANCE (Điểm danh → CONSUME) ---------- */
    if (action === "mark_attendance") {
      const { lesson_id, actual_minutes } = body;
      if (!lesson_id) {
        return NextResponse.json({ success: false, message: "Thiếu lesson_id!" }, { status: 400 });
      }
      const lessonRes = await db.execute({
        sql: "SELECT * FROM lessons WHERE id = ? LIMIT 1",
        args: [lesson_id],
      });
      if (lessonRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: "Không tìm thấy buổi học!" }, { status: 404 });
      }
      const lesson = lessonRes.rows[0];
      if (String(lesson.status) === "attended") {
        return NextResponse.json({ success: false, message: "Buổi này đã điểm danh trước đó!" }, { status: 400 });
      }

      const actualMin = Number(actual_minutes) || Number(lesson.planned_minutes) || 90;

      await db.batch(
        [
          {
            sql: `UPDATE lessons SET status = 'attended', actual_minutes = ? WHERE id = ?`,
            args: [actualMin, lesson_id],
          },
          {
            sql: `INSERT INTO hour_ledger (id, student_id, cycle_id, type, minutes, ref_type, ref_id, note, created_by)
                  SELECT ?, student_id, NULL, 'CONSUME', ?, 'lesson', ?, ?, ?
                  FROM lessons WHERE id = ?`,
            args: [
              `lg-${String(lesson.student_id).slice(0, 8)}-les-${lesson_id}`,
              -actualMin,
              lesson_id,
              `Học thực tế ${actualMin} phút ngày ${lesson.date}`,
              createdBy,
              lesson_id,
            ],
          },
        ],
        "write"
      );

      // Nghỉ không phép: nếu là buổi regular bị đánh dấu absent_unexcused sẽ xử lý ở action riêng
      return NextResponse.json({ success: true, message: `Đã điểm danh, trừ ${formatMinutes(actualMin)} khỏi ví giờ!` });
    }

    /* ---------- 3. REPORT ABSENCE (Nghỉ có phép — KHÔNG trừ giờ) ---------- */
    if (action === "report_absence") {
      const { student_id, date, start_time, reason } = body;
      if (!student_id || !date) {
        return NextResponse.json({ success: false, message: "Thiếu student_id hoặc ngày nghỉ!" }, { status: 400 });
      }

      const info = await ensureStudentPlan(student_id);
      if (!info) {
        return NextResponse.json({ success: false, message: "Học sinh chưa có lịch học cố định!" }, { status: 400 });
      }

      // Chặn ngày không thuộc lịch của em
      if (!isDateInPlan(date, info.weekdays)) {
        return NextResponse.json(
          { success: false, message: "Ngày này không thuộc lịch học cố định của học sinh (không phải thứ học)!" },
          { status: 400 }
        );
      }

      // Chặn báo trùng cùng ngày
      const dupRes = await db.execute({
        sql: `SELECT id FROM lessons WHERE student_id = ? AND date = ? AND kind = 'regular' AND status IN ('scheduled', 'absent_excused', 'attended') LIMIT 1`,
        args: [student_id, date],
      });
      if (dupRes.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: "Học sinh này đã được ghi nhận cho ngày rồi (không cho báo nghỉ trùng)!" },
          { status: 400 }
        );
      }

      const lessonId = `les-${student_id.slice(0, 8)}-${date}-${Date.now().toString(36)}`;
      await db.execute({
        sql: `INSERT INTO lessons (id, student_id, date, start_time, planned_minutes, kind, status, reason, created_by)
              VALUES (?, ?, ?, ?, ?, 'regular', 'absent_excused', ?, ?)`,
        args: [lessonId, student_id, date, start_time || "18:00", info.minutesPerSession, reason || "Nghỉ có phép", createdBy],
      });

      // KHÔNG ghi CONSUME — giờ vẫn nằm trong ví để xếp bù
      return NextResponse.json({
        success: true,
        message: `Đã ghi nhận nghỉ có phép ngày ${date}. Giờ vẫn nằm trong ví để xếp học bù!`,
        lesson_id: lessonId,
      });
    }

    /* ---------- 4. SCHEDULE MAKEUP (Xếp bù trừ số dư khả dụng) ---------- */
    if (action === "schedule_makeup") {
      const { student_id, date, start_time, minutes, slot_id, subject_id } = body;
      if (!student_id || !date || !start_time) {
        return NextResponse.json({ success: false, message: "Thiếu thông tin ngày/giờ học bù!" }, { status: 400 });
      }

      const settingsRes = await db.execute("SELECT key, value FROM settings");
      const settingsMap: Record<string, string> = {};
      for (const row of settingsRes.rows) settingsMap[String(row.key)] = String(row.value);
      const minChunk = Number(settingsMap["min_chunk_minutes"] || 30);

      const makeupMin = Number(minutes) || 60;
      if (makeupMin <= 0 || makeupMin % minChunk !== 0) {
        return NextResponse.json(
          { success: false, message: `Thời lượng bù phải là bội số của ${minChunk} phút!` },
          { status: 400 }
        );
      }

      // Điều kiện số dư khả dụng
      const wallet = await getWalletBalance(student_id);
      if (wallet.available_minutes < makeupMin) {
        return NextResponse.json(
          {
            success: false,
            message: `Số dư khả dụng không đủ! Hiện còn ${formatMinutes(wallet.available_minutes)} (${wallet.balance_minutes > 0 ? "số dư " + formatMinutes(wallet.balance_minutes) + ", đã xếp bù " + formatMinutes(wallet.scheduled_makeup_minutes) : "số dư âm"}), cần ${formatMinutes(makeupMin)}.`,
          },
          { status: 400 }
        );
      }

      // Kiểm tra trùng giờ với buổi khác của chính em (theo khoảng chồng lấn)
      const overlapRes = await db.execute({
        sql: `SELECT id, start_time, planned_minutes, kind, status FROM lessons
              WHERE student_id = ? AND date = ? AND status IN ('scheduled', 'attended')
                AND start_time != ?`,
        args: [student_id, date, start_time],
      });
      const [newH, newM] = start_time.split(":").map(Number);
      const newStart = newH * 60 + newM;
      const newEnd = newStart + makeupMin;
      for (const row of overlapRes.rows) {
        const [oh, om] = String(row.start_time).split(":").map(Number);
        const oStart = oh * 60 + om;
        const oEnd = oStart + Number(row.planned_minutes || 90);
        if (newStart < oEnd && newEnd > oStart) {
          return NextResponse.json(
            { success: false, message: `Học sinh đã có buổi học khác trùng giờ này (${row.start_time}, ${row.kind === "makeup" ? "học bù" : "lịch cố định"})!` },
            { status: 400 }
          );
        }
      }

      // Kiểm tra sĩ số theo slot (giữ logic by_slot/by_teacher từ makeups cũ)
      if (slot_id) {
        const defaultMaxCapacity = Number(settingsMap["max_students_per_slot"] || 10);
        const capacityMode = settingsMap["capacity_mode"] || "by_slot";
        const [y, m, d] = date.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayIdx = dateObj.getDay();
        const dayName = dayIdx === 0 ? "Chủ Nhật" : `Thứ ${dayIdx + 1}`;

        let maxCapacity = defaultMaxCapacity;
        if (capacityMode === "by_teacher") {
          const teachersRes = await db.execute("SELECT * FROM teachers WHERE is_active = 1");
          let capTotal = 0;
          let matched = 0;
          for (const tc of teachersRes.rows) {
            let assignedSlots: string[] = [];
            let shifts: Array<{ day?: string }> = [];
            try {
              if (tc.assigned_slot_ids) {
                const parsed = JSON.parse(String(tc.assigned_slot_ids));
                if (Array.isArray(parsed)) assignedSlots = parsed;
              }
              if (tc.working_shifts_json) {
                const parsed = JSON.parse(String(tc.working_shifts_json));
                if (Array.isArray(parsed)) shifts = parsed;
              }
            } catch {}
            if (assignedSlots.includes(String(slot_id)) || shifts.some((s) => s.day === dayName)) {
              matched++;
              capTotal += Number(tc.max_students || defaultMaxCapacity);
            }
          }
          if (matched > 0) maxCapacity = capTotal;
        } else {
          const slotCheck = await db.execute({
            sql: "SELECT max_students FROM time_slots WHERE id = ?",
            args: [slot_id],
          });
          if (slotCheck.rows.length > 0) maxCapacity = Number(slotCheck.rows[0].max_students || defaultMaxCapacity);
        }

        // Đếm học sinh cố định trùng ca & ngày
        const regularRes = await db.execute({
          sql: "SELECT id, registered_days FROM students WHERE time_slot_id = ? AND status != 'dropped'",
          args: [slot_id],
        });
        let regularCount = 0;
        for (const st of regularRes.rows) {
          if (String(st.registered_days || "").includes(dayName)) regularCount++;
        }

        // Đếm các buổi bù đã xếp trong ngày trùng ca
        const makeupRes = await db.execute({
          sql: `SELECT COALESCE(SUM(planned_minutes), 0) as total_min, COUNT(*) as cnt FROM lessons
                WHERE date = ? AND slot_id = ? AND kind = 'makeup' AND status = 'scheduled'`,
          args: [date, slot_id],
        });
        // Sĩ số đếm theo buổi: mỗi buổi bù chiếm 1 chỗ
        const makeupCount = Number(makeupRes.rows[0]?.cnt || 0);

        if (regularCount + makeupCount >= maxCapacity) {
          return NextResponse.json(
            { success: false, message: `Khung giờ này đã đủ sĩ số (${regularCount + makeupCount}/${maxCapacity} - HẾT SUẤT). Vui lòng chọn ca khác!` },
            { status: 400 }
          );
        }
      }

      const lessonId = `les-${student_id.slice(0, 8)}-mk-${date}-${Date.now().toString(36)}`;
      await db.execute({
        sql: `INSERT INTO lessons (id, student_id, date, start_time, planned_minutes, slot_id, subject_id, kind, status, reason, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, 'makeup', 'scheduled', 'Buổi học bù (dùng giờ từ ví)', ?)`,
        args: [lessonId, student_id, date, start_time, makeupMin, slot_id || null, subject_id || null, createdBy],
      });

      return NextResponse.json({
        success: true,
        message: `Đã xếp học bù ${formatMinutes(makeupMin)} ngày ${date} lúc ${start_time}!`,
        lesson_id: lessonId,
        remaining_available: wallet.available_minutes - makeupMin,
      });
    }

    /* ---------- 5. CANCEL MAKEUP (Hủy bù — KHÔNG hoàn giờ vì chỉ trừ khi học thật) ---------- */
    if (action === "cancel_makeup") {
      const { lesson_id } = body;
      if (!lesson_id) {
        return NextResponse.json({ success: false, message: "Thiếu lesson_id!" }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE lessons SET status = 'cancelled' WHERE id = ? AND kind = 'makeup' AND status = 'scheduled'`,
        args: [lesson_id],
      });
      return NextResponse.json({ success: true, message: "Đã hủy buổi học bù. Giờ vẫn nằm trong ví!" });
    }

    /* ---------- 6. ADJUST HOURS (Admin cộng/trừ tay — bắt buộc có ghi chú) ---------- */
    if (action === "adjust_hours") {
      const { student_id, minutes, note } = body;
      const adjustMin = Number(minutes);
      if (!student_id || !adjustMin || !note || !String(note).trim()) {
        return NextResponse.json(
          { success: false, message: "Cần student_id, số phút (khác 0) và ghi chú bắt buộc!" },
          { status: 400 }
        );
      }
      await appendLedger({
        studentId: student_id,
        type: "ADJUST",
        minutes: adjustMin,
        refType: "adjust",
        refId: `adj-${student_id}-${Date.now()}`,
        note: String(note).trim(),
        createdBy,
      });
      return NextResponse.json({ success: true, message: `Đã điều chỉnh ${formatMinutes(adjustMin)} cho ví giờ!` });
    }

    /* ---------- 7. REPORT UNEXCUSED (Nghỉ không phép — trừ giờ nếu config bật) ---------- */
    if (action === "report_unexcused") {
      const { student_id, date, start_time, reason } = body;
      if (!student_id || !date) {
        return NextResponse.json({ success: false, message: "Thiếu student_id hoặc ngày!" }, { status: 400 });
      }
      const settingsRes = await db.execute({
        sql: "SELECT value FROM settings WHERE key = 'deduct_unexcused'",
      });
      const deduct = String(settingsRes.rows[0]?.value || "true") !== "false";
      const info = await ensureStudentPlan(student_id);

      const lessonId = `les-${student_id.slice(0, 8)}-ab-${date}-${Date.now().toString(36)}`;
      await db.execute({
        sql: `INSERT INTO lessons (id, student_id, date, start_time, planned_minutes, kind, status, reason, created_by)
              VALUES (?, ?, ?, ?, ?, 'regular', 'absent_unexcused', ?, ?)`,
        args: [lessonId, student_id, date, start_time || "18:00", info?.minutesPerSession || 90, reason || "Nghỉ không phép", createdBy],
      });

      if (deduct && info) {
        await appendLedger({
          studentId: student_id,
          type: "CONSUME",
          minutes: -info.minutesPerSession,
          refType: "lesson_unexcused",
          refId: lessonId,
          note: `Nghỉ không phép ngày ${date} — trừ như đã học`,
          createdBy,
        });
      }

      return NextResponse.json({
        success: true,
        message: deduct ? "Đã ghi nhận nghỉ không phép và trừ giờ như đã học!" : "Đã ghi nhận nghỉ không phép (không trừ giờ theo cài đặt).",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Wallet POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
