import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { isDayInSlot, parseStudentScheduleSlots } from "@/lib/tuition";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

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

    const schoolId = getSchoolIdFromRequest(req);

    // 2. Get active time slots for this school
    let slotsRes = await db.execute({
      sql: "SELECT * FROM time_slots WHERE is_active = 1 AND school_id = ? ORDER BY start_time ASC",
      args: [schoolId],
    });
    if (slotsRes.rows.length === 0) {
      slotsRes = await db.execute("SELECT * FROM time_slots WHERE is_active = 1 ORDER BY start_time ASC");
    }

    // 3. Get all teachers with their assigned slots and working shifts for this school
    const teachersRes = await db.execute({
      sql: "SELECT * FROM teachers WHERE is_active = 1 AND school_id = ?",
      args: [schoolId],
    });

    // 4. Get all active students with their registered days, slot & teacher for this school
    const studentsRes = await db.execute({
      sql: "SELECT id, name, time_slot_id, teacher_id, registered_days, study_time_detail, schedule_details_json, status FROM students WHERE school_id = ? AND status != 'dropped'",
      args: [schoolId],
    });

    // 5. Get all scheduled makeup classes on this date
    const makeupsRes = await db.execute({
      sql: `SELECT m.id, m.student_id, m.makeup_slot_id, m.makeup_teacher_id, m.makeup_time 
            FROM makeup_classes m
            JOIN students s ON m.student_id = s.id
            WHERE m.makeup_date = ? AND m.status IN ('scheduled', 'completed') AND s.school_id = ?`,
      args: [dateStr, schoolId],
    });

    const slotsOccupancy = slotsRes.rows.map((slot) => {
      const slotId = String(slot.id);
      const slotDays = String(slot.days || "");

      // Check if this time slot operates on this day of week using robust day-in-slot parser
      const isDaySupported = isDayInSlot(dayName, {
        days: slotDays,
        from_day: String(slot.from_day || ""),
        to_day: String(slot.to_day || ""),
      });

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
      const slotStartTime = String(slot.start_time || "17:00");
      const slotEndTime = String(slot.end_time || "20:00");
      const slotStartH = parseInt(slotStartTime.split(":")[0], 10) || 17;
      const slotEndH = parseInt(slotEndTime.split(":")[0], 10) || 20;

      for (const st of studentsRes.rows) {
        // Kiểm tra khớp trực tiếp qua time_slot_id
        if (String(st.time_slot_id) === slotId) {
          const regDays = String(st.registered_days || "");
          if (regDays.includes(dayName)) {
            regularCount++;
            continue;
          }
        }

        // Hoặc phân tích thông minh qua lịch học study_time_detail / schedule_details_json
        const parsedSlots = parseStudentScheduleSlots({
          schedule_details_json: String(st.schedule_details_json || "[]"),
          study_time_detail: String(st.study_time_detail || ""),
          registered_days: String(st.registered_days || ""),
        });

        const isStudyingInThisSlot = parsedSlots.some((ps) => {
          if (ps.day !== dayName) return false;
          const pHour = parseInt(ps.hourSlot.replace("h", ""), 10);
          return pHour >= slotStartH && pHour < slotEndH;
        });

        if (isStudyingInThisSlot) {
          regularCount++;
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
      const remainingSlots = Math.max(0, slotMax - totalCount);

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
        total_occupied: totalCount, // Đảm bảo trường total_occupied luôn có giá trị số
        remaining_slots: remainingSlots, // Số chỗ trống còn lại chính xác
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
