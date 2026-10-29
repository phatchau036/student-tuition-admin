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
    const schoolId = querySchoolId || headerSchoolId || "school-default";

    // Tìm giáo viên thuộc cơ sở này, hoặc giáo viên thuộc school-default (fallback an toàn để không bao giờ bị mất giáo viên)
    let teachersRes = await db.execute({
      sql: `
        SELECT t.*, COUNT(s.id) as student_count
        FROM teachers t
        LEFT JOIN students s ON s.teacher_id = t.id
        WHERE t.school_id = ? OR t.school_id = 'school-default' OR ? = 'school-default'
        GROUP BY t.id
        ORDER BY t.created_at ASC
      `,
      args: [schoolId, schoolId],
    });

    // Nếu không tìm thấy và schoolId cụ thể khác school-default, query mở rộng
    if (teachersRes.rows.length === 0) {
      teachersRes = await db.execute(`
        SELECT t.*, COUNT(s.id) as student_count
        FROM teachers t
        LEFT JOIN students s ON s.teacher_id = t.id
        GROUP BY t.id
        ORDER BY t.created_at ASC
      `);
    }

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
        is_active: Number(row.is_active ?? 1),
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
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);

    const { name, phone, email, specialty, color, max_students, assigned_slot_ids, working_shifts_json, school_id } = body;
    const targetSchoolId = school_id || querySchoolId || headerSchoolId || "school-default";

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập họ tên và số điện thoại giáo viên!" },
        { status: 400 }
      );
    }

    const id = `tc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const slotJson = JSON.stringify(Array.isArray(assigned_slot_ids) ? assigned_slot_ids : []);
    const shiftJson = typeof working_shifts_json === "string" ? working_shifts_json : JSON.stringify(working_shifts_json || []);

    try {
      await db.execute({
        sql: `INSERT INTO teachers (id, school_id, name, phone, email, specialty, color, max_students, assigned_slot_ids, working_shifts_json, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          id,
          targetSchoolId,
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
    } catch (insertErr) {
      console.warn("Retrying insert with base columns due to schema difference:", insertErr);
      // Fallback an toàn nếu schema cũ chưa kịp migrate cột mới
      await db.execute({
        sql: `INSERT INTO teachers (id, school_id, name, phone, email, specialty, color, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          id,
          targetSchoolId,
          name.trim(),
          phone.trim(),
          email?.trim() || "",
          specialty?.trim() || "",
          color || "indigo",
        ],
      });
    }

    return NextResponse.json({
      success: true,
      message: "Thêm giáo viên mới thành công!",
      teacher_id: id,
    });
  } catch (error: unknown) {
    console.error("Teacher POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi lưu dữ liệu giáo viên vào database" },
      { status: 500 }
    );
  }
}
