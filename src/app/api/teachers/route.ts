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

    const teachers = teachersRes.rows.map((row) => {
      let assignedSlotIds: string[] = [];
      try {
        if (row.assigned_slot_ids) {
          const parsed = JSON.parse(String(row.assigned_slot_ids));
          if (Array.isArray(parsed)) assignedSlotIds = parsed;
        }
      } catch {}

      return {
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone),
        email: row.email ? String(row.email) : "",
        color: String(row.color || "indigo"),
        specialty: row.specialty ? String(row.specialty) : "",
        max_students: Number(row.max_students || 10),
        assigned_slot_ids: assignedSlotIds,
        working_shifts_json: row.working_shifts_json ? String(row.working_shifts_json) : "[]",
        is_active: Number(row.is_active || 1),
        student_count: Number(row.student_count || 0),
        created_at: String(row.created_at || ""),
      };
    });

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

    const { name, phone, email, specialty, color, max_students, assigned_slot_ids, working_shifts_json } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên và số điện thoại giáo viên!" },
        { status: 400 }
      );
    }

    const id = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const slotJson = JSON.stringify(Array.isArray(assigned_slot_ids) ? assigned_slot_ids : []);
    const shiftJson = typeof working_shifts_json === "string" ? working_shifts_json : JSON.stringify(working_shifts_json || []);

    await db.execute({
      sql: `INSERT INTO teachers (id, name, phone, email, specialty, color, max_students, assigned_slot_ids, working_shifts_json, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        id,
        name.trim(),
        phone.trim(),
        email?.trim() || "",
        specialty?.trim() || "",
        color || "indigo",
        Number(max_students) || 10,
        slotJson,
        shiftJson,
      ],
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
