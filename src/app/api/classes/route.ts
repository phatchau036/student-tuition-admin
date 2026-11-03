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
    const teacherId = searchParams.get("teacher_id");

    let sql = `
      SELECT 
        c.*,
        sub.name as subject_name,
        sub.color as subject_color,
        tc.name as teacher_name,
        tc.phone as teacher_phone,
        COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN subjects sub ON c.subject_id = sub.id
      LEFT JOIN teachers tc ON c.teacher_id = tc.id
      LEFT JOIN students s ON s.class_id = c.id AND s.status != 'dropped'
      WHERE c.school_id = ? OR c.school_id = 'school-default' OR ? = 'school-default'
    `;
    const args: any[] = [schoolId, schoolId];

    if (teacherId) {
      sql += ` AND c.teacher_id = ?`;
      args.push(teacherId);
    }

    sql += ` GROUP BY c.id ORDER BY c.created_at ASC`;

    const res = await db.execute({ sql, args });

    // Lấy danh sách học sinh tóm tắt của từng lớp
    const classes = [];
    for (const row of res.rows) {
      const classId = String(row.id);
      const studentsRes = await db.execute({
        sql: `SELECT id, name, phone FROM students WHERE class_id = ? AND status != 'dropped'`,
        args: [classId],
      });

      classes.push({
        id: classId,
        school_id: String(row.school_id),
        name: String(row.name),
        code: row.code ? String(row.code) : "",
        subject_id: row.subject_id ? String(row.subject_id) : undefined,
        subject_name: row.subject_name ? String(row.subject_name) : undefined,
        subject_color: row.subject_color ? String(row.subject_color) : undefined,
        teacher_id: row.teacher_id ? String(row.teacher_id) : undefined,
        teacher_name: row.teacher_name ? String(row.teacher_name) : "Chưa phân công",
        teacher_phone: row.teacher_phone ? String(row.teacher_phone) : "",
        max_students: Number(row.max_students || 8),
        room: row.room ? String(row.room) : "",
        schedule_json: row.schedule_json ? String(row.schedule_json) : "[]",
        teacher_assignments_json: row.teacher_assignments_json ? String(row.teacher_assignments_json) : "[]",
        color: row.color ? String(row.color) : "indigo",
        note: row.note ? String(row.note) : "",
        status: (row.status as "active" | "closed") || "active",
        student_count: Number(row.student_count || 0),
        students: studentsRes.rows.map((st) => ({
          id: String(st.id),
          name: String(st.name),
          phone: String(st.phone),
        })),
        created_at: String(row.created_at || ""),
      });
    }

    return NextResponse.json({ success: true, data: classes });
  } catch (error: unknown) {
    console.error("Classes GET Error:", error);
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
    const headerSchoolId = getSchoolIdFromRequest(req);
    const body = await req.json();

    const {
      id,
      name,
      code,
      subject_id,
      teacher_id,
      max_students,
      room,
      schedule_json,
      teacher_assignments_json,
      color,
      note,
      status,
      school_id,
      assigned_student_ids, // Mảng ID học sinh gán vào lớp
    } = body;

    const targetSchoolId = school_id || headerSchoolId || "school-default";

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên lớp học!" },
        { status: 400 }
      );
    }

    const scheduleStr = typeof schedule_json === "string" ? schedule_json : JSON.stringify(schedule_json || []);
    const teacherAssignmentsStr = typeof teacher_assignments_json === "string" ? teacher_assignments_json : JSON.stringify(teacher_assignments_json || []);
    const maxStudentsNum = Number(max_students) || 8;

    // Cập nhật lớp học cũ
    if (id) {
      await db.execute({
        sql: `UPDATE classes 
              SET name = ?, code = ?, subject_id = ?, teacher_id = ?, max_students = ?, 
                  room = ?, schedule_json = ?, teacher_assignments_json = ?, color = ?, note = ?, status = ?
              WHERE id = ?`,
        args: [
          name.trim(),
          code ? code.trim() : "",
          subject_id || null,
          teacher_id || null,
          maxStudentsNum,
          room ? room.trim() : "",
          scheduleStr,
          teacherAssignmentsStr,
          color || "indigo",
          note ? note.trim() : "",
          status || "active",
          id,
        ],
      });

      // Nếu có cập nhật danh sách học sinh gán vào lớp
      if (Array.isArray(assigned_student_ids)) {
        // Gỡ các học sinh cũ không còn trong danh sách
        await db.execute({
          sql: `UPDATE students SET class_id = NULL WHERE class_id = ?`,
          args: [id],
        });
        // Gán các học sinh mới (học sinh vào lớp sẽ do các ca dạy của lớp phụ trách, không ép teacher_id)
        for (const stId of assigned_student_ids) {
          await db.execute({
            sql: `UPDATE students SET class_id = ?, teacher_id = NULL WHERE id = ?`,
            args: [id, stId],
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Cập nhật lớp học thành công!",
        id,
      });
    }

    // Tạo mới lớp học
    const newId = `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const classCode = code && code.trim() ? code.trim() : `L-${Math.floor(100 + Math.random() * 900)}`;

    await db.execute({
      sql: `INSERT INTO classes (
              id, school_id, name, code, subject_id, teacher_id, max_students, 
              room, schedule_json, teacher_assignments_json, color, note, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        newId,
        targetSchoolId,
        name.trim(),
        classCode,
        subject_id || null,
        teacher_id || null,
        maxStudentsNum,
        room ? room.trim() : "",
        scheduleStr,
        teacherAssignmentsStr,
        color || "indigo",
        note ? note.trim() : "",
        status || "active",
      ],
    });

    // Gán học sinh vào lớp mới tạo (học sinh vào lớp sẽ do các ca dạy của lớp phụ trách, không ép teacher_id)
    if (Array.isArray(assigned_student_ids) && assigned_student_ids.length > 0) {
      for (const stId of assigned_student_ids) {
        await db.execute({
          sql: `UPDATE students SET class_id = ?, teacher_id = NULL WHERE id = ?`,
          args: [newId, stId],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Thêm lớp học mới thành công!",
      id: newId,
    });
  } catch (error: unknown) {
    console.error("Classes POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID lớp học cần xóa!" }, { status: 400 });
    }

    // Gỡ class_id khỏi học sinh
    await db.execute({
      sql: `UPDATE students SET class_id = NULL WHERE class_id = ?`,
      args: [id],
    });

    // Xóa lớp
    await db.execute({
      sql: `DELETE FROM classes WHERE id = ?`,
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa lớp học thành công!",
    });
  } catch (error: unknown) {
    console.error("Classes DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
