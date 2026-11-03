import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { timeToMinutes } from "@/lib/shiftDetection";
import { TeacherDaySchedule, TeacherAssignedShift } from "@/lib/types";

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

function isTimeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return Math.max(start1, start2) < Math.min(end1, end2);
}

function studentMatchesShift(
  st: { schedule_details_json?: string; registered_days?: string; study_time_detail?: string },
  day: string,
  shiftStart: string,
  shiftEnd: string
): boolean {
  if (st.schedule_details_json) {
    try {
      const items = JSON.parse(st.schedule_details_json);
      if (Array.isArray(items) && items.length > 0) {
        const dayItem = items.find((it: any) => it.day === day);
        if (dayItem && dayItem.start_time) {
          const sEnd = dayItem.end_time || dayItem.start_time;
          return isTimeOverlap(dayItem.start_time, sEnd, shiftStart, shiftEnd);
        }
      }
    } catch {}
  }
  if (st.registered_days && st.registered_days.includes(day)) {
    if (st.study_time_detail) {
      const range = st.study_time_detail.match(/(\d{1,2}):(\d{2})\s*[-–to~]\s*(\d{1,2}):(\d{2})/);
      if (range) {
        const sStart = `${range[1]}:${range[2]}`;
        const sEnd = `${range[3]}:${range[4]}`;
        return isTimeOverlap(sStart, sEnd, shiftStart, shiftEnd);
      }
    }
    return true;
  }
  return false;
}

