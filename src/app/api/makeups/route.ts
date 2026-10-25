import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("student_id");

    let query = `
      SELECT m.*, s.name as student_name, s.phone as student_phone, s.registered_days, s.study_time_detail,
             tc.name as teacher_name
      FROM makeup_classes m
      JOIN students s ON m.student_id = s.id
      LEFT JOIN teachers tc ON s.teacher_id = tc.id
    `;
    const args: any[] = [];

    if (studentId) {
      query += " WHERE m.student_id = ?";
      args.push(studentId);
    }

    query += " ORDER BY m.absence_date DESC, m.created_at DESC";

    const res = await db.execute({ sql: query, args });
    const makeups = res.rows.map((row) => ({
      id: String(row.id),
      student_id: String(row.student_id),
      student_name: String(row.student_name || ""),
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

    const { action, student_id, absence_date, absence_reason, makeup_id, makeup_date, makeup_time, makeup_slot_id, note } = body;

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

      // Check slot capacity if slot is provided
      if (makeup_slot_id) {
        const slotCheck = await db.execute({
          sql: "SELECT max_students FROM time_slots WHERE id = ?",
          args: [makeup_slot_id],
        });
        const maxCapacity = slotCheck.rows.length > 0 ? Number(slotCheck.rows[0].max_students || 10) : 10;

        // Count current booked makeups
        const currentMakeups = await db.execute({
          sql: "SELECT COUNT(*) as count FROM makeup_classes WHERE makeup_date = ? AND makeup_slot_id = ? AND id != ? AND status IN ('scheduled', 'completed')",
          args: [makeup_date, makeup_slot_id, makeup_id],
        });
        const booked = Number(currentMakeups.rows[0].count || 0);

        if (booked >= maxCapacity) {
          return NextResponse.json(
            { success: false, message: "Khung giờ này trong ngày đã đủ sĩ số tối đa (hết suất). Vui lòng chọn khung giờ hoặc ngày khác!" },
            { status: 400 }
          );
        }
      }

      await db.execute({
        sql: `UPDATE makeup_classes 
              SET makeup_date = ?, makeup_time = ?, makeup_slot_id = ?, note = ?, status = 'scheduled'
              WHERE id = ?`,
        args: [makeup_date, makeup_time || "", makeup_slot_id || null, note || "", makeup_id],
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
