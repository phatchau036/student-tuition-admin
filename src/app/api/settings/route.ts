import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";
import { SchedulePreset } from "@/lib/types";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const schoolId = getSchoolIdFromRequest(req);

    // 1. Get Settings
    const settingsRes = await db.execute("SELECT key, value FROM settings");
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      settingsMap[String(row.key)] = String(row.value);
    }

    let baseTuition = Number(settingsMap["base_tuition"] || 0);
    if (baseTuition <= 0) {
      const defaultPkgRes = await db.execute("SELECT amount FROM tuition_packages WHERE cycle_unit = 'month' AND cycle_value = 1 LIMIT 1");
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
    const zaloBotToken = settingsMap["zalo_bot_token"] || "";
    const zaloBotName = settingsMap["zalo_bot_name"] || "";
    const zaloOaSecretKey = settingsMap["zalo_oa_secret_key"] || "";
    const zaloAccessToken = settingsMap["zalo_access_token"] || "";
    const zaloTemplateId = settingsMap["zalo_template_id"] || "";

    // SePay Webhook Settings
    const sepayApiKey = settingsMap["sepay_api_key"] || "";
    const sepayAccountNumber = settingsMap["sepay_account_number"] || "";
    const sepayBankName = settingsMap["sepay_bank_name"] || "";
    const sepayPrefix = settingsMap["sepay_prefix"] || "HP";

    // Schedule Presets (Kiểu lịch học cơ sở)
    let schedulePresets: SchedulePreset[] = [
      { id: "preset-even", name: "Thứ chẵn (2-4-6)", days: ["Thứ 2", "Thứ 4", "Thứ 6"], hours_per_session: 1.5, default_start_time: "18:00", is_default: true },
      { id: "preset-odd", name: "Thứ lẻ (3-5-7)", days: ["Thứ 3", "Thứ 5", "Thứ 7"], hours_per_session: 1.5, default_start_time: "18:00", is_default: false },
      { id: "preset-weekend", name: "Cuối tuần (T7-CN)", days: ["Thứ 7", "Chủ Nhật"], hours_per_session: 2.0, default_start_time: "09:00", is_default: false },
    ];
    if (settingsMap["schedule_presets"]) {
      try {
        const parsed = JSON.parse(settingsMap["schedule_presets"]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          schedulePresets = parsed;
        }
      } catch {}
    }

    // 2. Get Time Slots for this school
    let timeSlotsRes = await db.execute({
      sql: "SELECT * FROM time_slots WHERE school_id = ? ORDER BY id ASC",
      args: [schoolId],
    });
    if (timeSlotsRes.rows.length === 0) {
      timeSlotsRes = await db.execute("SELECT * FROM time_slots ORDER BY id ASC");
    }
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

    // 3. Get Level Surcharges for this school
    let levelRes = await db.execute({
      sql: "SELECT * FROM level_surcharges WHERE school_id = ? ORDER BY sort_order ASC, level_name ASC",
      args: [schoolId],
    });
    if (levelRes.rows.length === 0) {
      levelRes = await db.execute("SELECT * FROM level_surcharges ORDER BY sort_order ASC, level_name ASC");
    }
    const levelSurcharges = levelRes.rows.map((row) => ({
      id: String(row.id),
      level_name: String(row.level_name),
      surcharge_amount: Number(row.surcharge_amount),
      sort_order: Number(row.sort_order),
    }));

    // 4. Get Discount Presets for this school
    let discountRes = await db.execute({
      sql: "SELECT * FROM discount_presets WHERE school_id = ? ORDER BY percentage ASC",
      args: [schoolId],
    });
    if (discountRes.rows.length === 0) {
      discountRes = await db.execute("SELECT * FROM discount_presets ORDER BY percentage ASC");
    }
    const discountPresets = discountRes.rows.map((row) => ({
      id: String(row.id),
      percentage: Number(row.percentage),
      label: String(row.label),
    }));

    // 4.1 Get Tuition Packages for this school
    let packagesRes = await db.execute({
      sql: "SELECT * FROM tuition_packages WHERE school_id = ? ORDER BY cycle_value ASC, amount ASC",
      args: [schoolId],
    });
    if (packagesRes.rows.length === 0) {
      packagesRes = await db.execute("SELECT * FROM tuition_packages ORDER BY cycle_value ASC, amount ASC");
    }
    const tuitionPackages = packagesRes.rows.map((row) => ({
      id: String(row.id),
      school_id: String(row.school_id || schoolId),
      name: String(row.name),
      amount: Number(row.amount),
      original_amount: Number(row.original_amount || row.amount),
      cycle_unit: String(row.cycle_unit) as "month" | "week",
      cycle_value: Number(row.cycle_value),
      discount_type: (row.discount_type as "none" | "percent" | "amount") || "none",
      discount_value: Number(row.discount_value || 0),
      benefits: String(row.benefits || ""),
      is_active: Number(row.is_active),
      created_at: String(row.created_at || ""),
    }));

    // 4.2 Get Subjects for this school
    let subjectsRes = await db.execute({
      sql: "SELECT * FROM subjects WHERE school_id = ? ORDER BY created_at ASC",
      args: [schoolId],
    });
    if (subjectsRes.rows.length === 0) {
      subjectsRes = await db.execute("SELECT * FROM subjects ORDER BY created_at ASC");
    }
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
        base_tuition: baseTuition,
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
        zalo_bot_token: zaloBotToken,
        zalo_bot_name: zaloBotName,
        zalo_oa_secret_key: zaloOaSecretKey,
        zalo_access_token: zaloAccessToken,
        zalo_template_id: zaloTemplateId,
        sepay_api_key: sepayApiKey,
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
    console.error("Settings GET Error:", error);
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

    // 1. Update Settings Key-Values
    const keysToUpdate: Record<string, any> = {
      base_tuition: base_tuition !== undefined ? String(base_tuition) : undefined,
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
      sepay_api_key: sepay_api_key !== undefined ? String(sepay_api_key).trim() : undefined,
      sepay_account_number: sepay_account_number !== undefined ? String(sepay_account_number).trim() : undefined,
      sepay_bank_name: sepay_bank_name !== undefined ? String(sepay_bank_name).trim() : undefined,
      sepay_prefix: sepay_prefix !== undefined ? String(sepay_prefix).trim().toUpperCase() : undefined,
      zalo_reminder_mode: zalo_reminder_mode !== undefined ? String(zalo_reminder_mode) : undefined,
      zalo_bot_token: zalo_bot_token !== undefined ? String(zalo_bot_token) : undefined,
      zalo_bot_name: zalo_bot_name !== undefined ? String(zalo_bot_name) : undefined,
      zalo_oa_secret_key: zalo_oa_secret_key !== undefined ? String(zalo_oa_secret_key) : undefined,
      zalo_access_token: zalo_access_token !== undefined ? String(zalo_access_token) : undefined,
      zalo_template_id: zalo_template_id !== undefined ? String(zalo_template_id) : undefined,
      schedule_presets:
        schedule_presets !== undefined
          ? JSON.stringify(
              Array.isArray(schedule_presets)
                ? schedule_presets.map((p: any, idx: number) => ({
                    id: String(p.id || `preset-${Date.now()}-${idx}`),
                    name: String(p.name || `Kiểu lịch ${idx + 1}`).trim(),
                    days: Array.isArray(p.days)
                      ? p.days.map((d: any) => String(d).trim()).filter(Boolean)
                      : ["Thứ 2", "Thứ 4", "Thứ 6"],
                    hours_per_session: Number(p.hours_per_session) > 0 ? Number(p.hours_per_session) : 1.5,
                    default_start_time: p.default_start_time ? String(p.default_start_time).trim() : "18:00",
                    is_default: Boolean(p.is_default),
                  }))
                : []
            )
          : undefined,
    };

    for (const [key, val] of Object.entries(keysToUpdate)) {
      if (val !== undefined) {
        await db.execute({
          sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
          args: [key, val, val],
        });
      }
    }

    // 2. Save Time Slots
    if (Array.isArray(time_slots)) {
      await db.execute("DELETE FROM time_slots");
      for (const slot of time_slots) {
        const id = slot.id || `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const fromDay = slot.from_day || "Thứ 2";
        const toDay = slot.to_day || "Thứ 7";
        const computedDays = fromDay === toDay ? fromDay : `${fromDay} – ${toDay}`;

        await db.execute({
          sql: `INSERT INTO time_slots (id, name, from_day, to_day, days, start_time, end_time, max_students, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id,
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

    // 3. Save Level Surcharges
    if (Array.isArray(level_surcharges)) {
      await db.execute("DELETE FROM level_surcharges");
      let sort = 1;
      for (const lvl of level_surcharges) {
        const id = lvl.id || `lvl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await db.execute({
          sql: `INSERT INTO level_surcharges (id, level_name, surcharge_amount, sort_order)
                VALUES (?, ?, ?, ?)`,
          args: [id, lvl.level_name || "Level mới", Number(lvl.surcharge_amount) || 0, sort++],
        });
      }
    }

    // 4. Save Discount Presets
    if (Array.isArray(discount_presets)) {
      await db.execute("DELETE FROM discount_presets");
      for (const disc of discount_presets) {
        const id = disc.id || `disc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const percent = Number(disc.percentage) || 0;
        await db.execute({
          sql: `INSERT INTO discount_presets (id, percentage, label) VALUES (?, ?, ?)`,
          args: [id, percent, disc.label || `${percent}%`],
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cài đặt hệ thống đã được cập nhật thành công!",
    });
  } catch (error: unknown) {
    console.error("Settings POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
