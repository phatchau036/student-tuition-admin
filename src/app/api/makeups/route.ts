import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "";
    const studentId = searchParams.get("student_id");

    let query = `
      SELECT m.*, 
             s.name as student_name, 
             s.phone as student_phone, 
             s.school_id as student_school_id,
             s.registered_days, 
             s.study_time_detail,
             COALESCE(tc.name, 'Chưa phân công') as teacher_name
      FROM makeup_classes m
      LEFT JOIN students s ON m.student_id = s.id
      LEFT JOIN teachers tc ON s.teacher_id = tc.id
      WHERE 1=1
    `;
    const args: any[] = [];

    // Nếu có schoolId và khác "all", lọc các bản ghi thuộc schoolId hoặc student chưa gán school_id (fallback trường mặc định)
    if (schoolId && schoolId !== "all") {
      query += ` AND (s.school_id = ? OR s.school_id IS NULL OR s.school_id = '' OR s.school_id = 'school-default')`;
      args.push(schoolId);
    }

    if (studentId) {
      query += " AND m.student_id = ?";
      args.push(studentId);
    }

    query += " ORDER BY m.absence_date DESC, m.created_at DESC";

    const res = await db.execute({ sql: query, args });
    const makeups = res.rows.map((row) => ({
      id: String(row.id),
      student_id: String(row.student_id),
      student_name: String(row.student_name || "Học viên"),
      student_phone: String(row.student_phone || ""),
      teacher_name: row.teacher_name ? String(row.teacher_name) : "Chưa phân công",
      absence_date: String(row.absence_date || ""),
      absence_reason: String(row.absence_reason || ""),
      status: String(row.status || "pending"),
      makeup_date: row.makeup_date ? String(row.makeup_date) : undefined,
      makeup_time: row.makeup_time ? String(row.makeup_time) : undefined,
      makeup_slot_id: row.makeup_slot_id ? String(row.makeup_slot_id) : undefined,
      note: row.note ? String(row.note) : undefined,
      created_at: String(row.created_at || ""),
    }));

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
      makeup_id,
      makeup_date,
      makeup_time,
      makeup_slot_id,
      time_slot_id,
      note,
    } = body;

    const targetSlotId = makeup_slot_id || time_slot_id;

    // 1. Action: Báo nghỉ (Tạo buổi cần bù mới)
    if (action === "report_absence") {
      if (!student_id || !absence_date) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn học sinh và ngày nghỉ!" },
          { status: 400 }
        );
      }

      const id = `mk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO makeup_classes (id, student_id, absence_date, absence_reason, status)
              VALUES (?, ?, ?, ?, 'pending')`,
        args: [id, student_id, absence_date, absence_reason || "Báo nghỉ có phép"],
      });

      return NextResponse.json({
        success: true,
        message: "Đã ghi nhận báo nghỉ và cộng +1 buổi học bù cho học sinh!",
        id,
      });
    }

    // 2. Action: Đặt lịch học bù (Schedule makeup)
    if (action === "schedule_makeup") {
      if (!makeup_id || !makeup_date) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn ngày học bù!" },
          { status: 400 }
        );
      }

      // Check slot capacity if slot is provided (Enforce strictly based on capacity mode)
      if (targetSlotId) {
        // Get settings
        const settingsRes = await db.execute("SELECT key, value FROM settings");
        const settingsMap: Record<string, string> = {};
        for (const row of settingsRes.rows) {
          settingsMap[String(row.key)] = String(row.value);
        }
        const defaultMaxCapacity = Number(settingsMap["max_students_per_slot"] || 10);
        const capacityMode = settingsMap["capacity_mode"] || "by_slot";

        // Determine day name
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

        // Count regular students on this slot & day
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

        // Count current booked makeups
        const currentMakeups = await db.execute({
          sql: "SELECT COUNT(*) as count FROM makeup_classes WHERE makeup_date = ? AND (makeup_slot_id = ? OR makeup_slot_id IS NULL) AND id != ? AND status IN ('scheduled', 'completed')",
          args: [makeup_date, targetSlotId, makeup_id],
        });
        const makeupBooked = Number(currentMakeups.rows[0].count || 0);

        const totalOccupied = regularCount + makeupBooked;
        if (totalOccupied >= maxCapacity) {
          return NextResponse.json(
            { success: false, message: `Khung giờ này trong ngày đã đủ sĩ số tối đa (${totalOccupied}/${maxCapacity} học sinh - HẾT SUẤT). Vui lòng chọn khung giờ hoặc ngày khác!` },
            { status: 400 }
          );
        }
      }

      await db.execute({
        sql: `UPDATE makeup_classes 
              SET makeup_date = ?, makeup_time = ?, makeup_slot_id = ?, note = ?, status = 'scheduled'
              WHERE id = ?`,
        args: [makeup_date, makeup_time || "", targetSlotId || null, note || "", makeup_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã xếp lịch học bù thành công!",
      });
    }

    // 3. Action: Xác nhận đã học bù xong
    if (action === "complete") {
      if (!makeup_id) {
        return NextResponse.json({ success: false, message: "Thiếu ID buổi bù!" }, { status: 400 });
      }

      await db.execute({
        sql: "UPDATE makeup_classes SET status = 'completed' WHERE id = ?",
        args: [makeup_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã xác nhận hoàn thành buổi học bù!",
      });
    }

    // 4. Action: Hủy lịch xếp bù quay về nợ bù (reset to pending)
    if (action === "reset_pending") {
      if (!makeup_id) {
        return NextResponse.json({ success: false, message: "Thiếu ID buổi bù!" }, { status: 400 });
      }

      await db.execute({
        sql: "UPDATE makeup_classes SET makeup_date = NULL, makeup_time = NULL, makeup_slot_id = NULL, status = 'pending' WHERE id = ?",
        args: [makeup_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã hủy lịch xếp bù và đưa về trạng thái chờ xếp lại!",
      });
    }

    // 5. Action: Xóa báo nghỉ / học bù
    if (action === "delete") {
      if (!makeup_id) {
        return NextResponse.json({ success: false, message: "Thiếu ID buổi bù!" }, { status: 400 });
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
