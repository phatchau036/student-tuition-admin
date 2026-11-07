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
  if (!timeStr) return 0;
  const clean = timeStr.trim();
  if (clean.includes(":")) {
    const parts = clean.split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  }
  const match = clean.match(/(\d{1,2})(?:\s*h\s*(\d{2})?)/i);
  if (match) {
    const h = parseInt(match[1], 10) || 0;
    const m = parseInt(match[2] || "0", 10) || 0;
    return h * 60 + m;
  }
  const onlyNum = parseInt(clean, 10);
  if (!isNaN(onlyNum) && onlyNum >= 0 && onlyNum <= 24) {
    return onlyNum * 60;
  }
  return 0;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Kiểm tra 2 khoảng thời gian [s1, e1] và [s2, e2] có giao nhau không (time overlap)
 */
export function isTimeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  if (!s1 || !e1 || !s2 || !e2) return true;
  return s1 < e2 && s2 < e1;
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

/**
 * Chuẩn hóa tên Thứ trong tuần: "T3" -> "Thứ 3", "CN" -> "Chủ Nhật"
 */
export function normalizeDayOfWeek(d?: string): string {
  if (!d) return "";
  const s = d.trim().toLowerCase();
  if (s.includes("chủ nhật") || s === "cn") return "Chủ Nhật";
  if (s.includes("thứ 2") || s === "t2" || s === "2") return "Thứ 2";
  if (s.includes("thứ 3") || s === "t3" || s === "3") return "Thứ 3";
  if (s.includes("thứ 4") || s === "t4" || s === "4") return "Thứ 4";
  if (s.includes("thứ 5") || s === "t5" || s === "5") return "Thứ 5";
  if (s.includes("thứ 6") || s === "t6" || s === "6") return "Thứ 6";
  if (s.includes("thứ 7") || s === "t7" || s === "7" || s === "s7" || s === "c7") return "Thứ 7";
  return d.trim();
}

/**
 * Trích xuất khoảng thời gian (phút & chuỗi hiển thị) từ chuỗi văn bản bất kỳ
 * Hỗ trợ các định dạng: "18:00 - 19:30", "T3, T5, T7 (17h30-18h30)", "18h-19h30", "18h", "18:00"
 */
