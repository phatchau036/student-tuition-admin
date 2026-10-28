import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";
import { StudentStatus } from "@/lib/types";

// POST /api/students/bulk-action - Thao tác hàng loạt trên nhiều học sinh (Xóa, Bảo lưu, Nghỉ học, Học tiếp)
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const schoolId = getSchoolIdFromRequest(req);
    const body = await req.json();

    const {
      action, // 'delete' | 'reserve' | 'drop' | 'resume'
      student_ids, // string[]
      effective_date, // YYYY-MM-DD
      return_date, // YYYY-MM-DD (dành cho bảo lưu)
      reason, // Lý do
    } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn ít nhất 1 học sinh để thực hiện!" },
        { status: 400 }
      );
    }

    const count = student_ids.length;

    // 1. THAO TÁC XÓA HÀNG LOẠT
    if (action === "delete") {
      for (const id of student_ids) {
        // Xóa các bảng phụ thuộc
        await db.execute({ sql: "DELETE FROM student_monthly_tuitions WHERE student_id = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM makeup_classes WHERE student_id = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM student_payments WHERE student_id = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM student_status_logs WHERE student_id = ?", args: [id] });
        await db.execute({ sql: "DELETE FROM students WHERE id = ?", args: [id] });
      }

      return NextResponse.json({
        success: true,
        message: `Đã xóa thành công ${count} học sinh khỏi hệ thống!`,
        count,
      });
    }

    // 2. THAO TÁC ĐỔI TRẠNG THÁI HÀNG LOẠT (Bảo lưu / Nghỉ học / Học tiếp)
    if (action === "reserve" || action === "drop" || action === "resume") {
      let toStatus: StudentStatus = "studying";
      if (action === "reserve") toStatus = "reserved";
      else if (action === "drop") toStatus = "dropped";
      else if (action === "resume") toStatus = "studying";

      const effDate = effective_date || new Date().toISOString().slice(0, 10);
      const retDate = action === "reserve" ? (return_date || null) : null;
      const month = effDate.slice(0, 7);
      const nowTimestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

      for (const id of student_ids) {
        // Lấy status hiện tại
        const stRes = await db.execute({
          sql: "SELECT status FROM students WHERE id = ?",
          args: [id],
        });
        const fromStatus = stRes.rows.length > 0 ? (String(stRes.rows[0].status || "studying") as StudentStatus) : "studying";

        // Cập nhật học sinh
        await db.execute({
          sql: `UPDATE students 
                SET status = ?, 
                    status_date = ?, 
                    expected_return_date = ?, 
                    status_note = ?
                WHERE id = ?`,
          args: [toStatus, effDate, retDate, reason || "", id],
        });

        // Ghi log biến động
        const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.execute({
          sql: `INSERT INTO student_status_logs 
                (id, student_id, action_type, from_status, to_status, effective_date, return_date, reason, logged_at, month)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [logId, id, action, fromStatus, toStatus, effDate, retDate, reason || "", nowTimestamp, month],
        });
      }

      let label = "học tiếp";
      if (action === "reserve") label = "bảo lưu";
      else if (action === "drop") label = "nghỉ học";

      return NextResponse.json({
        success: true,
        message: `Đã chuyển ${count} học sinh sang trạng thái ${label.toUpperCase()} thành công!`,
        count,
        to_status: toStatus,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Bulk Action API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
