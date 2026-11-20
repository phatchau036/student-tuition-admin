import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest, getAdminFromRequest } from "@/lib/authHelper";
import { SchedulePreset } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/settings");

export async function GET(req: Request) {
  try {
    await initDb();
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại." },
        { status: 401 }
      );
    }
    const isOwnerOrWildcard = admin.is_owner === 1 || admin.permissions.includes("*");
    const canViewTuition =
      isOwnerOrWildcard ||
      admin.permissions.includes("tuition.view") ||
      admin.permissions.includes("settings.manage");
    const canManageSettings = isOwnerOrWildcard || admin.permissions.includes("settings.manage");

    const db = getDb();
    const schoolId = getSchoolIdFromRequest(req);

    // 1. Get Settings
    const settingsRes = await db.execute("SELECT key, value FROM settings");
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      settingsMap[String(row.key)] = String(row.value);
    }

    // Lấy thông tin cấu hình riêng biệt của cơ sở (Multi-Tenant School Settings)
    let schoolRow: Record<string, any> | null = null;
    try {
      const schoolRes = await db.execute({
        sql: "SELECT * FROM schools WHERE id = ? LIMIT 1",
        args: [schoolId],
      });
      if (schoolRes.rows.length > 0) {
        schoolRow = schoolRes.rows[0] as Record<string, any>;
      }
    } catch {}

    const isDefaultSchool = schoolId === "school-default" || !schoolId;

    let baseTuition = Number(schoolRow?.base_tuition || 0);
    if (baseTuition <= 0 && isDefaultSchool) {
      baseTuition = Number(settingsMap["base_tuition"] || 0);
    }
    if (baseTuition <= 0) {
      const defaultPkgRes = await db.execute({
        sql: "SELECT amount FROM tuition_packages WHERE school_id = ? AND cycle_unit = 'month' AND cycle_value = 1 LIMIT 1",
        args: [schoolId],
      });
      baseTuition = defaultPkgRes.rows.length > 0 ? Number(defaultPkgRes.rows[0].amount) : 1000000;
    }

    const durationMode = (settingsMap["duration_mode"] as "by_hours" | "by_sessions") || "by_hours";
    const appLanguage = (settingsMap["app_language"] as "vi" | "en" | "zh" | "ja") || "vi";
    const monthFormat = (settingsMap["month_format"] as "vietnamese" | "english" | "chinese" | "japanese" | "number") || "vietnamese";
    const defaultHours = Number(settingsMap["default_hours_per_week"] || 3);
    const defaultSessions = Number(settingsMap["default_sessions_per_week"] || 3);
    const defaultStudyTime = settingsMap["default_study_time"] || "18:00 - 19:00";
    const maxStudentsPerSlot = Number(settingsMap["max_students_per_slot"] || 10);
    const crowdedThresholdPercent = Number(settingsMap["crowded_threshold_percent"] || 80);
    const capacityMode = (settingsMap["capacity_mode"] as "by_slot" | "by_teacher") || "by_slot";
    const reconciliationMode = (settingsMap["reconciliation_mode"] as "manual" | "auto") || "manual";
    const defaultMinutesPerSession = Number(settingsMap["default_minutes_per_session"] || 90);
    const zaloReminderMode = (settingsMap["zalo_reminder_mode"] as "manual" | "bot") || "manual";

    // Zalo Bot Settings theo từng trường
    const zaloBotToken = String(schoolRow?.zalo_bot_token || (isDefaultSchool ? settingsMap["zalo_bot_token"] || "" : ""));
    const zaloBotName = String(schoolRow?.zalo_bot_name || (isDefaultSchool ? settingsMap["zalo_bot_name"] || "" : ""));
    const zaloAdminChatId = String(schoolRow?.zalo_admin_chat_id || (isDefaultSchool ? settingsMap["zalo_admin_chat_id"] || "" : ""));

    const zaloNotifyPayment = settingsMap["zalo_notify_payment"] !== "0";
    const zaloNotifyStudentAbsence = settingsMap["zalo_notify_student_absence"] !== "0";
    const zaloNotifyTeacherLeave = settingsMap["zalo_notify_teacher_leave"] !== "0";
    const zaloNotifyParentFeedback = settingsMap["zalo_notify_parent_feedback"] !== "0";
    const zaloOaSecretKey = settingsMap["zalo_oa_secret_key"] || "";
    const zaloAccessToken = settingsMap["zalo_access_token"] || "";
    const zaloTemplateId = settingsMap["zalo_template_id"] || "";

    // SePay Webhook Settings theo từng trường
    const sepayApiKey = String(schoolRow?.sepay_api_key || (isDefaultSchool ? settingsMap["sepay_api_key"] || "" : ""));
    const sepayAccountNumber = String(schoolRow?.sepay_account_number || (isDefaultSchool ? settingsMap["sepay_account_number"] || "" : ""));
    const sepayBankName = String(schoolRow?.sepay_bank_name || (isDefaultSchool ? settingsMap["sepay_bank_name"] || "" : ""));
    const sepayPrefix = String(schoolRow?.sepay_prefix || (isDefaultSchool ? settingsMap["sepay_prefix"] || "HP" : "HP"));

    // Schedule Presets (Kiểu lịch học cơ sở)
    let schedulePresets: SchedulePreset[] = [
      { id: "preset-even", name: "Thứ chẵn (2-4-6)", days: ["Thứ 2", "Thứ 4", "Thứ 6"], hours_per_session: 1.5, default_start_time: "18:00", is_default: true },
      { id: "preset-odd", name: "Thứ lẻ (3-5-7)", days: ["Thứ 3", "Thứ 5", "Thứ 7"], hours_per_session: 1.5, default_start_time: "18:00", is_default: false },
      { id: "preset-weekend", name: "Cuối tuần (T7-CN)", days: ["Thứ 7", "Chủ Nhật"], hours_per_session: 2.0, default_start_time: "09:00", is_default: false },
    ];
    const rawPresets = schoolRow?.schedule_presets || (isDefaultSchool ? settingsMap["schedule_presets"] : "");
    if (rawPresets) {
      try {
        const parsed = JSON.parse(rawPresets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          schedulePresets = parsed;
        }
      } catch {}
    }

    // 2. Get Time Slots for this school (Cô lập tuyệt đối theo school_id)
    const timeSlotsRes = await db.execute({
      sql: "SELECT * FROM time_slots WHERE school_id = ? ORDER BY id ASC",
      args: [schoolId],
    });
    const timeSlots = timeSlotsRes.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      from_day: String(row.from_day || "Thứ 2"),
      to_day: String(row.to_day || "Thứ 7"),
      days: String(row.days),
      start_time: String(row.start_time),
      end_time: String(row.end_time),
      max_students: Number(row.max_students || maxStudentsPerSlot),
      is_active: Number(row.is_active),
    }));

    // 3. Get Level Surcharges for this school (Cô lập tuyệt đối theo school_id)
    const levelRes = await db.execute({
      sql: "SELECT * FROM level_surcharges WHERE school_id = ? ORDER BY sort_order ASC, level_name ASC",
      args: [schoolId],
    });
    const levelSurcharges = levelRes.rows.map((row) => ({
      id: String(row.id),
      level_name: String(row.level_name),
      surcharge_amount: canViewTuition ? Number(row.surcharge_amount) : 0,
      surcharge_type: (String(row.surcharge_type || "fixed") as "fixed" | "percent"),
      sort_order: Number(row.sort_order),
    }));

    // 4. Get Discount Presets for this school (Cô lập tuyệt đối theo school_id)
    const discountRes = await db.execute({
      sql: "SELECT * FROM discount_presets WHERE school_id = ? ORDER BY percentage ASC",
      args: [schoolId],
    });
    const discountPresets = discountRes.rows.map((row) => ({
      id: String(row.id),
      percentage: canViewTuition ? Number(row.percentage) : 0,
      label: String(row.label),
    }));

    // 4.1 Get Tuition Packages for this school (Cô lập tuyệt đối theo school_id)
    const packagesRes = await db.execute({
      sql: "SELECT * FROM tuition_packages WHERE school_id = ? ORDER BY cycle_value ASC, amount ASC",
      args: [schoolId],
    });
    const tuitionPackages = packagesRes.rows.map((row) => ({
      id: String(row.id),
      school_id: String(row.school_id || schoolId),
      name: String(row.name),
      amount: canViewTuition ? Number(row.amount) : 0,
      original_amount: canViewTuition ? Number(row.original_amount || row.amount) : 0,
      cycle_unit: String(row.cycle_unit) as "month" | "week",
      cycle_value: Number(row.cycle_value),
      discount_type: (row.discount_type as "none" | "percent" | "amount") || "none",
      discount_value: canViewTuition ? Number(row.discount_value || 0) : 0,
      benefits: String(row.benefits || ""),
      is_active: Number(row.is_active),
      created_at: String(row.created_at || ""),
    }));

    // 4.2 Get Subjects for this school (Cô lập tuyệt đối theo school_id)
    const subjectsRes = await db.execute({
      sql: "SELECT * FROM subjects WHERE school_id = ? ORDER BY created_at ASC",
      args: [schoolId],
    });
    const subjects = subjectsRes.rows.map((row) => ({
      id: String(row.id),
      school_id: String(row.school_id || schoolId),
      name: String(row.name),
      description: String(row.description || ""),
      color: String(row.color || "indigo"),
      is_active: Number(row.is_active),
      created_at: String(row.created_at || ""),
    }));

    // 5. Get Schools and specific current school
    const schoolsRes = await db.execute("SELECT * FROM schools ORDER BY created_at ASC");
    const schools = schoolsRes.rows.map((s) => ({
      id: String(s.id),
      name: String(s.name),
      code: String(s.code),
      address: String(s.address || ""),
      phone: String(s.phone || ""),
    }));

    const matchedSchool = schools.find((s) => s.id === schoolId) || schools[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        schools: schools,
        current_school: matchedSchool,
        base_tuition: canViewTuition ? baseTuition : 0,
        duration_mode: durationMode,
        app_language: appLanguage,
        month_format: monthFormat,
        default_hours_per_week: defaultHours,
        default_sessions_per_week: defaultSessions,
        default_study_time: defaultStudyTime,
        max_students_per_slot: maxStudentsPerSlot,
        crowded_threshold_percent: crowdedThresholdPercent,
        capacity_mode: capacityMode,
        reconciliation_mode: reconciliationMode,
        default_minutes_per_session: defaultMinutesPerSession,
        zalo_reminder_mode: zaloReminderMode,
        zalo_bot_token: canManageSettings ? zaloBotToken : "",
        zalo_bot_name: zaloBotName,
        zalo_admin_chat_id: canManageSettings ? zaloAdminChatId : "",
        zalo_notify_payment: zaloNotifyPayment ? 1 : 0,
        zalo_notify_student_absence: zaloNotifyStudentAbsence ? 1 : 0,
        zalo_notify_teacher_leave: zaloNotifyTeacherLeave ? 1 : 0,
        zalo_notify_parent_feedback: zaloNotifyParentFeedback ? 1 : 0,
        zalo_oa_secret_key: canManageSettings ? zaloOaSecretKey : "",
        zalo_access_token: canManageSettings ? zaloAccessToken : "",
        zalo_template_id: canManageSettings ? zaloTemplateId : "",
        sepay_api_key: canManageSettings ? sepayApiKey : "",
        sepay_account_number: sepayAccountNumber,
        sepay_bank_name: sepayBankName,
        sepay_prefix: sepayPrefix,
        time_slots: timeSlots,
        level_surcharges: levelSurcharges,
        discount_presets: discountPresets,
        tuition_packages: tuitionPackages,
        subjects: subjects,
        schedule_presets: schedulePresets,
      },
    });
  } catch (error: unknown) {
    log.error("Settings GET Error:", { error: error });
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const isOwnerOrWildcard = admin.is_owner === 1 || admin.permissions.includes("*");
    const canManageSettings = isOwnerOrWildcard || admin.permissions.includes("settings.manage");
    // Mọi nhân viên được phép tự đổi ngôn ngữ/định dạng tháng; các cấu hình khác cần settings.manage
    const bodyKeys = Object.keys(body || {});
    const isLanguagePreferenceOnly = bodyKeys.every((key) =>
      ["app_language", "month_format", "school_id"].includes(key)
    );
    if (!canManageSettings && !isLanguagePreferenceOnly) {
      return NextResponse.json(
        { success: false, message: "Tài khoản không có quyền thay đổi cấu hình cơ sở (settings.manage)!" },
        { status: 403 }
      );
    }
    const db = getDb();
    const schoolId = body.school_id || getSchoolIdFromRequest(req);

    const {
      base_tuition,
      duration_mode,
      app_language,
      month_format,
      default_hours_per_week,
      default_sessions_per_week,
      default_study_time,
      max_students_per_slot,
      crowded_threshold_percent,
      capacity_mode,
      reconciliation_mode,
      default_minutes_per_session,
      zalo_reminder_mode,
      zalo_bot_token,
      zalo_bot_name,
      zalo_admin_chat_id,
      zalo_notify_payment,
      zalo_notify_student_absence,
      zalo_notify_teacher_leave,
      zalo_notify_parent_feedback,
      zalo_oa_secret_key,
      zalo_access_token,
      zalo_template_id,
      sepay_api_key,
      sepay_account_number,
      sepay_bank_name,
      sepay_prefix,
      time_slots,
      level_surcharges,
      discount_presets,
      schedule_presets,
    } = body;

    // 1. Cập nhật cấu hình chung vào bảng settings
    const generalKeysToUpdate: Record<string, any> = {
      duration_mode: duration_mode !== undefined ? String(duration_mode) : undefined,
      app_language: app_language !== undefined ? String(app_language) : undefined,
      month_format: month_format !== undefined ? String(month_format) : undefined,
      default_hours_per_week: default_hours_per_week !== undefined ? String(default_hours_per_week) : undefined,
      default_sessions_per_week: default_sessions_per_week !== undefined ? String(default_sessions_per_week) : undefined,
      default_study_time: default_study_time !== undefined ? String(default_study_time) : undefined,
      max_students_per_slot: max_students_per_slot !== undefined ? String(max_students_per_slot) : undefined,
      crowded_threshold_percent: crowded_threshold_percent !== undefined ? String(crowded_threshold_percent) : undefined,
      capacity_mode: capacity_mode !== undefined ? String(capacity_mode) : undefined,
      reconciliation_mode: reconciliation_mode !== undefined ? String(reconciliation_mode) : undefined,
      default_minutes_per_session: default_minutes_per_session !== undefined ? String(default_minutes_per_session) : undefined,
      zalo_reminder_mode: zalo_reminder_mode !== undefined ? String(zalo_reminder_mode) : undefined,
      zalo_notify_payment: zalo_notify_payment !== undefined ? (zalo_notify_payment ? "1" : "0") : undefined,
      zalo_notify_student_absence: zalo_notify_student_absence !== undefined ? (zalo_notify_student_absence ? "1" : "0") : undefined,
      zalo_notify_teacher_leave: zalo_notify_teacher_leave !== undefined ? (zalo_notify_teacher_leave ? "1" : "0") : undefined,
      zalo_notify_parent_feedback: zalo_notify_parent_feedback !== undefined ? (zalo_notify_parent_feedback ? "1" : "0") : undefined,
      zalo_oa_secret_key: zalo_oa_secret_key !== undefined ? String(zalo_oa_secret_key) : undefined,
      zalo_access_token: zalo_access_token !== undefined ? String(zalo_access_token) : undefined,
      zalo_template_id: zalo_template_id !== undefined ? String(zalo_template_id) : undefined,
    };

    for (const [key, val] of Object.entries(generalKeysToUpdate)) {
      if (val !== undefined) {
        await db.execute({
          sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
          args: [key, val, val],
        });
      }
    }

    const jsonSchedulePresets =
      schedule_presets !== undefined
        ? JSON.stringify(
            Array.isArray(schedule_presets)
              ? schedule_presets.map((p: SchedulePreset, idx: number) => ({
                  id: String(p.id || `preset-${Date.now()}-${idx}`),
                  name: String(p.name || `Kiểu lịch ${idx + 1}`).trim(),
                  days: Array.isArray(p.days)
                    ? p.days.map((d: string) => String(d).trim()).filter(Boolean)
                    : ["Thứ 2", "Thứ 4", "Thứ 6"],
                  hours_per_session: Number(p.hours_per_session) > 0 ? Number(p.hours_per_session) : 1.5,
                  default_start_time: p.default_start_time ? String(p.default_start_time).trim() : "18:00",
                  is_default: Boolean(p.is_default),
                }))
              : []
          )
        : undefined;

    // Cập nhật cấu hình riêng biệt của cơ sở vào bảng schools
    if (schoolId) {
      try {
        await db.execute({
          sql: `UPDATE schools 
                SET sepay_bank_name = COALESCE(?, sepay_bank_name),
                    sepay_account_number = COALESCE(?, sepay_account_number),
                    sepay_api_key = COALESCE(?, sepay_api_key),
                    sepay_prefix = COALESCE(?, sepay_prefix),
                    base_tuition = COALESCE(?, base_tuition),
                    schedule_presets = COALESCE(?, schedule_presets),
                    zalo_bot_token = COALESCE(?, zalo_bot_token),
                    zalo_bot_name = COALESCE(?, zalo_bot_name),
                    zalo_admin_chat_id = COALESCE(?, zalo_admin_chat_id)
                WHERE id = ?`,
          args: [
            sepay_bank_name !== undefined ? String(sepay_bank_name).trim() : null,
            sepay_account_number !== undefined ? String(sepay_account_number).trim() : null,
            sepay_api_key !== undefined ? String(sepay_api_key).trim() : null,
            sepay_prefix !== undefined ? String(sepay_prefix).trim().toUpperCase() : null,
            base_tuition !== undefined ? Number(base_tuition) || 0 : null,
            jsonSchedulePresets !== undefined ? jsonSchedulePresets : null,
            zalo_bot_token !== undefined ? String(zalo_bot_token).trim() : null,
            zalo_bot_name !== undefined ? String(zalo_bot_name).trim() : null,
            zalo_admin_chat_id !== undefined ? String(zalo_admin_chat_id).trim() : null,
            schoolId,
          ],
        });
      } catch (scErr) {
        log.error("Failed to update school-specific settings:", { error: scErr });
      }
    }

    // Nếu là trường mặc định thì đồng bộ thêm vào bảng settings để tương thích ngược
    if (schoolId === "school-default" || !schoolId) {
      const legacyMap: Record<string, string | undefined> = {
        base_tuition: base_tuition !== undefined ? String(base_tuition) : undefined,
        sepay_bank_name: sepay_bank_name !== undefined ? String(sepay_bank_name).trim() : undefined,
        sepay_account_number: sepay_account_number !== undefined ? String(sepay_account_number).trim() : undefined,
        sepay_api_key: sepay_api_key !== undefined ? String(sepay_api_key).trim() : undefined,
        sepay_prefix: sepay_prefix !== undefined ? String(sepay_prefix).trim().toUpperCase() : undefined,
        schedule_presets: jsonSchedulePresets,
        zalo_bot_token: zalo_bot_token !== undefined ? String(zalo_bot_token).trim() : undefined,
        zalo_bot_name: zalo_bot_name !== undefined ? String(zalo_bot_name).trim() : undefined,
        zalo_admin_chat_id: zalo_admin_chat_id !== undefined ? String(zalo_admin_chat_id).trim() : undefined,
      };
      for (const [key, val] of Object.entries(legacyMap)) {
        if (val !== undefined) {
          await db.execute({
            sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
            args: [key, val, val],
          });
        }
      }
    }

    // 2. Save Time Slots (Cô lập tuyệt đối theo school_id)
    if (Array.isArray(time_slots) && schoolId) {
      await db.execute({
        sql: "DELETE FROM time_slots WHERE school_id = ?",
        args: [schoolId],
      });
      for (const slot of time_slots) {
        const id = slot.id || `slot-${schoolId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fromDay = slot.from_day || "Thứ 2";
        const toDay = slot.to_day || "Thứ 7";
        const computedDays = fromDay === toDay ? fromDay : `${fromDay} – ${toDay}`;

        await db.execute({
          sql: `INSERT INTO time_slots (id, school_id, name, from_day, to_day, days, start_time, end_time, max_students, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
            schoolId,
            slot.name || "",
            fromDay,
            toDay,
            slot.days || computedDays,
            slot.start_time || "17:00",
            slot.end_time || "20:00",
            Number(slot.max_students) || 10,
            slot.is_active ? 1 : 0,
          ],
        });
      }
    }

    // 3. Save Level Surcharges (Cô lập tuyệt đối theo school_id)
    if (Array.isArray(level_surcharges) && schoolId) {
      await db.execute({
        sql: "DELETE FROM level_surcharges WHERE school_id = ?",
        args: [schoolId],
      });
      let sort = 1;
      for (const lvl of level_surcharges) {
        const id = lvl.id || `lvl-${schoolId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const stype = lvl.surcharge_type === "percent" ? "percent" : "fixed";
        await db.execute({
          sql: `INSERT INTO level_surcharges (id, school_id, level_name, surcharge_amount, surcharge_type, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)`,
          args: [id, schoolId, lvl.level_name || "Level mới", Number(lvl.surcharge_amount) || 0, stype, sort++],
        });
      }
    }

    // 4. Save Discount Presets (Cô lập tuyệt đối theo school_id)
    if (Array.isArray(discount_presets) && schoolId) {
      await db.execute({
        sql: "DELETE FROM discount_presets WHERE school_id = ?",
        args: [schoolId],
      });
      for (const disc of discount_presets) {
        const id = disc.id || `disc-${schoolId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const percent = Number(disc.percentage) || 0;
        await db.execute({
          sql: `INSERT INTO discount_presets (id, school_id, percentage, label) VALUES (?, ?, ?, ?)`,
          args: [id, schoolId, percent, disc.label || `${percent}%`],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cài đặt hệ thống đã được cập nhật thành công!",
    });
  } catch (error: unknown) {
    log.error("Settings POST Error:", { error: error });
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
