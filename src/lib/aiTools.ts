import { getDb, initDb } from "@/lib/db";
import { appendLedger } from "@/lib/wallet";
import { formatMinutes } from "@/lib/tuition";
import { StudentStatus, DbRow } from "@/lib/types";
import { createLogger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/errors";

const log = createLogger("lib/aiTools");

const ZALO_BOT_BASE_URL = "https://bot-api.zapps.me";

/**
 * Danh sách OpenAI-compatible Tools cung cấp cho AI Agent Quản trị cơ sở
 */
export const AI_ADMIN_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_student_action",
      description:
        "Thêm học sinh mới vào trung tâm khi Admin yêu cầu (tự sinh mã học viên HSxx, tự gán bộ môn và lịch học)",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Họ và tên của học sinh mới (VD: Nguyễn Minh Khang)",
          },
          phone: {
            type: "string",
            description: "Số điện thoại của phụ huynh hoặc học sinh (VD: 0988123456)",
          },
          subject_name: {
            type: "string",
            description: "Tên môn học (VD: Piano, Guitar, Thanh Nhạc, Vẽ...)",
          },
          level_name: {
            type: "string",
            description: "Trình độ học viên (VD: Cơ bản, Nâng cao...)",
          },
          days_of_week: {
            type: "string",
            description:
              "Các ngày học trong tuần (VD: 'Thứ 2, Thứ 4, Thứ 6' hoặc 'Thứ 7, Chủ Nhật')",
          },
          time_detail: {
            type: "string",
            description: "Khung giờ học cụ thể (VD: '18:00 - 19:30' hoặc '09:00 - 10:30')",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "mark_attendance_action",
      description:
        "Điểm danh buổi học hoặc ghi nhận học sinh vắng có phép/không phép (nếu vắng có phép, tự động cộng phút vào ví giờ học bù)",
      parameters: {
        type: "object",
        properties: {
          student_name_or_code: {
            type: "string",
            description: "Tên học sinh hoặc Mã học viên (VD: 'Bảo An' hoặc 'HS01')",
          },
          status: {
            type: "string",
            enum: ["attended", "absent_excused", "absent_unexcused"],
            description:
              "'attended' (có mặt), 'absent_excused' (vắng có phép - tự cộng giờ học bù), 'absent_unexcused' (vắng không phép)",
          },
          date: {
            type: "string",
            description: "Ngày điểm danh dạng YYYY-MM-DD (mặc định là hôm nay nếu không nói rõ)",
          },
          start_time: {
            type: "string",
            description: "Giờ bắt đầu ca học dạng HH:mm (VD: '18:00')",
          },
          notes: {
            type: "string",
            description: "Lời nhận xét buổi học hoặc lý do xin nghỉ",
          },
          rating: {
            type: "number",
            description: "Đánh giá số sao buổi học từ 1 đến 5 (mặc định 5)",
          },
        },
        required: ["student_name_or_code", "status"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "change_student_status_action",
      description:
        "Thay đổi trạng thái học viên: Bảo lưu (reserve), Nghỉ học (drop), hoặc Đi học lại (resume)",
      parameters: {
        type: "object",
        properties: {
          student_name_or_code: {
            type: "string",
            description: "Tên học sinh hoặc Mã học viên (VD: 'Hoàng Nam' hoặc 'HS05')",
          },
          action_type: {
            type: "string",
            enum: ["reserve", "drop", "resume"],
            description: "'reserve' (bảo lưu), 'drop' (nghỉ học), 'resume' (đi học lại)",
          },
          reason: {
            type: "string",
            description: "Lý do thay đổi trạng thái (VD: bận thi học kỳ, chuyển chỗ ở...)",
          },
          return_date: {
            type: "string",
            description: "Ngày dự kiến đi học lại dạng YYYY-MM-DD (nếu bảo lưu)",
          },
        },
        required: ["student_name_or_code", "action_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_tuition_reminder_action",
      description: "Gửi tin nhắn tự động nhắc học phí qua Zalo Bot cho học sinh có Chat ID",
      parameters: {
        type: "object",
        properties: {
          student_name_or_code: {
            type: "string",
            description: "Tên học sinh hoặc Mã học viên (VD: 'Minh Khang' hoặc 'HS02')",
          },
          month: {
            type: "string",
            description: "Tháng học phí cần nhắc dạng YYYY-MM (VD: '2026-11')",
          },
          custom_message: {
            type: "string",
            description: "Nội dung tin nhắn nhắc riêng biệt nếu có",
          },
        },
        required: ["student_name_or_code"],
      },
    },
  },
];

/**
 * Bộ thực thi lệnh của AI Agent vào hệ thống
 */
export async function executeAiAdminTool(
  toolName: string,
  args: DbRow,
  schoolId: string = "school-default"
): Promise<{ success: boolean; message: string; data?: DbRow }> {
  await initDb();
  const db = getDb();

  try {
    // ----------------------------------------------------
    // TOOL 1: Thêm học sinh mới
    // ----------------------------------------------------
    if (toolName === "create_student_action") {
      const studentName = String(args.name || "").trim();
      if (!studentName) {
        return { success: false, message: "Thiếu họ tên học sinh mới!" };
      }

      // Tự sinh mã học viên HSxx
      const allCodesRes = await db.execute({
        sql: "SELECT student_code FROM students WHERE school_id = ? OR school_id = 'school-default'",
        args: [schoolId],
      });
      let maxNum = 0;
      for (const row of allCodesRes.rows) {
        if (!row.student_code) continue;
        const m = String(row.student_code)
          .trim()
          .match(/^HS[-_]?0*(\d+)$/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const studentCode = `HS${String(maxNum + 1).padStart(2, "0")}`;
      const studentId = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      // Tìm môn học khớp hoặc lấy môn đầu tiên
      let subjectId = null;
      let subjectName = "";
      if (args.subject_name) {
        const subRes = await db.execute({
          sql: "SELECT id, name FROM subjects WHERE (school_id = ? OR school_id = 'school-default') AND LOWER(name) LIKE ? LIMIT 1",
          args: [schoolId, `%${String(args.subject_name).trim().toLowerCase()}%`],
        });
        if (subRes.rows.length > 0) {
          subjectId = String(subRes.rows[0].id);
          subjectName = String(subRes.rows[0].name);
        }
      }
      if (!subjectId) {
        const defSub = await db.execute({
          sql: "SELECT id, name FROM subjects WHERE school_id = ? OR school_id = 'school-default' LIMIT 1",
          args: [schoolId],
        });
        if (defSub.rows.length > 0) {
          subjectId = String(defSub.rows[0].id);
          subjectName = String(defSub.rows[0].name);
        }
      }

      // Tìm Level
      let levelId = "lvl-default";
      const lvlRes = await db.execute({
        sql: "SELECT id FROM level_surcharges WHERE school_id = ? OR school_id = 'school-default' LIMIT 1",
        args: [schoolId],
      });
      if (lvlRes.rows.length > 0) {
        levelId = String(lvlRes.rows[0].id);
      }

      // Gói học phí mặc định
      let pkgId = null;
      const pkgRes = await db.execute({
        sql: "SELECT id FROM tuition_packages WHERE (school_id = ? OR school_id = 'school-default') AND cycle_unit = 'month' AND cycle_value = 1 LIMIT 1",
        args: [schoolId],
      });
      if (pkgRes.rows.length > 0) {
        pkgId = String(pkgRes.rows[0].id);
      }

      const cleanPhone = args.phone ? String(args.phone).replace(/\D/g, "") : "";
      const zaloLink = cleanPhone ? `https://zalo.me/${cleanPhone}` : "";
      const regDays = args.days_of_week ? String(args.days_of_week).trim() : "Thứ 2, Thứ 4, Thứ 6";
      const studyTime = args.time_detail ? String(args.time_detail).trim() : "18:00 - 19:30";

      // Tạo schedule_details_json cơ bản
      const daysArr = regDays
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const timeParts = studyTime.split("-").map((t) => t.trim());
      const sStart = timeParts[0] || "18:00";
      const sEnd = timeParts[1] || "19:30";

      const scheduleDetails = daysArr.map((day) => ({
        day,
        start_time: sStart,
        end_time: sEnd,
        duration_hours: 1.5,
      }));

      await db.execute({
        sql: `INSERT INTO students (
          id, school_id, student_code, name, phone, zalo_link, level_id,
          subject_id, tuition_package_id, registered_days, study_time_detail,
          schedule_details_json, duration_mode, sessions_per_week, hours_per_week, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'by_hours', ?, 3, 'studying')`,
        args: [
          studentId,
          schoolId,
          studentCode,
          studentName,
          args.phone ? String(args.phone).trim() : "",
          zaloLink,
          levelId,
          subjectId,
          pkgId,
          regDays,
          studyTime,
          JSON.stringify(scheduleDetails),
          daysArr.length || 3,
        ],
      });

      return {
        success: true,
        message: `Đã tạo thành công hồ sơ học sinh: **${studentName}** (Mã: \`${studentCode}\`). Môn học: ${subjectName || "Cơ bản"}, Lịch học: ${regDays} (${studyTime}).`,
        data: { student_id: studentId, student_code: studentCode, name: studentName },
      };
    }

    // ----------------------------------------------------
    // TOOL 2: Điểm danh & Báo nghỉ
    // ----------------------------------------------------
    if (toolName === "mark_attendance_action") {
      const searchKey = String(args.student_name_or_code || "").trim();
      const status = args.status as "attended" | "absent_excused" | "absent_unexcused";
      const targetDate = args.date
        ? String(args.date).trim()
        : new Date().toISOString().slice(0, 10);
      const notes = args.notes ? String(args.notes).trim() : "";
      const rating = Math.min(5, Math.max(1, Number(args.rating) || 5));

      // Tìm học sinh
      const stRes = await db.execute({
        sql: `SELECT id, name, student_code, study_time_detail, schedule_details_json, class_id, teacher_id
              FROM students 
              WHERE (school_id = ? OR school_id = 'school-default')
                AND (UPPER(student_code) = UPPER(?) OR LOWER(name) LIKE ?)
              LIMIT 1`,
        args: [schoolId, searchKey, `%${searchKey.toLowerCase()}%`],
      });

      if (stRes.rows.length === 0) {
        return { success: false, message: `Không tìm thấy học sinh nào khớp với "${searchKey}"!` };
      }

      const st = stRes.rows[0];
      const studentId = String(st.id);
      const studentName = String(st.name);

      // Xác định giờ học bắt đầu
      let startTime = args.start_time ? String(args.start_time).trim() : "";
      if (!startTime && st.study_time_detail) {
        const m = String(st.study_time_detail).match(/(\d{1,2}:\d{2})/);
        if (m) startTime = m[1];
      }
      if (!startTime) startTime = "18:00";

      const plannedMinutes = 90;
      const actualMinutes = status === "attended" ? plannedMinutes : 0;
      const lessonId = `les-${studentId.slice(0, 8)}-${targetDate}-${startTime.replace(":", "")}`;

      // Upsert vào bảng lessons
      await db.execute({
        sql: `INSERT INTO lessons (
          id, student_id, date, start_time, planned_minutes, actual_minutes,
          class_id, teacher_id, kind, status, teacher_notes, rating, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'regular', ?, ?, ?, 'ai_assistant')
        ON CONFLICT(student_id, date, start_time) DO UPDATE SET
          status = excluded.status,
          actual_minutes = excluded.actual_minutes,
          teacher_notes = excluded.teacher_notes,
          rating = excluded.rating`,
        args: [
          lessonId,
          studentId,
          targetDate,
          startTime,
          plannedMinutes,
          actualMinutes,
          st.class_id ? String(st.class_id) : null,
          st.teacher_id ? String(st.teacher_id) : null,
          status,
          notes,
          rating,
        ],
      });

      // Nếu vắng có phép: tự sinh buổi bù và cộng vào ví giờ
      if (status === "absent_excused") {
        const mkExist = await db.execute({
          sql: `SELECT id FROM makeup_classes WHERE student_id = ? AND absence_date = ? LIMIT 1`,
          args: [studentId, targetDate],
        });
        if (mkExist.rows.length === 0) {
          const mkId = `mk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          await db.execute({
            sql: `INSERT INTO makeup_classes (
              id, student_id, absence_date, absence_reason, absence_start_time, absence_minutes, status
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            args: [
              mkId,
              studentId,
              targetDate,
              notes || "Trợ lý AI điểm danh vắng có phép",
              startTime,
              plannedMinutes,
            ],
          });
          await appendLedger({
            studentId,
            type: "REFUND",
            minutes: plannedMinutes,
            refType: "absence",
            refId: mkId,
            note: `AI hoàn giờ nghỉ ngày ${targetDate} (+${formatMinutes(plannedMinutes)})`,
            createdBy: "ai_assistant",
          });
        }
      }

      const statusText =
        status === "attended"
          ? "Có mặt"
          : status === "absent_excused"
            ? "Vắng có phép (+90p học bù)"
            : "Vắng không phép";

      return {
        success: true,
        message: `Đã điểm danh cho bé **${studentName}** (\`${st.student_code}\`) ngày **${targetDate}** ca **${startTime}**: **${statusText}**. ${notes ? `Ghi chú: "${notes}"` : ""}`,
      };
    }

    // ----------------------------------------------------
    // TOOL 3: Thay đổi trạng thái học viên (Bảo lưu / Nghỉ / Học lại)
    // ----------------------------------------------------
    if (toolName === "change_student_status_action") {
      const searchKey = String(args.student_name_or_code || "").trim();
      const actionType = args.action_type as "reserve" | "drop" | "resume";
      const reason = args.reason
        ? String(args.reason).trim()
        : "Trợ lý AI cập nhật theo lệnh Admin";
      const returnDate = args.return_date ? String(args.return_date).trim() : null;
      const effDate = new Date().toISOString().slice(0, 10);
      const month = effDate.slice(0, 7);
      const nowTimestamp = new Date().toISOString().replace("T", " ").slice(0, 19);

      const stRes = await db.execute({
        sql: `SELECT id, name, student_code, status FROM students 
              WHERE (school_id = ? OR school_id = 'school-default')
                AND (UPPER(student_code) = UPPER(?) OR LOWER(name) LIKE ?)
              LIMIT 1`,
        args: [schoolId, searchKey, `%${searchKey.toLowerCase()}%`],
      });

      if (stRes.rows.length === 0) {
        return { success: false, message: `Không tìm thấy học sinh nào khớp với "${searchKey}"!` };
      }

      const st = stRes.rows[0];
      const studentId = String(st.id);
      const studentName = String(st.name);
      const fromStatus = String(st.status || "studying") as StudentStatus;

      let toStatus: StudentStatus = "studying";
      if (actionType === "reserve") toStatus = "reserved";
      else if (actionType === "drop") toStatus = "dropped";
      else if (actionType === "resume") toStatus = "studying";

      await db.execute({
        sql: `UPDATE students 
              SET status = ?, 
                  status_date = ?, 
                  expected_return_date = ?, 
                  status_note = ?
              WHERE id = ?`,
        args: [toStatus, effDate, actionType === "reserve" ? returnDate : null, reason, studentId],
      });

      const logId = `log-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO student_status_logs 
              (id, student_id, action_type, from_status, to_status, effective_date, return_date, reason, logged_at, month)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          logId,
          studentId,
          actionType,
          fromStatus,
          toStatus,
          effDate,
          actionType === "reserve" ? returnDate : null,
          reason,
          nowTimestamp,
          month,
        ],
      });

      const actionDesc =
        actionType === "reserve"
          ? `Bảo lưu${returnDate ? ` (dự kiến học lại: ${returnDate})` : ""}`
          : actionType === "drop"
            ? "Nghỉ học hẳn"
            : "Đã quay lại đi học";

      return {
        success: true,
        message: `Đã cập nhật trạng thái học sinh **${studentName}** (\`${st.student_code}\`) thành: **${actionDesc}**. Lý do: "${reason}".`,
      };
    }

    // ----------------------------------------------------
    // TOOL 4: Gửi tin nhắn nhắc học phí Zalo Bot
    // ----------------------------------------------------
    if (toolName === "send_tuition_reminder_action") {
      const searchKey = String(args.student_name_or_code || "").trim();
      const currentMonth = args.month
        ? String(args.month).trim()
        : new Date().toISOString().slice(0, 7);

      const stRes = await db.execute({
        sql: `SELECT id, name, student_code, phone, zalo_chat_id FROM students 
              WHERE (school_id = ? OR school_id = 'school-default')
                AND (UPPER(student_code) = UPPER(?) OR LOWER(name) LIKE ?)
              LIMIT 1`,
        args: [schoolId, searchKey, `%${searchKey.toLowerCase()}%`],
      });

      if (stRes.rows.length === 0) {
        return { success: false, message: `Không tìm thấy học sinh nào khớp với "${searchKey}"!` };
      }

      const st = stRes.rows[0];
      const chatId = st.zalo_chat_id ? String(st.zalo_chat_id).trim() : "";
      if (!chatId) {
        return {
          success: false,
          message: `Học sinh **${st.name}** (\`${st.student_code}\`) chưa liên kết Zalo Chat ID nên không thể gửi tin nhắn bot tự động!`,
        };
      }

      // Lấy Bot Token của trường
      let botToken = "";
      const scRes = await db.execute({
        sql: "SELECT zalo_bot_token FROM schools WHERE id = ? LIMIT 1",
        args: [schoolId],
      });
      if (scRes.rows.length > 0 && scRes.rows[0].zalo_bot_token) {
        botToken = String(scRes.rows[0].zalo_bot_token).trim();
      }
      // Chỉ cơ sở mặc định mới được fallback sang token toàn cục trong settings.
      if (!botToken && (!schoolId || schoolId === "school-default")) {
        const tokenRes = await db.execute(
          "SELECT value FROM settings WHERE key = 'zalo_bot_token'"
        );
        if (tokenRes.rows.length > 0) botToken = String(tokenRes.rows[0].value).trim();
      }
      if (!botToken) {
        return { success: false, message: "Trung tâm chưa cấu hình Zalo Bot Token!" };
      }

      const messageText =
        args.custom_message ||
        `🔔 [NHẮC HỌC PHÍ TỰ ĐỘNG]\nTrung tâm xin gửi thông báo học phí tháng ${currentMonth} của bé ${st.name}. Kính mong Quý Phụ Huynh kiểm tra và hoàn tất học phí cho bé qua Cổng Phụ Huynh nhé!`;

      const sendUrl = `${ZALO_BOT_BASE_URL}/bot${botToken}/sendMessage`;
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText.trim().slice(0, 2000),
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return {
          success: false,
          message: `Zalo Bot báo lỗi: ${data.description || "Gửi thất bại"}`,
        };
      }

      // Ghi log vào bảng tuition_reminders
      const reminderId = `remind-ai-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO tuition_reminders (id, school_id, student_id, month, amount, channel, reminded_by, note)
              VALUES (?, ?, ?, ?, 0, 'zalo_bot', 'Trợ Lý AI', 'Nhắc tự động theo lệnh Admin')`,
        args: [reminderId, schoolId, String(st.id), currentMonth],
      });

      return {
        success: true,
        message: `Đã gửi tin nhắn nhắc học phí tháng **${currentMonth}** qua Zalo Bot thành công cho bé **${st.name}**!`,
      };
    }

    return { success: false, message: `Hành động không xác định: ${toolName}` };
  } catch (error: unknown) {
    log.error("executeAiAdminTool Error:", { error: error });
    return { success: false, message: `Lỗi khi thực thi lệnh: ${getErrorMessage(error)}` };
  }
}
