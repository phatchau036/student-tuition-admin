import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

// GET /api/admin/teacher-leaves - Lấy danh sách đơn xin nghỉ của giáo viên toàn trường
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "school-default";

    const leavesRes = await db.execute({
      sql: `
        SELECT tl.*, 
               tc.name as teacher_name, tc.phone as teacher_phone, tc.color as teacher_color,
               sub.name as substitute_teacher_name, sub.phone as substitute_teacher_phone,
               c.name as class_name
        FROM teacher_leaves tl
        JOIN teachers tc ON tl.teacher_id = tc.id
        LEFT JOIN teachers sub ON tl.substitute_teacher_id = sub.id
        LEFT JOIN classes c ON tl.class_id = c.id
        WHERE tl.school_id = ? OR tl.school_id = 'school-default' OR ? = 'school-default'
        ORDER BY tl.leave_date DESC, tl.created_at DESC
      `,
      args: [schoolId, schoolId],
    });

    const leaves = leavesRes.rows.map((row) => ({
      id: String(row.id),
      school_id: String(row.school_id),
      teacher_id: String(row.teacher_id),
      teacher_name: String(row.teacher_name || "Giáo viên"),
      teacher_phone: String(row.teacher_phone || ""),
      teacher_color: String(row.teacher_color || "indigo"),
      leave_date: String(row.leave_date),
      shift_desc: String(row.shift_desc || "Cả ngày"),
      start_time: row.start_time ? String(row.start_time) : undefined,
      end_time: row.end_time ? String(row.end_time) : undefined,
      class_id: row.class_id ? String(row.class_id) : undefined,
      class_name: row.class_name ? String(row.class_name) : undefined,
      reason: String(row.reason || ""),
      substitute_teacher_id: row.substitute_teacher_id ? String(row.substitute_teacher_id) : undefined,
      substitute_teacher_name: row.substitute_teacher_name ? String(row.substitute_teacher_name) : undefined,
      status: String(row.status || "pending") as "pending" | "approved" | "rejected",
      admin_note: String(row.admin_note || ""),
      created_at: String(row.created_at || ""),
    }));

    const pendingCount = leaves.filter((l) => l.status === "pending").length;

    return NextResponse.json({
      success: true,
      data: {
        leaves,
        pending_count: pendingCount,
      },
    });
  } catch (error: unknown) {
    console.error("Admin Teacher Leaves GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/teacher-leaves - Phê duyệt hoặc Từ chối đơn xin nghỉ
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, leave_id, substitute_teacher_id, admin_note } = body;

    if (!leave_id) {
      return NextResponse.json({ success: false, message: "Thiếu mã đơn xin nghỉ!" }, { status: 400 });
    }

    // 1. Phê duyệt đơn xin nghỉ
    if (action === "approve") {
      await db.execute({
        sql: `
          UPDATE teacher_leaves 
          SET status = 'approved', 
              substitute_teacher_id = ?, 
              admin_note = ?, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [substitute_teacher_id || null, admin_note ? String(admin_note).trim() : "Đã duyệt nghỉ", leave_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã phê duyệt đơn xin nghỉ thành công!",
      });
    }

    // 2. Từ chối đơn xin nghỉ
    if (action === "reject") {
      await db.execute({
        sql: `
          UPDATE teacher_leaves 
          SET status = 'rejected', 
              admin_note = ?, 
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [admin_note ? String(admin_note).trim() : "Quản lý từ chối yêu cầu nghỉ", leave_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã từ chối đơn xin nghỉ!",
      });
    }

    // 3. Xóa đơn xin nghỉ
    if (action === "delete") {
      await db.execute({
        sql: "DELETE FROM teacher_leaves WHERE id = ?",
        args: [leave_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã xóa đơn xin nghỉ!",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Admin Teacher Leaves POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