function getStudentTimeOnDay(
  st: { schedule_details_json?: string; study_time_detail?: string },
  day: string
): string {
  if (st.schedule_details_json) {
    try {
      const items = JSON.parse(st.schedule_details_json);
      const dayItem = items.find((it: any) => it.day === day);
      if (dayItem && dayItem.start_time) {
        return `${dayItem.start_time}${dayItem.end_time ? " - " + dayItem.end_time : ""}`;
      }
    } catch {}
  }
  return st.study_time_detail || "Theo ca mở";
}

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

    const rawTeacher = teacherRes.rows[0];
    let parsedAssignedSlotIds: string[] = [];
    try {
      if (Array.isArray(rawTeacher.assigned_slot_ids)) {
        parsedAssignedSlotIds = rawTeacher.assigned_slot_ids;
      } else if (rawTeacher.assigned_slot_ids) {
        const p = JSON.parse(String(rawTeacher.assigned_slot_ids));
        if (Array.isArray(p)) parsedAssignedSlotIds = p;
      }
    } catch {}

    const teacher = {
      ...rawTeacher,
      assigned_slot_ids: parsedAssignedSlotIds,
    };

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

    const teacherClassIds = teacherClasses.map((c) => String(c.id));

    // Lấy toàn bộ học sinh đang theo học (không tính học sinh đã nghỉ hẳn 'dropped')
    const allActiveStudentsRes = await db.execute(`
      SELECT st.*, 
             l.level_name, 
             l.surcharge_amount as level_surcharge,
             c.name as class_name,
             c.room as class_room,
             c.teacher_assignments_json as class_teacher_assignments_json
      FROM students st
      LEFT JOIN level_surcharges l ON st.level_id = l.id
      LEFT JOIN classes c ON st.class_id = c.id
      WHERE st.status != 'dropped'
      ORDER BY st.name ASC
    `);

    // 1.2 Xây dựng Thời Khóa Biểu Tuần (Weekly Schedule) cho giáo viên
    const weeklySchedule: TeacherDaySchedule[] = DAYS_OF_WEEK.map((day) => {
      const shifts: TeacherAssignedShift[] = [];

      for (const cls of teacherClasses) {
        let schList: Array<{ day: string; start_time: string; end_time: string }> = [];
        try {
          if (cls.schedule_json) schList = JSON.parse(String(cls.schedule_json));
        } catch {}

        let assList: Array<{ teacher_id: string; day?: string; start_time: string; end_time: string; role?: string }> = [];
        try {
          if (cls.teacher_assignments_json) {
            const parsed = JSON.parse(String(cls.teacher_assignments_json));
            if (Array.isArray(parsed)) assList = parsed;
          }
        } catch {}

        const myAss = assList.filter((a) => a.teacher_id === teacherId);

        if (myAss.length > 0) {
          for (const ass of myAss) {
            const assDays =
              !ass.day || ass.day === "Tất cả các ngày"
                ? schList.map((s) => s.day)
                : DAYS_OF_WEEK.filter((d) => ass.day?.includes(d));

            if (assDays.includes(day)) {
              shifts.push({
                id: `shift-${cls.id}-${day}-${ass.start_time}-${ass.end_time}`,
                class_id: String(cls.id),
                class_name: String(cls.name),
                class_code: cls.code ? String(cls.code) : undefined,
                subject_name: cls.subject_name ? String(cls.subject_name) : undefined,
                room: cls.room ? String(cls.room) : undefined,
                day,
                start_time: ass.start_time,
                end_time: ass.end_time,
                role: ass.role || "Đứng lớp",
                max_students: Number(cls.max_students) || 15,
                students: [],
              });
            }
          }
        } else if (cls.teacher_id === teacherId) {
          const daySch = schList.filter((s) => s.day === day);
          for (const s of daySch) {
            shifts.push({
              id: `shift-${cls.id}-${day}-${s.start_time}-${s.end_time}`,
              class_id: String(cls.id),
              class_name: String(cls.name),
              class_code: cls.code ? String(cls.code) : undefined,
              subject_name: cls.subject_name ? String(cls.subject_name) : undefined,
              room: cls.room ? String(cls.room) : undefined,
              day,
              start_time: s.start_time,
              end_time: s.end_time,
              role: "Chủ nhiệm / Đứng lớp",
              max_students: Number(cls.max_students) || 15,
              students: [],
            });
          }
        }
      }

      // Sắp xếp các ca dạy trong ngày theo giờ bắt đầu tăng dần
      shifts.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

      // Ghép học sinh thuộc ca dạy
      for (const shift of shifts) {
        for (const st of allActiveStudentsRes.rows) {
          if (st.class_id === shift.class_id || st.teacher_id === teacherId) {
            if (studentMatchesShift(st as any, day, shift.start_time, shift.end_time)) {
              shift.students.push({
                id: String(st.id),
                name: String(st.name),
                phone: String(st.phone || ""),
                student_code: st.student_code ? String(st.student_code) : undefined,
                level_name: st.level_name ? String(st.level_name) : undefined,
                time_label: getStudentTimeOnDay(st as any, day),
              });
            }
          }
        }
      }

      return {
        day,
        shifts,
        total_students: shifts.reduce((sum, sh) => sum + sh.students.length, 0),
      };
    });

    // 1.3 Xác định danh sách học sinh mà giáo viên này phụ trách thực tế
    const taughtStudentIds = new Set<string>();
    for (const daySch of weeklySchedule) {
      for (const sh of daySch.shifts) {
        for (const st of sh.students) {
          taughtStudentIds.add(st.id);
        }
      }
    }

    // Bổ sung học sinh được gán kèm trực tiếp teacher_id
    for (const st of allActiveStudentsRes.rows) {
      if (st.teacher_id === teacherId) {
        taughtStudentIds.add(String(st.id));
      }
    }

    // Fallback nếu lớp chưa chia ca chi tiết nhưng giáo viên là người đứng lớp duy nhất
    if (taughtStudentIds.size === 0 && teacherClasses.length > 0) {
      for (const st of allActiveStudentsRes.rows) {
        if (teacherClassIds.includes(String(st.class_id))) {
          const cls = teacherClasses.find((c) => String(c.id) === String(st.class_id));
          if (cls && cls.teacher_id === teacherId && !cls.teacher_assignments_json) {
            taughtStudentIds.add(String(st.id));
          }
        }
      }
    }

    const studentsWithWallet = allActiveStudentsRes.rows
      .filter((st) => taughtStudentIds.has(String(st.id)))
      .map((st) => {
        const sid = String(st.id);
        const bal = walletMap[sid] || 0;
        const sched = scheduledMakeupMap[sid] || 0;
        return {
          ...st,
          balance_minutes: bal,
          available_minutes: bal - sched,
        };
      });

    // 2. Get MakeUp Students attending classes (Today or Upcoming)
    // Check if there are students who scheduled makeup with this teacher or in slots
    const makeupsRes = await db.execute({
      sql: `
        SELECT m.*, st.name as student_name, st.phone as student_phone, st.level_id, l.level_name
        FROM makeup_classes m
        JOIN students st ON m.student_id = st.id
        LEFT JOIN level_surcharges l ON st.level_id = l.id
        WHERE (m.makeup_teacher_id = ? 
               OR st.teacher_id = ? 
               OR m.class_id IN (SELECT id FROM classes WHERE teacher_id = ? OR teacher_assignments_json LIKE ?))
          AND m.status IN ('scheduled', 'completed', 'pending')
        ORDER BY COALESCE(m.makeup_date, m.absence_date) DESC
      `,
      args: [teacherId, teacherId, teacherId, `%"teacher_id":"${teacherId}"%`],
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
        weekly_schedule: weeklySchedule,
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
