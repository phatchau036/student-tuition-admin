import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// GET /api/status-logs - Lấy lịch sử log tổng bảo lưu, nghỉ học và trở lại học
export async function GET(req: Request) {
  try {
    let month = "";
    let student_id = "";
    try {
      const { searchParams } = new URL(req.url);
      month = searchParams.get("month") || "";
      student_id = searchParams.get("student_id") || "";
    } catch {}

    await initDb();
    const db = getDb();

    let sql = `
      SELECT l.*, s.name as student_name, s.phone as student_phone, s.school_id 
      FROM student_status_logs l
      JOIN students s ON l.student_id = s.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (student_id) {
      sql += " AND l.student_id = ?";
      args.push(student_id);
    }

    if (month) {
      sql += " AND l.month = ?";
      args.push(month);
    }

    sql += " ORDER BY l.logged_at DESC";

    const res = await db.execute({ sql, args });

    const logs = res.rows.map((row) => ({
      id: String(row.id),
      student_id: String(row.student_id),
      student_name: String(row.student_name || ""),
      student_phone: String(row.student_phone || ""),
      action_type: String(row.action_type) as "reserve" | "drop" | "resume",
      from_status: String(row.from_status),
      to_status: String(row.to_status),
      effective_date: String(row.effective_date),
      return_date: row.return_date ? String(row.return_date) : undefined,
      reason: String(row.reason || ""),
      logged_at: String(row.logged_at || ""),
      month: String(row.month || ""),
    }));

    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error: unknown) {
    console.error("Status Logs Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
