import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

// GET /api/status-logs - Lấy lịch sử log tổng bảo lưu, nghỉ học và trở lại học
export async function GET(req: Request) {
  let month = "";
  let student_id = "";
  let querySchoolId = "";
  try {
    const url = new URL(req.url);
    month = url.searchParams.get("month") || "";
    student_id = url.searchParams.get("student_id") || "";
    querySchoolId = url.searchParams.get("school_id") || "";
  } catch {}

  try {
    await initDb();
    const db = getDb();
    const schoolId = querySchoolId || getSchoolIdFromRequest(req) || "school-default";

    // 1. Tự động đồng bộ: Nếu học sinh có status = 'reserved' hoặc 'dropped' mà chưa có log trong student_status_logs
    const unloggedStudentsRes = await db.execute({
      sql: `
        SELECT s.id, s.name, s.status, s.status_date, s.expected_return_date, s.status_note
        FROM students s
        WHERE s.school_id = ? AND s.status IN ('reserved', 'dropped')
        AND s.id NOT IN (SELECT DISTINCT student_id FROM student_status_logs)
      `,
      args: [schoolId],
    });

    for (const st of unloggedStudentsRes.rows) {
      const actType = st.status === "reserved" ? "reserve" : "drop";
      const effDate = st.status_date ? String(st.status_date) : new Date().toISOString().slice(0, 10);
      const logMonth = effDate.slice(0, 7);
      const logId = `log-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO student_status_logs (id, student_id, action_type, from_status, to_status, effective_date, return_date, reason, logged_at, month)
              VALUES (?, ?, ?, 'studying', ?, ?, ?, ?, datetime('now', 'localtime'), ?)`,
        args: [
          logId,
          st.id,
          actType,
          st.status,
          effDate,
          st.expected_return_date || null,
          st.status_note || "Đồng bộ từ hồ sơ học viên",
          logMonth,
        ],
      });
    }

    // 2. Lấy danh sách log biến động
    let sql = `
      SELECT l.*, s.name as student_name, s.phone as student_phone, s.school_id, s.status as current_status
      FROM student_status_logs l
      JOIN students s ON l.student_id = s.id
      WHERE s.school_id = ?
    `;
    const args: any[] = [schoolId];

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
      current_status: String(row.current_status || "studying"),
      action_type: String(row.action_type) as "reserve" | "drop" | "resume",
      from_status: String(row.from_status),
      to_status: String(row.to_status),
      effective_date: String(row.effective_date),
      return_date: row.return_date ? String(row.return_date) : undefined,
      reason: String(row.reason || ""),
      logged_at: String(row.logged_at || ""),
      month: String(row.month || ""),
    }));

    // 3. Lấy số lượng và danh sách học sinh hiện đang Bảo lưu & Nghỉ học thời gian thực
    const currentStatusRes = await db.execute({
      sql: `
        SELECT id, name, phone, status, status_date, expected_return_date, status_note
        FROM students
        WHERE school_id = ? AND status IN ('reserved', 'dropped')
        ORDER BY status_date DESC
      `,
      args: [schoolId],
    });

    const activeReserved = currentStatusRes.rows
      .filter((r) => r.status === "reserved")
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        phone: String(r.phone),
        status_date: r.status_date ? String(r.status_date) : "",
        expected_return_date: r.expected_return_date ? String(r.expected_return_date) : "",
        status_note: String(r.status_note || ""),
      }));

    const activeDropped = currentStatusRes.rows
      .filter((r) => r.status === "dropped")
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        phone: String(r.phone),
        status_date: r.status_date ? String(r.status_date) : "",
        status_note: String(r.status_note || ""),
      }));

    return NextResponse.json({
      success: true,
      data: logs,
      summary: {
        active_reserved_count: activeReserved.length,
        active_dropped_count: activeDropped.length,
        active_reserved: activeReserved,
        active_dropped: activeDropped,
      },
    });
  } catch (error: unknown) {
    console.error("Status Logs Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