export function extractTimeRangeMinutes(str?: string): {
  startMin: number;
  endMin: number;
  startTime: string;
  endTime: string;
  display: string;
} {
  let sH = 18;
  let sM = 0;
  let eH = 19;
  let eM = 30;

  if (str) {
    const clean = str.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\b/gi, " ");
    const rangeMatch = clean.match(
      /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
    );

    if (rangeMatch) {
      const parsedSH = parseInt(rangeMatch[1], 10);
      const parsedSM = parseInt(rangeMatch[2] || rangeMatch[3] || "0", 10);
      let parsedEH = parseInt(rangeMatch[4], 10);
      const parsedEM = parseInt(rangeMatch[5] || rangeMatch[6] || "0", 10);
      if (!isNaN(parsedSH) && parsedSH >= 0 && parsedSH <= 23) {
        if (!isNaN(parsedEH) && parsedEH < parsedSH && parsedEH <= 5) parsedEH += 12;
        const validEH = !isNaN(parsedEH) ? parsedEH : parsedSH + 1;
        sH = parsedSH;
        sM = parsedSM;
        eH = validEH;
        eM = parsedEM;
      }
    } else {
      const singleMatch = clean.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
      if (singleMatch) {
        const parsedSH = parseInt(singleMatch[1], 10);
        const parsedSM = parseInt(singleMatch[2] || singleMatch[3] || "0", 10);
        if (!isNaN(parsedSH) && parsedSH >= 0 && parsedSH <= 23) {
          sH = parsedSH;
          sM = parsedSM;
          eH = parsedSH + 1;
          eM = parsedSM;
        }
      }
    }
  }

  const startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;
  if (endMin <= startMin) endMin = startMin + 60;
  const startTime = `${String(sH).padStart(2, "0")}:${String(sM).padStart(2, "0")}`;
  const endTime = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;

  return {
    startMin,
    endMin,
    startTime,
    endTime,
    display: `${startTime} - ${endTime}`,
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
  timeRangeDisplay?: string;
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
  sessionTimeStr: string; // VD: "18:00 - 19:30" hoặc "T3, T5, T7 (17h30-18h30)"
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

  // Phân tích mốc giờ bắt đầu và kết thúc của ca học ứng viên
  const candRange = extractTimeRangeMinutes(sessionTimeStr);
  const candStart = candRange.startMin;
  const candEnd = candRange.endMin;

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

  for (const rawDay of selectedDays) {
    const day = normalizeDayOfWeek(rawDay);
    const overlappingStudentsOnDay: Array<{ id: string; name: string; timeDetail?: string }> = [];

    for (const st of otherClassStudents) {
      let isOverlap = false;
      let matchedTimeDetail = "";

      // 1. Kiểm tra từ schedule_details_json (chính xác nhất)
      if (st.schedule_details_json) {
        try {
          const items = JSON.parse(st.schedule_details_json);
          if (Array.isArray(items) && items.length > 0) {
            const dayItem = items.find((it: any) => normalizeDayOfWeek(it.day) === day);
            if (dayItem && dayItem.start_time) {
              const itemRange = extractTimeRangeMinutes(`${dayItem.start_time} - ${dayItem.end_time || ""}`);
              if (Math.max(candStart, itemRange.startMin) < Math.min(candEnd, itemRange.endMin)) {
                isOverlap = true;
                matchedTimeDetail = itemRange.display;
              }
            }
          }
        } catch {}
      }

      // 2. Kiểm tra từ study_time_detail nếu chưa xác định được từ json
      if (!isOverlap && st.study_time_detail) {
        const raw = st.study_time_detail.trim();
        if (raw && !raw.toLowerCase().includes("linh hoạt")) {
          let clauses: string[] = [raw];
          if (/[|;]/.test(raw)) {
            clauses = raw.split(/[|;]+/).map((s) => s.trim()).filter(Boolean);
          } else if (/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/.test(raw)) {
            clauses = raw.split(/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/).map((s, idx, arr) => {
              let res = s.trim();
              if (idx < arr.length - 1 && !res.endsWith(")")) res += ")";
              return res;
            }).filter(Boolean);
          }

          for (const clause of clauses) {
            let clauseHasDay = false;
            if (/T2[-_ ]*4[-_ ]*6/i.test(clause) || /T2[,\s]*T?4[,\s]*T?6/i.test(clause)) {
              if (["Thứ 2", "Thứ 4", "Thứ 6"].includes(day)) clauseHasDay = true;
            } else if (/T3[-_ ]*5[-_ ]*7/i.test(clause) || /T3[,\s]*T?5[,\s]*T?7/i.test(clause)) {
              if (["Thứ 3", "Thứ 5", "Thứ 7"].includes(day)) clauseHasDay = true;
            } else if (/T2[-_ ]*4/i.test(clause) || /T2[,\s]*T?4\b/i.test(clause)) {
              if (["Thứ 2", "Thứ 4"].includes(day)) clauseHasDay = true;
            } else if (/T3[-_ ]*5/i.test(clause) || /T3[,\s]*T?5\b/i.test(clause)) {
              if (["Thứ 3", "Thứ 5"].includes(day)) clauseHasDay = true;
            } else {
              if (/(?:T2|Thứ\s*2)\b/i.test(clause) && day === "Thứ 2") clauseHasDay = true;
              if (/(?:T3|Thứ\s*3)\b/i.test(clause) && day === "Thứ 3") clauseHasDay = true;
              if (/(?:T4|Thứ\s*4)\b/i.test(clause) && day === "Thứ 4") clauseHasDay = true;
              if (/(?:T5|Thứ\s*5)\b/i.test(clause) && day === "Thứ 5") clauseHasDay = true;
              if (/(?:T6|Thứ\s*6)\b/i.test(clause) && day === "Thứ 6") clauseHasDay = true;
              if (/(?:T7|Thứ\s*7|S7|C7)\b/i.test(clause) && day === "Thứ 7") clauseHasDay = true;
              if (/(?:CN|Chủ\s*Nhật)\b/i.test(clause) && day === "Chủ Nhật") clauseHasDay = true;
            }

            // Nếu đoạn này không ghi rõ thứ thì kiểm tra xem học sinh có học ngày này trong registered_days không
            if (!clauseHasDay && !/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\b/i.test(clause)) {
              const reg = st.registered_days || "";
              const regDays = reg.split(/[,|;]+/).map((d) => normalizeDayOfWeek(d));
              if (regDays.includes(day)) {
                clauseHasDay = true;
              }
            }

            if (clauseHasDay) {
              const parsedClause = extractTimeRangeMinutes(clause);
              if (Math.max(candStart, parsedClause.startMin) < Math.min(candEnd, parsedClause.endMin)) {
                isOverlap = true;
                matchedTimeDetail = parsedClause.display;
                break;
              }
            }
          }
        }
      }

      // 3. Fallback: chỉ có registered_days
      if (!isOverlap && st.registered_days) {
        const regDays = st.registered_days.split(/[,|;]+/).map((d) => normalizeDayOfWeek(d));
        if (regDays.includes(day)) {
          // Mặc định ca mở 18:00 - 19:30 (hoặc cuối tuần 09:00 - 10:30)
          const isWeekend = day.includes("7") || day === "Chủ Nhật";
          const sMin = (isWeekend ? 9 : 18) * 60;
          const eMin = sMin + 90;
          if (Math.max(candStart, sMin) < Math.min(candEnd, eMin)) {
            isOverlap = true;
            matchedTimeDetail = isWeekend ? "09:00 - 10:30 (Ca chuẩn)" : "18:00 - 19:30 (Ca chuẩn)";
          }
        }
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
    timeRangeDisplay: candRange.display,
    dayDetails,
    warningMessage: warningMsg,
  };
}
