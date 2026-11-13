import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { timeToMinutes, isTimeOverlap } from "@/lib/shiftDetection";
import { TeacherDaySchedule, TeacherAssignedShift, DAYS_OF_WEEK } from "@/lib/types";
import { appendLedger } from "@/lib/wallet";
import { formatMinutes } from "@/lib/tuition";
import { notifyAdminViaZaloBot } from "@/lib/zaloBot";

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
    // Không bao giờ trả mật khẩu giáo viên về client
    delete (teacher as Record<string, unknown>).password;

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
          if (st.class_id === shift.class_id || (!st.class_id && st.teacher_id === teacherId)) {
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

    // Bổ sung học sinh được kèm riêng (chưa vào lớp) có teacher_id bằng teacherId
    for (const st of allActiveStudentsRes.rows) {
      if (!st.class_id && st.teacher_id === teacherId) {
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
        // Giáo viên không được thấy số tiền học phí/chiết khấu/phụ thu
        const safeStudent: Record<string, unknown> = { ...st };
        delete safeStudent.level_surcharge;
        delete safeStudent.is_discount_enabled;
        delete safeStudent.discount_percent;
        delete safeStudent.discount_reason;
        delete safeStudent.tuition_package_id;
        return {
          ...safeStudent,
          balance_minutes: bal,
          available_minutes: bal - sched,
        };
      });

    // 2. Get MakeUp Students attending classes (Today or Upcoming)
    // Check if there are students who scheduled makeup with this teacher or in teacher's classes
    const makeupsRes = await db.execute({
      sql: `
        SELECT m.*, st.name as student_name, st.phone as student_phone, st.level_id, l.level_name
        FROM makeup_classes m
        JOIN students st ON m.student_id = st.id
        LEFT JOIN level_surcharges l ON st.level_id = l.id
        WHERE (m.makeup_teacher_id = ? 
               OR (st.class_id IS NULL AND st.teacher_id = ?) 
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

    // 6. Get attendance/lessons for the selected date if provided
    const targetDate = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const lessonsRes = await db.execute({
      sql: `SELECT * FROM lessons WHERE date = ?`,
      args: [targetDate],
    });
    const lessonsMap: Record<string, any> = {};
    for (const r of lessonsRes.rows) {
      lessonsMap[`${r.student_id}_${r.start_time}`] = {
        id: String(r.id),
        student_id: String(r.student_id),
        date: String(r.date),
        start_time: String(r.start_time),
        planned_minutes: Number(r.planned_minutes || 90),
        actual_minutes: Number(r.actual_minutes || 0),
        class_id: r.class_id ? String(r.class_id) : undefined,
        teacher_id: r.teacher_id ? String(r.teacher_id) : undefined,
        status: String(r.status || "scheduled"),
        teacher_notes: String(r.teacher_notes || ""),
        homework: String(r.homework || ""),
        rating: Number(r.rating || 5),
      };
    }

    // 7. Get leave requests submitted by this teacher
    const leavesRes = await db.execute({
      sql: `
        SELECT l.*, sub.name as substitute_teacher_name, c.name as class_name
        FROM teacher_leaves l
        LEFT JOIN teachers sub ON l.substitute_teacher_id = sub.id
        LEFT JOIN classes c ON l.class_id = c.id
        WHERE l.teacher_id = ?
        ORDER BY l.leave_date DESC, l.created_at DESC
        LIMIT 30
      `,
      args: [teacherId],
    });

    return NextResponse.json({
      success: true,
      data: {
        teacher,
        students: studentsWithWallet,
        weekly_schedule: weeklySchedule,
        classes: teacherClasses,
        makeups: makeupsRes.rows,
        levels: levelsRes.rows.map((lvl) => ({
          id: lvl.id,
          level_name: lvl.level_name,
          sort_order: lvl.sort_order,
        })),
        time_slots: slotsRes.rows,
        zalo_bot_name: zaloBotName,
        is_bot_configured: isBotConfigured,
        selected_date: targetDate,
        lessons_on_date: lessonsMap,
        leaves: leavesRes.rows,
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

    // 1. Giáo viên đăng nhập bằng Số Điện Thoại & Mật Khẩu (mặc định '123456')
    if (action === "login_by_phone") {
      const { password } = body;
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

      // Kiểm tra mật khẩu (mặc định là '123456' nếu chưa thiết lập)
      const expectedPassword = teacher.password ? String(teacher.password).trim() : "123456";
      const inputPassword = password !== undefined && password !== null ? String(password).trim() : "";

      // Nếu người dùng cung cấp mật khẩu, kiểm tra trùng khớp
      if (inputPassword && inputPassword !== expectedPassword) {
        return NextResponse.json(
          {
            success: false,
            message: "Mật khẩu không chính xác! Vui lòng kiểm tra lại.",
          },
          { status: 401 }
        );
      }

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

    // 1b. Giáo viên tự đổi mật khẩu cá nhân
    if (action === "change_password") {
      const { teacher_id, current_password, new_password, confirm_password } = body;
      if (!teacher_id || !current_password || !new_password || !confirm_password) {
        return NextResponse.json(
          { success: false, message: "Vui lòng điền đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu!" },
          { status: 400 }
        );
      }

      const cleanNewPass = String(new_password).trim();
      const cleanConfirmPass = String(confirm_password).trim();
      const cleanCurrentPass = String(current_password).trim();

      if (cleanNewPass.length < 6) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" },
          { status: 400 }
        );
      }

      if (cleanNewPass !== cleanConfirmPass) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!" },
          { status: 400 }
        );
      }

      const tcCheck = await db.execute({
        sql: "SELECT id, password FROM teachers WHERE id = ?",
        args: [teacher_id],
      });

      if (tcCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: "Không tìm thấy thông tin giáo viên!" },
          { status: 404 }
        );
      }

      const currentDbPass = tcCheck.rows[0].password ? String(tcCheck.rows[0].password).trim() : "123456";
      if (cleanCurrentPass !== currentDbPass) {
        return NextResponse.json(
          { success: false, message: "Mật khẩu hiện tại không chính xác!" },
          { status: 400 }
        );
      }

      await db.execute({
        sql: "UPDATE teachers SET password = ? WHERE id = ?",
        args: [cleanNewPass, teacher_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đổi mật khẩu thành công! Thầy/cô hãy ghi nhớ mật khẩu mới để đăng nhập các lần sau.",
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

    // 4. Giáo viên Điểm danh & Nhận xét buổi học (Có mặt / Vắng có phép / Vắng không phép, Nhận xét, Bài tập, Sao)
    if (action === "save_attendance") {
      const { teacher_id, date, records } = body;
      if (!teacher_id || !date || !Array.isArray(records) || records.length === 0) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn ngày và danh sách học sinh cần điểm danh!" },
          { status: 400 }
        );
      }

      for (const rec of records) {
        const { student_id, class_id, start_time, planned_minutes, status, teacher_notes, homework, rating } = rec;
        if (!student_id || !start_time || !status) continue;

        const pMinutes = Number(planned_minutes) || 90;
        const actualMin = status === "attended" ? pMinutes : 0;
        const starRating = Math.min(5, Math.max(1, Number(rating) || 5));
        const lessonId = `les-${student_id.slice(0, 8)}-${date}-${start_time.replace(":", "")}`;

        // Lưu / cập nhật bảng lessons
        await db.execute({
          sql: `
            INSERT INTO lessons (
              id, student_id, date, start_time, planned_minutes, actual_minutes,
              class_id, teacher_id, kind, status, teacher_notes, homework, rating, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'regular', ?, ?, ?, ?, 'teacher')
            ON CONFLICT(student_id, date, start_time) DO UPDATE SET
              status = excluded.status,
              actual_minutes = excluded.actual_minutes,
              class_id = COALESCE(excluded.class_id, lessons.class_id),
              teacher_id = excluded.teacher_id,
              teacher_notes = excluded.teacher_notes,
              homework = excluded.homework,
              rating = excluded.rating
          `,
          args: [
            lessonId,
            student_id,
            date,
            start_time,
            pMinutes,
            actualMin,
            class_id || null,
            teacher_id,
            status,
            teacher_notes ? String(teacher_notes).trim() : "",
            homework ? String(homework).trim() : "",
            starRating,
          ],
        });

        // Xử lý học bù nếu học sinh này có lịch bù đã xếp vào ngày này
        if (status === "attended") {
          const mkCheck = await db.execute({
            sql: `SELECT id, makeup_minutes, absence_minutes FROM makeup_classes
                  WHERE student_id = ? AND makeup_date = ? AND status = 'scheduled' LIMIT 1`,
            args: [student_id, date],
          });
          if (mkCheck.rows.length > 0) {
            const mk = mkCheck.rows[0];
            const usedMin = Number(mk.makeup_minutes) || Number(mk.absence_minutes) || pMinutes;
            await db.execute({
              sql: `UPDATE makeup_classes SET status = 'completed' WHERE id = ?`,
              args: [mk.id],
            });
            await appendLedger({
              studentId: student_id,
              type: "CONSUME",
              minutes: -usedMin,
              refType: "makeup_completed",
              refId: String(mk.id),
              note: `Hoàn thành học bù ngày ${date} lúc ${start_time} (-${formatMinutes(usedMin)})`,
              createdBy: "teacher_attendance",
            });
          }
        }

        // Tự động tích lũy giờ bù nếu giáo viên đánh dấu vắng có phép
        if (status === "absent_excused") {
          const mkExist = await db.execute({
            sql: `SELECT id FROM makeup_classes WHERE student_id = ? AND absence_date = ? LIMIT 1`,
            args: [student_id, date],
          });
          if (mkExist.rows.length === 0) {
            const mkId = `mk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            await db.execute({
              sql: `INSERT INTO makeup_classes (
                      id, student_id, absence_date, absence_reason,
                      absence_start_time, absence_minutes, status
                    ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
              args: [
                mkId,
                student_id,
                date,
                teacher_notes ? `Thầy cô ghi nhận: ${teacher_notes}` : "Điểm danh vắng có phép",
                start_time,
                pMinutes,
              ],
            });
            await appendLedger({
              studentId: student_id,
              type: "REFUND",
              minutes: pMinutes,
              refType: "absence",
              refId: mkId,
              note: `Tích lũy giờ nghỉ ngày ${date} (+${formatMinutes(pMinutes)}) từ điểm danh giáo viên`,
              createdBy: "teacher_attendance",
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã lưu điểm danh và nhận xét thành công cho ${records.length} học viên!`,
      });
    }

    // 5. Giáo viên gửi đơn xin nghỉ dạy
    if (action === "request_leave") {
      const { teacher_id, leave_date, shift_desc, start_time, end_time, class_id, reason, substitute_teacher_id } = body;
      if (!teacher_id || !leave_date || !reason || !String(reason).trim()) {
        return NextResponse.json(
          { success: false, message: "Vui lòng chọn ngày nghỉ và nhập lý do xin nghỉ!" },
          { status: 400 }
        );
      }

      const tcRes = await db.execute({
        sql: "SELECT name, school_id FROM teachers WHERE id = ?",
        args: [teacher_id],
      });
      const teacherName = tcRes.rows.length > 0 && tcRes.rows[0].name ? String(tcRes.rows[0].name) : "Giáo viên";
      const schoolId = tcRes.rows.length > 0 && tcRes.rows[0].school_id ? String(tcRes.rows[0].school_id) : "school-default";
      const leaveId = `tl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

      await db.execute({
        sql: `
          INSERT INTO teacher_leaves (
            id, school_id, teacher_id, leave_date, shift_desc, start_time, end_time,
            class_id, reason, substitute_teacher_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `,
        args: [
          leaveId,
          schoolId,
          teacher_id,
          leave_date,
          shift_desc || "Cả ngày",
          start_time || null,
          end_time || null,
          class_id || null,
          String(reason).trim(),
          substitute_teacher_id || null,
        ],
      });

      // 🔔 Bắn thông báo Zalo cho Admin khi giáo viên nộp đơn xin nghỉ
      let subName = "";
      if (substitute_teacher_id) {
        const subRes = await db.execute({
          sql: "SELECT name FROM teachers WHERE id = ?",
          args: [substitute_teacher_id],
        });
        if (subRes.rows.length > 0) subName = String(subRes.rows[0].name);
      }

      const msgForAdmin = `👨‍🏫 [GIÁO VIÊN XIN NGHỈ]
• Giáo viên: ${teacherName}
• Ngày xin nghỉ: ${leave_date} (${shift_desc || "Cả ngày"})
• Lý do: ${String(reason).trim()}${subName ? `\n• Đề xuất dạy thay: ${subName}` : ""}
• Trạng thái: Đang chờ quản lý cơ sở phê duyệt & phân công dạy thay.`;

      notifyAdminViaZaloBot(msgForAdmin, "teacher_leave").catch(() => {});

      return NextResponse.json({
        success: true,
        message: "Đã gửi đơn xin nghỉ thành công! Quản lý cơ sở sẽ xem xét và phản hồi.",
        leave_id: leaveId,
      });
    }

    // 6. Giáo viên hủy đơn xin nghỉ đang chờ duyệt
    if (action === "cancel_leave") {
      const { leave_id, teacher_id } = body;
      if (!leave_id || !teacher_id) {
        return NextResponse.json({ success: false, message: "Thiếu mã đơn xin nghỉ!" }, { status: 400 });
      }

      await db.execute({
        sql: "DELETE FROM teacher_leaves WHERE id = ? AND teacher_id = ? AND status = 'pending'",
        args: [leave_id, teacher_id],
      });

      return NextResponse.json({
        success: true,
        message: "Đã hủy đơn xin nghỉ thành công!",
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
