import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    const teachersRes = await db.execute(`
      SELECT t.*, COUNT(s.id) as student_count
      FROM teachers t
      LEFT JOIN students s ON s.teacher_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at ASC
    `);

    const teachers = teachersRes.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      phone: String(row.phone),
      email: row.email ? String(row.email) : "",
      color: String(row.color || "indigo"),
      specialty: row.specialty ? String(row.specialty) : "",
      is_active: Number(row.is_active || 1),
      student_count: Number(row.student_count || 0),
      created_at: String(row.created_at || ""),
    }));

    return NextResponse.json({ success: true, data: teachers });
  } catch (error: unknown) {
    console.error("Teachers GET Error:", error);
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

    const { name, phone, email, specialty, color } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên và số điện thoại giáo viên!" },
        { status: 400 }
      );
    }

    const id = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO teachers (id, name, phone, email, specialty, color, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)`,
      args: [id, name.trim(), phone.trim(), email?.trim() || "", specialty?.trim() || "", color || "indigo"],
    });

    return NextResponse.json({
      success: true,
      message: "Thêm giáo viên mới thành công!",
      teacher_id: id,
    });
  } catch (error: unknown) {
    console.error("Teacher POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
