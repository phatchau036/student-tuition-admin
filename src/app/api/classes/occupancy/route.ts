import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// Helper to determine Vietnamese day of week name from YYYY-MM-DD
function getDayNameVi(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0: CN, 1: T2, 2: T3, ...
  if (day === 0) return "Chủ Nhật";
  return `Thứ ${day + 1}`;
}

export async function GET(req: Request) {
  let dateStr = "";
  try {
    const { searchParams } = new URL(req.url);
    dateStr = searchParams.get("date") || "";
  } catch {
    return NextResponse.json({ success: true, data: { slots: [] } });
  }

  if (!dateStr) {
    return NextResponse.json({ success: true, data: { slots: [] } });
  }

  try {
    await initDb();
    const db = getDb();

    const dayName = getDayNameVi(dateStr); // e.g. "Thứ 2", "Thứ 7", "Chủ Nhật"

    // 1. Get settings for threshold & max capacity default & capacity_mode
    const settingsRes = await db.execute("SELECT key, value FROM settings");
    const settingsMap: Record<string, string> = {};
    for (const row of settingsRes.rows) {
      settingsMap[String(row.key)] = String(row.value);
    }
    const defaultMaxCapacity = Number(settingsMap["max_students_per_slot"] || 10);
    const thresholdPercent = Number(settingsMap["crowded_threshold_percent"] || 80);
    const capacityMode = settingsMap["capacity_mode"] || "by_slot"; // "by_slot" hoặc "by_teacher"

    // 2. Get active time slots
    const slotsRes = await db.execute("SELECT * FROM time_slots WHERE is_active = 1 ORDER BY start_time ASC");

    // 3. Get all teachers with their assigned slots and working shifts
    const teachersRes = await db.execute("SELECT * FROM teachers WHERE is_active = 1");

    // 4. Get all active students with their registered days, slot & teacher
    const studentsRes = await db.execute("SELECT id, name, time_slot_id, teacher_id, registered_days FROM students");

    // 5. Get all scheduled makeup classes on this date
    const makeupsRes = await db.execute({
      sql: "SELECT id, student_id, makeup_slot_id, makeup_teacher_id, makeup_time FROM makeup_classes WHERE makeup_date = ? AND status IN ('scheduled', 'completed')",
      args: [dateStr],
    });

    const slotsOccupancy = slotsRes.rows.map((slot) => {
      const slotId = String(slot.id);
      const slotDays = String(slot.days || "");

      // Check if this time slot operates on this day of week
      const isDaySupported = slotDays.includes(dayName) || slotDays.includes("T2 – T7") || slotDays.includes("Thứ 2 – Thứ 7") || slotDays.includes("Cả tuần");

      let slotMax = Number(slot.max_students || defaultMaxCapacity);

      // Nếu tính theo giáo viên: Tính tổng capacity của các giáo viên đứng lớp trong ca này
      if (capacityMode === "by_teacher") {
        let teacherCapacityTotal = 0;
        let teachersInThisSlotCount = 0;

        for (const tc of teachersRes.rows) {
          let assignedSlots: string[] = [];
          try {
            if (tc.assigned_slot_ids) {
              const parsed = JSON.parse(String(tc.assigned_slot_ids));
              if (Array.isArray(parsed)) assignedSlots = parsed;
            }
          } catch {}

          let shifts: any[] = [];
          try {
            if (tc.working_shifts_json) {
              const parsed = JSON.parse(String(tc.working_shifts_json));
              if (Array.isArray(parsed)) shifts = parsed;
            }
          } catch {}

          const slotStartTime = String(slot.start_time || "");
          const slotEndTime = String(slot.end_time || "");

          // Kiểm tra xem giáo viên có làm ca này vào ngày này không
          const worksOnThisDayAndSlot =
            (assignedSlots.includes(slotId) && isDaySupported) ||
            shifts.some(
              (s: any) =>
                s.day === dayName &&
                ((s.start_time >= slotStartTime && s.start_time < slotEndTime) ||
                  (s.end_time > slotStartTime && s.end_time <= slotEndTime))
            );

          if (worksOnThisDayAndSlot) {
            teachersInThisSlotCount++;
            teacherCapacityTotal += Number(tc.max_students || defaultMaxCapacity);
          }
        }

        if (teachersInThisSlotCount > 0) {
          slotMax = teacherCapacityTotal;
        }
      }

      // Count regular students who study on this slot AND this day
      let regularCount = 0;
      for (const st of studentsRes.rows) {
        if (String(st.time_slot_id) === slotId) {
          const regDays = String(st.registered_days || "");
          if (regDays.includes(dayName)) {
            regularCount++;
          }
        }
      }

      // Count makeups booked on this date and slot
      let makeupCount = 0;
      for (const mk of makeupsRes.rows) {
        if (mk.makeup_slot_id && String(mk.makeup_slot_id) === slotId) {
          makeupCount++;
        } else if (!mk.makeup_slot_id) {
          makeupCount++;
        }
      }

      const totalCount = regularCount + makeupCount;
      const occupancyRate = slotMax > 0 ? Math.round((totalCount / slotMax) * 100) : 0;
      const isFull = totalCount >= slotMax;
      const isCrowded = occupancyRate >= thresholdPercent && !isFull;

      return {
        slot_id: slotId,
        slot_name: String(slot.name),
        days: slotDays,
        start_time: String(slot.start_time),
        end_time: String(slot.end_time),
        time_range: `${slot.start_time} - ${slot.end_time}`,
        regular_count: regularCount,
        makeup_count: makeupCount,
        total_count: totalCount,
        max_capacity: slotMax,
        occupancy_rate: occupancyRate,
        is_crowded: isCrowded,
        is_full: isFull,
        is_day_supported: isDaySupported,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        day_name: dayName,
        threshold_percent: thresholdPercent,
        capacity_mode: capacityMode,
        slots: slotsOccupancy,
      },
    });
  } catch (error: unknown) {
    console.error("Occupancy GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
