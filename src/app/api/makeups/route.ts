import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";
import { appendLedger, getWalletBalance, getStudentSessionMinutes } from "@/lib/wallet";
import { formatMinutes } from "@/lib/tuition";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "";
    const studentId = searchParams.get("student_id");
    const action = searchParams.get("action");

    // Action phụ: Lấy lịch sử biến động sổ cái quỹ giờ bù của 1 học sinh
    if (action === "history" && studentId) {
      const ledgerRes = await db.execute({
        sql: `SELECT * FROM hour_ledger 
              WHERE student_id = ? 
              ORDER BY created_at DESC, id DESC LIMIT 50`,
        args: [studentId],
      });
      const balance = await getWalletBalance(studentId);
      return NextResponse.json({
        success: true,
        data: {
          balance,
          history: ledgerRes.rows.map((r) => ({
            id: String(r.id),
            type: String(r.type),
            minutes: Number(r.minutes),
            ref_type: String(r.ref_type || ""),
            note: String(r.note || ""),
            created_at: String(r.created_at || ""),
          })),
        },
      });
    }

    let query = `
      SELECT m.*, 
             COALESCE(s.name, m.student_name, 'Học viên') as student_name, 
             COALESCE(s.phone, m.student_phone, '') as student_phone, 
             s.school_id as student_school_id,
             s.registered_days, 
             s.study_time_detail,
             s.schedule_details_json,
             COALESCE(tc.name, 'Chưa phân công') as teacher_name
      FROM makeup_classes m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN teachers tc ON s.teacher_id = tc.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (schoolId && schoolId !== "all") {
      query += ` AND (s.school_id = ? OR s.school_id IS NULL OR s.school_id = '' OR s.school_id = 'school-default' OR m.student_name != '')`;
      args.push(schoolId);
    }

    if (studentId) {
      query += " AND m.student_id = ?";
      args.push(studentId);
    }

    query += " ORDER BY m.absence_date DESC, m.created_at DESC";

    const res = await db.execute({ sql: query, args });

    // Lấy thông tin số dư quỹ giờ của từng học sinh liên quan
    const studentIds = Array.from(new Set(res.rows.map((r) => String(r.student_id))));
    const walletMap: Record<string, { balance_minutes: number; available_minutes: number }> = {};
    for (const sid of studentIds) {
      try {
        const bal = await getWalletBalance(sid);
        walletMap[sid] = {
          balance_minutes: bal.balance_minutes,
          available_minutes: bal.available_minutes,
        };
      } catch {
        walletMap[sid] = { balance_minutes: 0, available_minutes: 0 };
      }
    }

    const makeups = res.rows.map((row) => {
      const sid = String(row.student_id);
      return {
        id: String(row.id),
        student_id: sid,
        student_name: String(row.student_name || "Học viên"),
        student_phone: String(row.student_phone || ""),
        teacher_name: row.teacher_name ? String(row.teacher_name) : "Chưa phân công",
        absence_date: String(row.absence_date || ""),
        absence_reason: String(row.absence_reason || ""),
        absence_start_time: row.absence_start_time ? String(row.absence_start_time) : "18:00",
        absence_end_time: row.absence_end_time ? String(row.absence_end_time) : "19:30",
        absence_minutes: Number(row.absence_minutes || 90),
        status: String(row.status || "pending"),
        makeup_date: row.makeup_date ? String(row.makeup_date) : undefined,
        makeup_time: row.makeup_time ? String(row.makeup_time) : undefined,
        makeup_start_time: row.makeup_start_time ? String(row.makeup_start_time) : undefined,
        makeup_end_time: row.makeup_end_time ? String(row.makeup_end_time) : undefined,
        makeup_minutes: row.makeup_minutes ? Number(row.makeup_minutes) : undefined,
        makeup_slot_id: row.makeup_slot_id ? String(row.makeup_slot_id) : undefined,
        makeup_teacher_id: row.makeup_teacher_id ? String(row.makeup_teacher_id) : undefined,
        lesson_id: row.lesson_id ? String(row.lesson_id) : undefined,
        note: row.note ? String(row.note) : undefined,
        created_at: String(row.created_at || ""),
        student_wallet: walletMap[sid] || { balance_minutes: 0, available_minutes: 0 },
      };
    });

    return NextResponse.json({ success: true, data: makeups });
  } catch (error: unknown) {
    console.error("Makeups GET Error:", error);
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

    const {
      action,
      student_id,
      absence_date,
      absence_reason,
      absence_start_time,
      absence_end_time,
      absence_minutes,
      makeup_id,
      makeup_date,
      makeup_time,
      makeup_start_time,
      makeup_end_time,
      makeup_minutes,
      makeup_slot_id,
      makeup_teacher_id,
      time_slot_id,
      note,
    } = body;

    const targetSlotId = makeup_slot_id || time_slot_id;

    // =========================================================================
    // 1. Action: Báo nghỉ (Tích lũy giờ bù vào quỹ & đồng bộ lessons)
    // =========================================================================
    if (action === "report_absence") {
      if (!student_id || !absence_date) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn học sinh và ngày nghỉ!" },
          { status: 400 }
        );
      }

      // Chặn báo nghỉ trùng cùng một ngày nếu đã có lịch pending/scheduled
      const existingCheck = await db.execute({
        sql: "SELECT id FROM makeup_classes WHERE student_id = ? AND absence_date = ? AND status IN ('pending', 'scheduled') LIMIT 1",
        args: [student_id, absence_date],
      });
      if (existingCheck.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: "Buổi học ngày này đã được báo nghỉ trước đó rồi!" },
          { status: 400 }
        );
      }

      // Xác định thời lượng ca nghỉ (mặc định tính từ start - end hoặc getStudentSessionMinutes)
      const sTime = (absence_start_time || body.start_time || "18:00").trim();
      const eTime = (absence_end_time || "19:30").trim();
      let absMin = Number(absence_minutes || body.minutes);

      if (!absMin || isNaN(absMin) || absMin <= 0) {
        const [sh, sm] = sTime.split(":").map(Number);
        const [eh, em] = eTime.split(":").map(Number);
        if (!isNaN(sh) && !isNaN(eh) && (eh * 60 + (em || 0)) > (sh * 60 + (sm || 0))) {
          absMin = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
        } else {
          let dayName: string | undefined;
          try {
            const [y, m, d] = absence_date.split("-").map(Number);
            const dateObj = new Date(y, m - 1, d);
            const dayIdx = dateObj.getDay();
            dayName = dayIdx === 0 ? "Chủ Nhật" : `Thứ ${dayIdx + 1}`;
          } catch {}
          absMin = await getStudentSessionMinutes(student_id, dayName);
        }
      }

      const id = `mk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Đọc thông tin học sinh để lưu trực tiếp tên và SĐT
      const stRes = await db.execute({
        sql: "SELECT name, phone FROM students WHERE id = ?",
        args: [student_id],
      });
      const stName = stRes.rows.length > 0 && stRes.rows[0].name ? String(stRes.rows[0].name) : "";
      const stPhone = stRes.rows.length > 0 && stRes.rows[0].phone ? String(stRes.rows[0].phone) : "";

      // Lưu bản ghi báo nghỉ
      await db.execute({
        sql: `INSERT INTO makeup_classes (
                id, student_id, student_name, student_phone, absence_date, absence_reason, 
                absence_start_time, absence_end_time, absence_minutes, status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        args: [
          id,
          student_id,
          stName,
          stPhone,
          absence_date,
          absence_reason || "Báo nghỉ có phép",
          sTime,
          eTime,
          absMin,
        ],
      });

      // ⭐ ĐỒNG BỘ QUỸ GIỜ: Cộng dồn chính xác số giờ này vào Quỹ giờ học bù (hour_ledger)
      await appendLedger({
        studentId: student_id,
        type: "REFUND",
        minutes: absMin,
        refType: "makeup_absence",
        refId: id,
        note: `Tích lũy giờ nghỉ ngày ${absence_date} (${sTime} - ${eTime}: +${formatMinutes(absMin)})`,
        createdBy: "admin_report_absence",
      });

      // Đồng bộ vào bảng lessons (status = absent_excused)
      const lessonId = `les-${student_id.slice(0, 8)}-${absence_date}-${Date.now().toString(36)}`;
      try {
        await db.execute({
          sql: `INSERT INTO lessons (id, student_id, date, start_time, planned_minutes, kind, status, reason, created_by)
                VALUES (?, ?, ?, ?, ?, 'regular', 'absent_excused', ?, ?)
                ON CONFLICT(student_id, date, start_time) DO UPDATE SET status = 'absent_excused'`,
          args: [
            lessonId,
            student_id,
            absence_date,
            sTime,
            absMin,
            absence_reason || "Báo nghỉ có phép",
            "parent",
          ],
        });
      } catch {}

      const hoursDisplay = (absMin / 60).toFixed(1).replace(".0", "");
      const newWallet = await getWalletBalance(student_id);

      return NextResponse.json({
        success: true,
        message: `Đã ghi nhận báo nghỉ thành công! +${hoursDisplay} giờ (${absMin} phút) đã được cộng vào Quỹ giờ học bù.`,
        id,
        absence_minutes: absMin,
        wallet: newWallet,
      });
    }

    // =========================================================================
    // 2. Action: Đặt lịch học bù (Trừ quỹ giờ học bù & kiểm tra sĩ số)
    // =========================================================================
    if (action === "schedule_makeup") {
      if (!makeup_id || !makeup_date) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn ngày học bù!" },
          { status: 400 }
        );
      }

      // Đọc thông tin buổi bù đang xếp
      const mkRes = await db.execute({
        sql: "SELECT * FROM makeup_classes WHERE id = ?",
        args: [makeup_id],
      });
      if (mkRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: "Không tìm thấy buổi bù này!" }, { status: 404 });
      }
      const mkRecord = mkRes.rows[0];
      const targetStudentId = String(mkRecord.student_id);

      // Xác định thời lượng bù
      let plannedMin = Number(makeup_minutes || body.minutes);
      if (!plannedMin || isNaN(plannedMin) || plannedMin <= 0) {
        plannedMin = Number(mkRecord.absence_minutes) || (await getStudentSessionMinutes(targetStudentId)) || 60;
      }

      // RÀNG BUỘC (VALIDATION): Kiểm tra quỹ giờ học bù khả dụng
      const wallet = await getWalletBalance(targetStudentId);
      if (wallet.available_minutes < plannedMin) {
        return NextResponse.json(
          {
            success: false,
            message: `Quỹ giờ học bù không đủ! Hiện còn ${formatMinutes(wallet.available_minutes)}, cần ${formatMinutes(plannedMin)}.`,
          },
          { status: 400 }
        );
      }

      // Kiểm tra sĩ số phòng học nếu có slot
      if (targetSlotId) {
        const settingsRes = await db.execute("SELECT key, value FROM settings");
        const settingsMap: Record<string, string> = {};
        for (const row of settingsRes.rows) {
          settingsMap[String(row.key)] = String(row.value);
        }
        const defaultMaxCapacity = Number(settingsMap["max_students_per_slot"] || 10);
        const capacityMode = settingsMap["capacity_mode"] || "by_slot";

        const [y, m, d] = makeup_date.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayIdx = dateObj.getDay();
        const dayName = dayIdx === 0 ? "Chủ Nhật" : `Thứ ${dayIdx + 1}`;

        let maxCapacity = defaultMaxCapacity;

        if (capacityMode === "by_teacher") {
          const teachersRes = await db.execute("SELECT * FROM teachers WHERE is_active = 1");
          let teacherCapTotal = 0;
          let matchedTeacherCount = 0;

          for (const tc of teachersRes.rows) {
            let assignedSlots: string[] = [];
            try {
              if (tc.assigned_slot_ids) {
                const parsed = JSON.parse(String(tc.assigned_slot_ids));
                if (Array.isArray(parsed)) assignedSlots = parsed;
              }
            } catch {}

            let shifts: any[] = [];
            try {
              if (tc.working_shifts_json) {
                const parsed = JSON.parse(String(tc.working_shifts_json));
                if (Array.isArray(parsed)) shifts = parsed;
              }
            } catch {}

            const worksOnSlot =
              assignedSlots.includes(targetSlotId) ||
              shifts.some((s: any) => s.day === dayName);

            if (worksOnSlot) {
              matchedTeacherCount++;
              teacherCapTotal += Number(tc.max_students || defaultMaxCapacity);
            }
          }

          if (matchedTeacherCount > 0) {
            maxCapacity = teacherCapTotal;
          }
        } else {
          const slotCheck = await db.execute({
            sql: "SELECT max_students FROM time_slots WHERE id = ?",
            args: [targetSlotId],
          });
          if (slotCheck.rows.length > 0) {
            maxCapacity = Number(slotCheck.rows[0].max_students || defaultMaxCapacity);
          }
        }

        const regularStudentsRes = await db.execute({
          sql: "SELECT id, registered_days FROM students WHERE time_slot_id = ?",
          args: [targetSlotId],
        });
        let regularCount = 0;
        for (const st of regularStudentsRes.rows) {
          if (String(st.registered_days || "").includes(dayName)) {
            regularCount++;
          }
        }

        const currentMakeups = await db.execute({
          sql: "SELECT COUNT(*) as count FROM makeup_classes WHERE makeup_date = ? AND (makeup_slot_id = ? OR makeup_slot_id IS NULL) AND id != ? AND status IN ('scheduled', 'completed')",
          args: [makeup_date, targetSlotId, makeup_id],
        });
        const makeupBooked = Number(currentMakeups.rows[0].count || 0);

        const totalOccupied = regularCount + makeupBooked;
        if (totalOccupied >= maxCapacity) {
          return NextResponse.json(
            { success: false, message: `Khung giờ này trong ngày đã đủ sĩ số (${totalOccupied}/${maxCapacity} học sinh - HẾT SUẤT). Vui lòng chọn ca hoặc ngày khác!` },
            { status: 400 }
          );
        }
      }

      // Chuẩn bị thông tin giờ bắt đầu - kết thúc ca bù
      const sStart = (makeup_start_time || (makeup_time ? makeup_time.split("-")[0]?.trim() : "18:00") || "18:00").trim();
      let sEnd = makeup_end_time ? makeup_end_time.trim() : "";
      if (!sEnd) {
        const [sh, sm] = sStart.split(":").map(Number);
        const totalEndM = sh * 60 + (sm || 0) + plannedMin;
        const eh = Math.floor(totalEndM / 60);
        const em = totalEndM % 60;
        sEnd = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
      }
      const makeupTimeLabel = `${sStart} - ${sEnd}`;

      // Tạo/Cập nhật bản ghi trong bảng lessons (để đồng bộ hệ thống lịch học & sĩ số)
      const lessonId = `ls-mk-${targetStudentId.slice(0, 8)}-${makeup_date}-${sStart.replace(":", "")}`;
      await db.execute({
        sql: `INSERT INTO lessons (id, student_id, date, start_time, planned_minutes, slot_id, kind, status, reason, created_by)
              VALUES (?, ?, ?, ?, ?, ?, 'makeup', 'scheduled', ?, 'admin_schedule_makeup')
              ON CONFLICT(student_id, date, start_time) DO UPDATE SET
                planned_minutes = excluded.planned_minutes,
                slot_id = excluded.slot_id,
                kind = 'makeup',
                status = 'scheduled',
                reason = excluded.reason`,
        args: [
          lessonId,
          targetStudentId,
          makeup_date,
          sStart,
          plannedMin,
          targetSlotId || null,
          note || `Bù cho buổi nghỉ ${mkRecord.absence_date}`,
        ],
      });

      // Cập nhật bản ghi makeup_classes
      await db.execute({
        sql: `UPDATE makeup_classes 
              SET makeup_date = ?, makeup_time = ?, makeup_start_time = ?, makeup_end_time = ?,
                  makeup_minutes = ?, makeup_slot_id = ?, makeup_teacher_id = ?, lesson_id = ?,
                  note = ?, status = 'scheduled'
              WHERE id = ?`,
        args: [
          makeup_date,
          makeupTimeLabel,
          sStart,
          sEnd,
          plannedMin,
          targetSlotId || null,
          makeup_teacher_id || null,
          lessonId,
          note || "",
          makeup_id,
        ],
      });

      const hoursDisplay = (plannedMin / 60).toFixed(1).replace(".0", "");
      const remainingAvail = wallet.available_minutes - plannedMin;
      const remHours = (remainingAvail / 60).toFixed(1).replace(".0", "");

      return NextResponse.json({
        success: true,
        message: `Đã xếp lịch bù thành công ${hoursDisplay} giờ (${plannedMin} phút). Quỹ giờ còn lại: ${remHours} giờ (${remainingAvail} phút).`,
        remaining_minutes: remainingAvail,
      });
    }

    // =========================================================================
    // 3. Action: Xác nhận đã học bù xong (Chính thức trừ vào Sổ cái hour_ledger)
    // =========================================================================
    if (action === "complete") {
      if (!makeup_id) {
        return NextResponse.json({ success: false, message: "Thiếu ID buổi bù!" }, { status: 400 });
      }

      const mkRes = await db.execute({
        sql: "SELECT * FROM makeup_classes WHERE id = ?",
        args: [makeup_id],
      });
      if (mkRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: "Không tìm thấy buổi bù!" }, { status: 404 });
      }
      const mk = mkRes.rows[0];
      const sid = String(mk.student_id);
      const usedMin = Number(mk.makeup_minutes) || Number(mk.absence_minutes) || (await getStudentSessionMinutes(sid)) || 60;

      // Cập nhật trạng thái completed
      await db.execute({
        sql: "UPDATE makeup_classes SET status = 'completed' WHERE id = ?",
        args: [makeup_id],
      });

      // Cập nhật lesson tương ứng nếu có
      if (mk.lesson_id) {
        await db.execute({
          sql: "UPDATE lessons SET status = 'attended', actual_minutes = ? WHERE id = ?",
          args: [usedMin, String(mk.lesson_id)],
        });
      }

      // ⭐ GHI SỔ CÁI: Khấu trừ chính thức số giờ đã hoàn thành
      await appendLedger({
        studentId: sid,
        type: "CONSUME",
        minutes: -usedMin,
        refType: "makeup_completed",
        refId: makeup_id,
        note: `Hoàn thành học bù ngày ${mk.makeup_date} (${mk.makeup_time}: -${formatMinutes(usedMin)})`,
        createdBy: "admin_complete_makeup",
      });

      return NextResponse.json({
        success: true,
        message: `Đã xác nhận hoàn thành buổi bù và khấu trừ -${formatMinutes(usedMin)} khỏi quỹ giờ!`,
      });
    }

    // =========================================================================
    // 4. Action: Hủy lịch xếp bù quay về chờ xếp lại (reset to pending)
    // =========================================================================
    if (action === "reset_pending") {
      if (!makeup_id) {
        return NextResponse.json({ success: false, message: "Thiếu ID buổi bù!" }, { status: 400 });
      }

      const mkRes = await db.execute({
        sql: "SELECT * FROM makeup_classes WHERE id = ?",
        args: [makeup_id],
      });
      if (mkRes.rows.length > 0) {
        const mk = mkRes.rows[0];
        if (mk.lesson_id) {
          await db.execute({
            sql: "DELETE FROM lessons WHERE id = ?",
            args: [String(mk.lesson_id)],
          });
        }
      }

      await db.execute({
        sql: `UPDATE makeup_classes 
              SET makeup_date = NULL, makeup_time = NULL, makeup_start_time = NULL, 
                  makeup_end_time = NULL, makeup_slot_id = NULL, lesson_id = NULL, status = 'pending' 
              WHERE id = ?`,
        args: [makeup_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã hủy lịch xếp bù và hoàn trả số giờ về quỹ chờ xếp lại!",
      });
    }

    // =========================================================================
    // 5. Action: Xóa bản ghi báo nghỉ / học bù
    // =========================================================================
    if (action === "delete") {
      if (!makeup_id) {
        return NextResponse.json({ success: false, message: "Thiếu ID buổi bù!" }, { status: 400 });
      }

      const mkRes = await db.execute({
        sql: "SELECT * FROM makeup_classes WHERE id = ?",
        args: [makeup_id],
      });
      if (mkRes.rows.length > 0) {
        const mk = mkRes.rows[0];
        if (mk.lesson_id) {
          await db.execute({ sql: "DELETE FROM lessons WHERE id = ?", args: [String(mk.lesson_id)] });
        }
        await db.execute({
          sql: "DELETE FROM hour_ledger WHERE (ref_type IN ('makeup_absence', 'absence') AND ref_id = ?) OR (ref_type IN ('makeup_completed', 'makeup') AND ref_id = ?)",
          args: [makeup_id, makeup_id],
        });
      }

      await db.execute({
        sql: "DELETE FROM makeup_classes WHERE id = ?",
        args: [makeup_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã xóa bản ghi báo nghỉ / học bù!",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Makeups POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
