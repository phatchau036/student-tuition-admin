import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    // 1. Get Settings
    const settingsRes = await db.execute("SELECT key, value FROM settings");
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      settingsMap[String(row.key)] = String(row.value);
    }

    const baseTuition = Number(settingsMap["base_tuition"] || 0);
    const durationMode = (settingsMap["duration_mode"] as "by_hours" | "by_sessions") || "by_hours";
    const monthFormat = (settingsMap["month_format"] as "vietnamese" | "english" | "number") || "vietnamese";
    const defaultHours = Number(settingsMap["default_hours_per_week"] || 3);
    const defaultSessions = Number(settingsMap["default_sessions_per_week"] || 3);
    const defaultStudyTime = settingsMap["default_study_time"] || "18:00 - 19:00";
    const maxStudentsPerSlot = Number(settingsMap["max_students_per_slot"] || 10);
    const crowdedThresholdPercent = Number(settingsMap["crowded_threshold_percent"] || 80);

    // 2. Get Time Slots
    const timeSlotsRes = await db.execute("SELECT * FROM time_slots ORDER BY id ASC");
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

    // 3. Get Level Surcharges
    const levelRes = await db.execute("SELECT * FROM level_surcharges ORDER BY sort_order ASC, level_name ASC");
    const levelSurcharges = levelRes.rows.map((row) => ({
      id: String(row.id),
      level_name: String(row.level_name),
      surcharge_amount: Number(row.surcharge_amount),
      sort_order: Number(row.sort_order),
    }));

    // 4. Get Discount Presets
    const discountRes = await db.execute("SELECT * FROM discount_presets ORDER BY percentage ASC");
    const discountPresets = discountRes.rows.map((row) => ({
      id: String(row.id),
      percentage: Number(row.percentage),
      label: String(row.label),
    }));

    // 5. Get Schools
    const schoolsRes = await db.execute("SELECT * FROM schools ORDER BY created_at ASC");
    const schools = schoolsRes.rows.map((s) => ({
      id: String(s.id),
      name: String(s.name),
      code: String(s.code),
      address: String(s.address || ""),
      phone: String(s.phone || ""),
    }));

    return NextResponse.json({
      success: true,
      data: {
        schools: schools,
        current_school: schools[0] || null,
        base_tuition: baseTuition,
        duration_mode: durationMode,
        month_format: monthFormat,
        default_hours_per_week: defaultHours,
        default_sessions_per_week: defaultSessions,
        default_study_time: defaultStudyTime,
        max_students_per_slot: maxStudentsPerSlot,
        crowded_threshold_percent: crowdedThresholdPercent,
        time_slots: timeSlots,
        level_surcharges: levelSurcharges,
        discount_presets: discountPresets,
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
      month_format,
      default_hours_per_week,
      default_sessions_per_week,
      default_study_time,
      max_students_per_slot,
      crowded_threshold_percent,
      time_slots,
      level_surcharges,
      discount_presets,
    } = body;

    // 1. Update Settings Key-Values
    const keysToUpdate: Record<string, any> = {
      base_tuition: base_tuition !== undefined ? String(base_tuition) : undefined,
      duration_mode: duration_mode !== undefined ? String(duration_mode) : undefined,
      month_format: month_format !== undefined ? String(month_format) : undefined,
      default_hours_per_week: default_hours_per_week !== undefined ? String(default_hours_per_week) : undefined,
      default_sessions_per_week: default_sessions_per_week !== undefined ? String(default_sessions_per_week) : undefined,
      default_study_time: default_study_time !== undefined ? String(default_study_time) : undefined,
      max_students_per_slot: max_students_per_slot !== undefined ? String(max_students_per_slot) : undefined,
      crowded_threshold_percent: crowded_threshold_percent !== undefined ? String(crowded_threshold_percent) : undefined,
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
