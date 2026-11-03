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
