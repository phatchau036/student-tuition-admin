/**
 * Helper phát hiện giáo viên đứng ca và cảnh báo đổi ca khi học bù
 * Đáp ứng yêu cầu:
 * - Khi bé học vắt qua 2 ca của 2 GV (VD: 17:30 - 19:00 qua ca Cô Điệp 17h-18h và Thầy Phong 18h-20h),
 *   tự động cảnh báo: "Sẽ có 2 giáo viên đổi ca trong khung giờ này: bé sẽ học Cô Điệp và Thầy Phong"
 * - Khi chỉ có 1 giáo viên trong khung giờ chọn (VD: 18h - 19h30),
 *   không hiện cảnh báo đổi ca mà chỉ ghi nhận giáo viên phụ trách (Thầy Phong).
 */

export interface TeacherShiftItem {
  teacher_id: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  role?: string;
}

export interface ShiftTeacherOverlap {
  teacher_id: string;
  teacher_name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  time_label: string;
}

export interface ShiftDetectionResult {
  hasMultipleTeachers: boolean;
  overlappingTeachers: ShiftTeacherOverlap[];
  teacherNames: string[];
  singleTeacherName: string | null;
  alertMessage: string | null;
  infoMessage: string | null;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const DAYS_ORDER_MAP: Record<string, number> = {
  "Thứ 2": 1,
  "Thứ 3": 2,
  "Thứ 4": 3,
  "Thứ 5": 4,
  "Thứ 6": 5,
  "Thứ 7": 6,
  "Chủ Nhật": 7,
};

/**
 * Gộp các khung giờ mở cửa có cùng giờ thành dải gọn gàng
 * Ví dụ: Thứ 2 (17:00-20:00), Thứ 3 (17:00-20:00)... Thứ 7 (17:00-20:00)
 * -> "Thứ 2 – Thứ 7 (17:00 - 20:00)"
 */
export function formatScheduleCompact(scheduleItems: Array<{ day: string; start_time: string; end_time: string }>): string[] {
  if (!Array.isArray(scheduleItems) || scheduleItems.length === 0) return [];

  // Gom nhóm theo khung giờ: "17:00 - 20:00" -> ["Thứ 2", "Thứ 3", "Thứ 4", ...]
  const groups: Record<string, string[]> = {};
  for (const item of scheduleItems) {
    if (!item.day || !item.start_time || !item.end_time) continue;
    const timeKey = `${item.start_time} - ${item.end_time}`;
    if (!groups[timeKey]) groups[timeKey] = [];
    if (!groups[timeKey].includes(item.day)) {
      groups[timeKey].push(item.day);
    }
  }

  const results: string[] = [];

  for (const [timeRange, days] of Object.entries(groups)) {
    // Sắp xếp các thứ theo tuần
    days.sort((a, b) => (DAYS_ORDER_MAP[a] || 99) - (DAYS_ORDER_MAP[b] || 99));

    // Kiểm tra xem có phải chuỗi thứ liên tiếp không (VD: Thứ 2, Thứ 3, Thứ 4, Thứ 5, Thứ 6, Thứ 7)
    let isConsecutive = days.length >= 3;
    if (isConsecutive) {
      for (let i = 0; i < days.length - 1; i++) {
        const curr = DAYS_ORDER_MAP[days[i]];
        const next = DAYS_ORDER_MAP[days[i + 1]];
        if (!curr || !next || next !== curr + 1) {
          isConsecutive = false;
          break;
        }
      }
    }

    if (days.length === 7) {
      results.push(`Tất cả các ngày: ${timeRange}`);
    } else if (isConsecutive) {
      results.push(`${days[0]} – ${days[days.length - 1]}: ${timeRange}`);
    } else if (days.length === 3 && days[0] === "Thứ 2" && days[1] === "Thứ 4" && days[2] === "Thứ 6") {
      results.push(`Thứ 2, 4, 6: ${timeRange}`);
    } else if (days.length === 3 && days[0] === "Thứ 3" && days[1] === "Thứ 5" && days[2] === "Thứ 7") {
      results.push(`Thứ 3, 5, 7: ${timeRange}`);
    } else if (days.length === 2 && days[0] === "Thứ 7" && days[1] === "Chủ Nhật") {
      results.push(`Cuối tuần T7, CN: ${timeRange}`);
    } else {
      results.push(`${days.join(", ")}: ${timeRange}`);
    }
  }

  return results;
}

export function detectShiftTeachers(
  makeupStart: string,
  makeupEnd: string,
  shifts: TeacherShiftItem[]
): ShiftDetectionResult {
  if (!makeupStart || !makeupEnd || !Array.isArray(shifts) || shifts.length === 0) {
    return {
      hasMultipleTeachers: false,
      overlappingTeachers: [],
      teacherNames: [],
      singleTeacherName: null,
      alertMessage: null,
      infoMessage: null,
    };
  }

  const mStart = timeToMinutes(makeupStart);
  const mEnd = timeToMinutes(makeupEnd);

  if (mEnd <= mStart) {
    return {
      hasMultipleTeachers: false,
      overlappingTeachers: [],
      teacherNames: [],
      singleTeacherName: null,
      alertMessage: null,
      infoMessage: null,
    };
  }

  const overlaps: ShiftTeacherOverlap[] = [];

  for (const shift of shifts) {
    const sStart = timeToMinutes(shift.start_time);
    const sEnd = timeToMinutes(shift.end_time);

    // Tính khoảng giao nhau giữa ca bù [mStart, mEnd] và ca giáo viên [sStart, sEnd]
    const overlapStart = Math.max(mStart, sStart);
    const overlapEnd = Math.min(mEnd, sEnd);

    if (overlapEnd > overlapStart) {
      const dur = overlapEnd - overlapStart;
      const tStartStr = minutesToTime(overlapStart);
      const tEndStr = minutesToTime(overlapEnd);

      overlaps.push({
        teacher_id: shift.teacher_id,
        teacher_name: shift.teacher_name || "Giáo viên",
        start_time: tStartStr,
        end_time: tEndStr,
        duration_minutes: dur,
        time_label: `${tStartStr} - ${tEndStr}`,
      });
    }
  }

  // Sắp xếp các ca giao theo thứ tự thời gian bắt đầu
  overlaps.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  // Lọc danh sách tên giáo viên duy nhất
  const uniqueTeacherMap = new Map<string, ShiftTeacherOverlap>();
  for (const item of overlaps) {
    if (!uniqueTeacherMap.has(item.teacher_id)) {
      uniqueTeacherMap.set(item.teacher_id, item);
    }
  }

  const uniqueTeachers = Array.from(uniqueTeacherMap.values());
  const teacherNames = uniqueTeachers.map((t) => t.teacher_name);

  if (uniqueTeachers.length >= 2) {
    // Có từ 2 giáo viên đổi ca
    const segmentsDesc = overlaps
      .map((ov) => `${ov.teacher_name} (${ov.time_label})`)
      .join(" và ");

    const namesText = teacherNames.join(" và ");

    return {
      hasMultipleTeachers: true,
      overlappingTeachers: overlaps,
      teacherNames,
      singleTeacherName: null,
      alertMessage: `Sẽ có 2 giáo viên đổi ca trong khung giờ này: bé sẽ học ${segmentsDesc}.`,
      infoMessage: `Bé sẽ được hướng dẫn bởi ${namesText}.`,
    };
  } else if (uniqueTeachers.length === 1) {
    // Chỉ có 1 giáo viên phụ trách trọn ca
    const singleName = uniqueTeachers[0].teacher_name;
    return {
      hasMultipleTeachers: false,
      overlappingTeachers: overlaps,
      teacherNames: [singleName],
      singleTeacherName: singleName,
      alertMessage: null,
      infoMessage: `Lớp do ${singleName} phụ trách (${makeupStart} - ${makeupEnd}).`,
    };
  }

  return {
    hasMultipleTeachers: false,
    overlappingTeachers: [],
    teacherNames: [],
    singleTeacherName: null,
    alertMessage: null,
    infoMessage: null,
  };
}

export interface DayCapacityDetail {
  day: string;
  occupiedCount: number;
  maxCapacity: number;
  remainingSlots: number;
  isOverCapacity: boolean;
  overlappingStudents: Array<{ id: string; name: string; timeDetail?: string }>;
}

export interface ClassCapacityCheckResult {
  maxCapacity: number;
  peakOccupiedCount: number;
  isOverCapacity: boolean;
  dayDetails: DayCapacityDetail[];
  warningMessage: string | null;
}

/**
 * Kiểm tra sĩ số thực tế của lớp theo khung giờ và các ngày học được chọn
 * Trả về chi tiết từng ngày và cảnh báo nếu có ngày/giờ bị quá tải sĩ số
 */
export function checkClassCapacityForSchedule(params: {
  selectedClassId: string;
  selectedDays: string[];
  sessionTimeStr: string; // VD: "18:00 - 19:30" hoặc "17:30 - 19:00"
  classes: Array<{ id: string; name: string; max_students?: number }>;
  allStudents: Array<{
    id: string;
    name: string;
    class_id?: string;
    status?: string;
    registered_days?: string;
    study_time_detail?: string;
    schedule_details_json?: string;
  }>;
  excludeStudentId?: string; // Không tính học sinh đang chỉnh sửa
}): ClassCapacityCheckResult {
  const { selectedClassId, selectedDays, sessionTimeStr, classes, allStudents, excludeStudentId } = params;

  const targetClass = classes.find((c) => c.id === selectedClassId);
  const maxCapacity = targetClass?.max_students && targetClass.max_students > 0 ? targetClass.max_students : 10;

  if (!selectedClassId || !Array.isArray(selectedDays) || selectedDays.length === 0) {
    return {
      maxCapacity,
      peakOccupiedCount: 0,
      isOverCapacity: false,
      dayDetails: [],
      warningMessage: null,
    };
  }

  // Phân tích mốc giờ bắt đầu và kết thúc của ca học đang chọn
  let candStart = 18 * 60; // 18:00
  let candEnd = 19 * 60 + 30; // 19:30
  if (sessionTimeStr && sessionTimeStr.includes("-")) {
    const parts = sessionTimeStr.split("-").map((s) => s.trim());
    if (parts[0]) candStart = timeToMinutes(parts[0]);
    if (parts[1]) candEnd = timeToMinutes(parts[1]);
  }
  if (candEnd <= candStart) {
    candEnd = candStart + 90; // Mặc định 1.5h
  }

  // Lọc các học sinh khác trong cùng lớp (bỏ qua học sinh đã nghỉ học 'dropped' và chính học sinh đang sửa)
  const otherClassStudents = allStudents.filter(
    (s) =>
      s.class_id === selectedClassId &&
      s.id !== excludeStudentId &&
      s.status !== "dropped"
  );

  const dayDetails: DayCapacityDetail[] = [];
  let peakOccupied = 0;
  let hasOverload = false;
  const overloadedDays: string[] = [];

  for (const day of selectedDays) {
    const overlappingStudentsOnDay: Array<{ id: string; name: string; timeDetail?: string }> = [];

    for (const st of otherClassStudents) {
      let isOverlap = false;
      let matchedTimeDetail = "";

      // 1. Kiểm tra từ schedule_details_json
      if (st.schedule_details_json) {
        try {
          const items = JSON.parse(st.schedule_details_json);
          if (Array.isArray(items) && items.length > 0) {
            const dayItem = items.find((it: any) => it.day === day);
            if (dayItem && dayItem.start_time) {
              const sStart = timeToMinutes(dayItem.start_time);
              const sEnd = dayItem.end_time ? timeToMinutes(dayItem.end_time) : sStart + 90;
              if (Math.max(candStart, sStart) < Math.min(candEnd, sEnd)) {
                isOverlap = true;
                matchedTimeDetail = `${dayItem.start_time} - ${dayItem.end_time || ""}`;
              }
            }
          }
        } catch {}
      }

      // 2. Kiểm tra từ study_time_detail nếu chưa xác định được từ json
      if (!isOverlap && st.study_time_detail) {
        const raw = st.study_time_detail;
        if (raw.includes(day) || !raw.includes("Thứ")) {
          // Khớp giờ học trong ngày
          const rangeMatch = raw.match(
            /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
          );
          if (rangeMatch) {
            const sH = parseInt(rangeMatch[1], 10);
            const sM = parseInt(rangeMatch[2] || rangeMatch[3] || "0", 10);
            let eH = parseInt(rangeMatch[4], 10);
            const eM = parseInt(rangeMatch[5] || rangeMatch[6] || "0", 10);
            if (eH < sH && eH <= 5) eH += 12;
            const sStart = sH * 60 + sM;
            const sEnd = eH * 60 + eM;
            if (Math.max(candStart, sStart) < Math.min(candEnd, sEnd)) {
              isOverlap = true;
              matchedTimeDetail = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")} - ${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;
            }
          } else if (st.registered_days && st.registered_days.includes(day)) {
            // Có đăng ký ngày này nhưng không ghi rõ giờ => tính là học cùng ca
            isOverlap = true;
            matchedTimeDetail = "Giờ chuẩn";
          }
        }
      } else if (!isOverlap && st.registered_days && st.registered_days.includes(day)) {
        // Chỉ có registered_days
        isOverlap = true;
        matchedTimeDetail = "Theo ca mở";
      }

      if (isOverlap) {
        overlappingStudentsOnDay.push({
          id: st.id,
          name: st.name,
          timeDetail: matchedTimeDetail,
        });
      }
    }

    const count = overlappingStudentsOnDay.length;
    if (count > peakOccupied) {
      peakOccupied = count;
    }

    // Nếu số học sinh hiện tại đã bằng hoặc vượt quá sĩ số tối đa của lớp
    // thì thêm 1 học sinh này vào sẽ bị quá tải!
    const isOver = count >= maxCapacity;
    if (isOver) {
      hasOverload = true;
      overloadedDays.push(`${day} (${count}/${maxCapacity} HS)`);
    }

    dayDetails.push({
      day,
      occupiedCount: count,
      maxCapacity,
      remainingSlots: Math.max(0, maxCapacity - count),
      isOverCapacity: isOver,
      overlappingStudents: overlappingStudentsOnDay,
    });
  }

  let warningMsg: string | null = null;
  if (hasOverload) {
    warningMsg = `Ca học này đã đầy sĩ số vào: ${overloadedDays.join(", ")}. Sĩ số tối đa của lớp là ${maxCapacity} học sinh/ca!`;
  }

  return {
    maxCapacity,
    peakOccupiedCount: peakOccupied,
    isOverCapacity: hasOverload,
    dayDetails,
    warningMessage: warningMsg,
  };
}
