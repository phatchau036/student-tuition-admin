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

    // 1. Get Regular Students of this teacher (kèm thông tin Lớp học và Quỹ Giờ Học Bù)
    const walletRes = await db.execute(`
      SELECT student_id, COALESCE(SUM(minutes), 0) as balance
      FROM hour_ledger
      GROUP BY student_id
    `);
    const walletMap: Record<string, number> = {};
    for (const row of walletRes.rows) {
      walletMap[String(row.student_id)] = Number(row.balance || 0);
    }

    const scheduledMakeupRes = await db.execute(`
      SELECT student_id, COALESCE(SUM(planned_minutes), 0) as scheduled
      FROM lessons
      WHERE kind = 'makeup' AND status = 'scheduled'
      GROUP BY student_id
    `);
    const scheduledMakeupMap: Record<string, number> = {};
    for (const row of scheduledMakeupRes.rows) {
      scheduledMakeupMap[String(row.student_id)] = Number(row.scheduled || 0);
    }

    const regularStudentsRes = await db.execute({
      sql: `
        SELECT st.*, 
               l.level_name, 
               l.surcharge_amount as level_surcharge,
               c.name as class_name,
               c.room as class_room,
               c.teacher_assignments_json as class_teacher_assignments_json
        FROM students st
        LEFT JOIN level_surcharges l ON st.level_id = l.id
        LEFT JOIN classes c ON st.class_id = c.id
        WHERE st.teacher_id = ? 
           OR c.teacher_id = ? 
           OR c.teacher_assignments_json LIKE ?
        ORDER BY st.name ASC
      `,
      args: [teacherId, teacherId, `%"teacher_id":"${teacherId}"%`],
    });

    const studentsWithWallet = regularStudentsRes.rows.map((st) => {
      const sid = String(st.id);
      const bal = walletMap[sid] || 0;
      const sched = scheduledMakeupMap[sid] || 0;
      return {
        ...st,
        balance_minutes: bal,
        available_minutes: bal - sched,
      };
    });

    // 1.1 Get Classes that this teacher is in charge of (hoặc được phân công giờ dạy trong teacher_assignments_json)
    const allClassesRes = await db.execute(`
      SELECT c.*, 
             sub.name as subject_name, 
             sub.color as subject_color,
             COUNT(s.id) as student_count
      FROM classes c
      LEFT JOIN subjects sub ON c.subject_id = sub.id
      LEFT JOIN students s ON s.class_id = c.id AND s.status != 'dropped'
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    // Lọc các lớp mà giáo viên là chủ nhiệm HOẶC có ca dạy trong teacher_assignments_json
    const teacherClasses = allClassesRes.rows.filter((cls) => {
      if (cls.teacher_id === teacherId) return true;
      try {
        if (cls.teacher_assignments_json) {
          const assignments = JSON.parse(String(cls.teacher_assignments_json));
          if (Array.isArray(assignments)) {
            return assignments.some((a: any) => a.teacher_id === teacherId);
          }
        }
      } catch {}
      return false;
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

    // 5. Get Zalo Bot name from settings if configured
    const botSettingRes = await db.execute("SELECT key, value FROM settings WHERE key IN ('zalo_bot_name', 'zalo_bot_token')");
    let zaloBotName = "";
    let isBotConfigured = false;
    for (const r of botSettingRes.rows) {
      if (r.key === "zalo_bot_name") zaloBotName = String(r.value || "");
      if (r.key === "zalo_bot_token" && r.value) isBotConfigured = true;
    }

    return NextResponse.json({
      success: true,
      data: {
        teacher,
        students: studentsWithWallet,
        classes: teacherClasses,
        makeups: makeupsRes.rows,
        levels: levelsRes.rows,
        time_slots: slotsRes.rows,
        zalo_bot_name: zaloBotName,
        is_bot_configured: isBotConfigured,
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
          zalo_chat_id: teacher.zalo_chat_id ? String(teacher.zalo_chat_id) : undefined,
          zalo_link: teacher.zalo_link ? String(teacher.zalo_link) : undefined,
          school_id: String(teacher.school_id || ""),
          school_name: String(teacher.school_name || ""),
          school_code: String(teacher.school_code || ""),
        },
      });
    }

    // 2. Cập nhật kết nối Zalo Chat ID cho giáo viên
    if (action === "update_zalo_chat_id") {
      const { teacher_id, zalo_chat_id } = body;
      if (!teacher_id) {
        return NextResponse.json({ success: false, message: "Thiếu mã giáo viên!" }, { status: 400 });
      }
      const val = zalo_chat_id ? String(zalo_chat_id).trim() : null;
      await db.execute({
        sql: "UPDATE teachers SET zalo_chat_id = ? WHERE id = ?",
        args: [val, teacher_id],
      });
      return NextResponse.json({
        success: true,
        message: val ? "Kết nối Zalo thành công!" : "Đã hủy kết nối Zalo!",
        zalo_chat_id: val,
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
