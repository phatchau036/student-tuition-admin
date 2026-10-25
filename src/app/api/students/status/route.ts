import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { StudentStatus } from "@/lib/types";

// POST /api/students/status - Thay đổi trạng thái học sinh (bảo lưu, nghỉ, học tiếp)
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();

    const {
      student_id,
      action_type, // 'reserve' | 'drop' | 'resume'
      effective_date, // YYYY-MM-DD
      return_date, // YYYY-MM-DD (nếu bảo lưu)
      reason, // Lý do
    } = body;

    if (!student_id || !action_type) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin chuyển trạng thái!" }, { status: 400 });
    }

    // 1. Lấy thông tin học sinh hiện tại
    const stRes = await db.execute({
      sql: "SELECT id, name, status FROM students WHERE id = ?",
      args: [student_id],
    });

    if (stRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Học sinh không tồn tại!" }, { status: 404 });
    }

    const currentStudent = stRes.rows[0];
    const fromStatus: StudentStatus = (String(currentStudent.status || "studying") as StudentStatus);
    let toStatus: StudentStatus = "studying";

    if (action_type === "reserve") toStatus = "reserved";
    else if (action_type === "drop") toStatus = "dropped";
    else if (action_type === "resume") toStatus = "studying";

    const effDate = effective_date || new Date().toISOString().slice(0, 10);
    const month = effDate.slice(0, 7);
    const nowTimestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

    // 2. Cập nhật bảng students
    await db.execute({
      sql: `UPDATE students 
            SET status = ?, 
                status_date = ?, 
                expected_return_date = ?, 
                status_note = ?
            WHERE id = ?`,
      args: [
        toStatus,
        effDate,
        action_type === "reserve" ? return_date || null : null,
        reason || "",
        student_id,
      ],
    });

    // 3. Ghi log vào student_status_logs
    const logId = `log-${Date.now()}`;
    await db.execute({
      sql: `INSERT INTO student_status_logs 
            (id, student_id, action_type, from_status, to_status, effective_date, return_date, reason, logged_at, month)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        logId,
        student_id,
        action_type,
        fromStatus,
        toStatus,
        effDate,
        return_date || null,
        reason || "",
        nowTimestamp,
        month,
      ],
    });

    let msg = "Cập nhật trạng thái thành công!";
    if (action_type === "reserve") msg = `Đã chuyển học sinh ${currentStudent.name} sang trạng thái BẢO LƯU!`;
    else if (action_type === "drop") msg = `Đã chuyển học sinh ${currentStudent.name} sang trạng thái NGHỈ HỌC!`;
    else if (action_type === "resume") msg = `Học sinh ${currentStudent.name} đã TRỞ LẠI HỌC TIẾP!`;

    return NextResponse.json({
      success: true,
      message: msg,
      data: {
        student_id,
        status: toStatus,
        status_date: effDate,
        expected_return_date: return_date || null,
      },
    });
  } catch (error: unknown) {
    console.error("Student Status Update Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
