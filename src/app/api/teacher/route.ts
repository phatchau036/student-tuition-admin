import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// API phục vụ Trang Giáo viên: Xem ca dạy, học sinh, phát hiện học sinh học bù và nâng level
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacher_id");

    if (!teacherId) {
      // Return list of teachers for selection/login
      const teachers = await db.execute(`
        SELECT t.*, s.name as school_name, s.code as school_code, COUNT(st.id) as student_count
        FROM teachers t
        LEFT JOIN schools s ON t.school_id = s.id
        LEFT JOIN students st ON st.teacher_id = t.id
        WHERE t.is_active = 1
        GROUP BY t.id
        ORDER BY t.name ASC
      `);
      return NextResponse.json({ success: true, data: { teachers: teachers.rows } });
    }

    // Get Teacher Details
    const teacherRes = await db.execute({
      sql: `
        SELECT t.*, s.name as school_name, s.code as school_code
        FROM teachers t
        LEFT JOIN schools s ON t.school_id = s.id
        WHERE t.id = ?
      `,
      args: [teacherId],
    });

    if (teacherRes.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Không tìm thấy giáo viên!" }, { status: 404 });
    }

    const teacher = teacherRes.rows[0];

    // 1. Get Regular Students of this teacher
    const regularStudentsRes = await db.execute({
      sql: `
        SELECT st.*, l.level_name, l.surcharge_amount as level_surcharge
        FROM students st
        LEFT JOIN level_surcharges l ON st.level_id = l.id
        WHERE st.teacher_id = ?
        ORDER BY st.name ASC
      `,
      args: [teacherId],
    });

    // 2. Get MakeUp Students attending classes (Today or Upcoming)
    // Check if there are students who scheduled makeup with this teacher or in slots
    const makeupsRes = await db.execute({
      sql: `
        SELECT m.*, st.name as student_name, st.phone as student_phone, st.level_id, l.level_name
        FROM makeup_classes m
        JOIN students st ON m.student_id = st.id
        LEFT JOIN level_surcharges l ON st.level_id = l.id
        WHERE m.status IN ('scheduled', 'completed')
        ORDER BY m.makeup_date DESC
      `,
    });

    // 3. Get all Levels for Level upgrade dropdown
    const levelsRes = await db.execute("SELECT * FROM level_surcharges ORDER BY sort_order ASC");

    // 4. Get all Time Slots for displaying teacher's assigned slots
    const slotsRes = await db.execute("SELECT * FROM time_slots ORDER BY id ASC");

    return NextResponse.json({
      success: true,
      data: {
        teacher,
        students: regularStudentsRes.rows,
        makeups: makeupsRes.rows,
        levels: levelsRes.rows,
        time_slots: slotsRes.rows,
      },
    });
  } catch (error: unknown) {
    console.error("Teacher API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Update student level directly from teacher portal or login by phone
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, student_id, new_level_id, phone } = body;

    // 1. Giáo viên đăng nhập bằng Số Điện Thoại
    if (action === "login_by_phone") {
      if (!phone || !phone.trim()) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập số điện thoại của giáo viên!" },
          { status: 400 }
        );
      }

      const cleanPhone = phone.trim().replace(/\D/g, "");

      const teacherRes = await db.execute({
        sql: `
          SELECT t.*, s.name as school_name, s.code as school_code, s.address as school_address, s.phone as school_phone
          FROM teachers t
          LEFT JOIN schools s ON t.school_id = s.id
          WHERE replace(replace(replace(t.phone, ' ', ''), '.', ''), '-', '') LIKE ? AND t.is_active = 1
        `,
        args: [`%${cleanPhone}%`],
      });

      if (teacherRes.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Không tìm thấy giáo viên nào với số điện thoại này! Vui lòng liên hệ quản trị viên cơ sở.",
          },
          { status: 404 }
        );
      }

      const teacher = teacherRes.rows[0];
      return NextResponse.json({
        success: true,
        message: `Đăng nhập thành công! Chào mừng thầy/cô ${teacher.name}.`,
        teacher: {
          id: String(teacher.id),
          name: String(teacher.name),
          phone: String(teacher.phone),
          specialty: String(teacher.specialty || ""),
          color: String(teacher.color || "indigo"),
          school_id: String(teacher.school_id || ""),
          school_name: String(teacher.school_name || ""),
          school_code: String(teacher.school_code || ""),
        },
      });
    }

    if (action === "update_level") {
      if (!student_id || !new_level_id) {
        return NextResponse.json(
          { success: false, message: "Thiếu thông tin học sinh hoặc level mới!" },
          { status: 400 }
        );
      }

      await db.execute({
        sql: "UPDATE students SET level_id = ? WHERE id = ?",
        args: [new_level_id, student_id],
      });

      // Get level name
      const lvlRes = await db.execute({
        sql: "SELECT level_name FROM level_surcharges WHERE id = ?",
        args: [new_level_id],
      });
      const levelName = lvlRes.rows.length > 0 ? lvlRes.rows[0].level_name : "mới";

      return NextResponse.json({
        success: true,
        message: `Đã nâng trình độ học sinh lên: ${levelName}!`,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Teacher POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
