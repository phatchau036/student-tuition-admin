import { MonthFormat } from "./types";

export function formatVND(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "0 đ";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  })
    .format(num)
    .replace("₫", "đ");
}

/* =========================================================================
 * VÍ GIỜ HỌC (HOUR WALLET) — Công thức cấp giờ theo chu kỳ tháng
 * ========================================================================= */

const DAY_MS = 86400000;
// weekdays: 2..7 = Thứ 2..Thứ 7, 8 = Chủ Nhật. Ngày xử lý theo UTC 00:00 để tránh lệch múi giờ.
function weekdayOf(d: Date): number {
  return d.getUTCDay() === 0 ? 8 : d.getUTCDay() + 1;
}

export interface CycleGrantResult {
  days: number;           // Số ngày của chu kỳ (28..31)
  fullWeeks: number;      // Số tuần đủ
  leftoverDays: number;   // Số ngày lẻ cuối tháng
  sessions: number;       // Số buổi học thực tế rơi vào chu kỳ (đã trừ ngày nghỉ lễ)
  minutes: number;        // Tổng số phút được cấp vào ví
}

export function calcCycleGrant(p: {
  start: Date;                    // 00:00 UTC ngày bắt đầu chu kỳ (bắt đầu tháng hoặc ngày vào học giữa tháng)
  endExclusive: Date;             // 00:00 UTC ngày kết thúc KHÔNG bao gồm (ngày 1 tháng sau)
  weekdays: number[];             // Mảng thứ học, không trùng lặp (VD: [2,4,6])
  minutesPerSession: number;      // ⭐ "1 buổi = bao nhiêu phút" của em học sinh này
  closedDates?: string[];         // Danh sách ngày trung tâm nghỉ 'YYYY-MM-DD'
}): CycleGrantResult {
  const N = Math.round((p.endExclusive.getTime() - p.start.getTime()) / DAY_MS);
  const fullWeeks = Math.floor(N / 7);
  const leftover = N % 7;

  let sessions = fullWeeks * p.weekdays.length;
  // Ngày lẻ là các ngày liên tiếp bắt đầu từ start + fullWeeks*7 (nghĩa là cuối tháng)
  for (let i = 0; i < leftover; i++) {
    const d = new Date(p.start.getTime() + (fullWeeks * 7 + i) * DAY_MS);
    if (p.weekdays.includes(weekdayOf(d))) sessions++;
  }

  // Trừ các ngày trung tâm nghỉ rơi vào thứ học của em
  for (const iso of p.closedDates ?? []) {
    const d = new Date(iso + "T00:00:00Z");
    if (!isNaN(d.getTime()) && d >= p.start && d < p.endExclusive && p.weekdays.includes(weekdayOf(d))) {
      sessions = Math.max(0, sessions - 1);
    }
  }

  return {
    days: N,
    fullWeeks,
    leftoverDays: leftover,
    sessions: Math.max(0, sessions),
    minutes: Math.max(0, sessions) * p.minutesPerSession,
  };
}

// Hiển thị số phút dạng "7h30" (450 -> "7h30", 60 -> "1h", -30 -> "-30 phút")
export function formatMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalMinutes));
  if (abs === 0) return "0 phút";
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} phút`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

// Chuyển chuỗi thứ "Thứ 2, Thứ 4, Chủ Nhật" -> [2, 4, 8]
export function parseRegisteredDaysToWeekdays(registeredDays: string): number[] {
  const result: number[] = [];
  const trimmed = (registeredDays || "").trim();
  if (!trimmed) return result;
  if (/T2[-_ ]*4[-_ ]*6/i.test(trimmed)) return [2, 4, 6];
  if (/T3[-_ ]*5[-_ ]*7/i.test(trimmed)) return [3, 5, 7];
  for (const [dayName, num] of Object.entries(DAY_ORDER)) {
    if (trimmed.includes(dayName) && !result.includes(num)) result.push(num);
  }
  return result.sort((a, b) => a - b);
}

export interface TuitionBreakdown {
  baseAmount: number;
  baseLabel: string;
  levelSurcharge: number;
  levelName?: string;
  subtotal: number;
  isDiscountEnabled: boolean;
  discountPercent: number;
  discountAmount: number;
  finalTuition: number;
  formulaText: string;
}

/**
 * Tính toán học phí chuẩn xác bao gồm:
 * - Học phí gốc (từ Gói học phí HOẶC Mức học phí cơ bản)
 * - CỘNG Phụ thu Level / Trình độ (nếu có)
 * - TRỪ Chiết khấu / Giảm giá theo % (nếu bật)
 */
export function calculateStudentTuition(params: {
  packageAmount?: number | null;
  packageName?: string | null;
  baseTuition?: number | null;
  levelSurcharge?: number | null;
  levelName?: string | null;
  isDiscountEnabled?: boolean | number | null;
  discountPercent?: number | null;
}): TuitionBreakdown {
  const pkgAmount = Number(params.packageAmount) || 0;
  const base = pkgAmount > 0 ? pkgAmount : Number(params.baseTuition) || 0;
  const baseLabel = pkgAmount > 0 ? (params.packageName || "Gói học phí") : "Học phí cơ bản";
  const surcharge = Number(params.levelSurcharge) || 0;
  const subtotal = base + surcharge;
  const hasDiscount = Boolean(Number(params.isDiscountEnabled)) && Number(params.discountPercent || 0) > 0;
  const discountPercent = hasDiscount ? Number(params.discountPercent || 0) : 0;
  const discountMultiplier = Math.max(0, 1 - discountPercent / 100);
  const finalTuition = Math.round(subtotal * discountMultiplier);
  const discountAmount = subtotal - finalTuition;

  // Xây dựng chuỗi công thức diễn giải: ví dụ "1.000.000 đ (Gói 1 tháng) + 200.000 đ (Grade 7)"
  const parts: string[] = [];
  if (base > 0) {
    parts.push(`${formatVND(base)} (${baseLabel})`);
  } else {
    parts.push(`0 đ`);
  }
  if (surcharge > 0) {
    parts.push(`+ ${formatVND(surcharge)} (${params.levelName ? `Level ${params.levelName}` : "Phụ thu level"})`);
  }
  if (hasDiscount) {
    parts.push(`- ${discountPercent}% (${formatVND(discountAmount)})`);
  }

  return {
    baseAmount: base,
    baseLabel,
    levelSurcharge: surcharge,
    levelName: params.levelName || undefined,
    subtotal,
    isDiscountEnabled: hasDiscount,
    discountPercent,
    discountAmount,
    finalTuition,
    formulaText: parts.join(" "),
  };
}

export function calculateStandardTuition(
  baseTuition: number,
  levelSurcharge: number,
  isDiscountEnabled: boolean | number,
  discountPercent: number
): number {
  const base = Number(baseTuition) || 0;
  const surcharge = Number(levelSurcharge) || 0;
  return applyDiscount(base + surcharge, isDiscountEnabled, discountPercent);
}

export function applyDiscount(
  amount: number,
  isDiscountEnabled: boolean | number,
  discountPercent: number
): number {
  const raw = Number(amount) || 0;
  const hasDiscount = Boolean(Number(isDiscountEnabled));
  const discount = hasDiscount ? Number(discountPercent) || 0 : 0;
  const discountMultiplier = Math.max(0, 1 - discount / 100);
  return Math.round(raw * discountMultiplier);
}

export function getPreviousMonthStr(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return "";
  const [yearStr, monthStrPart] = monthStr.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStrPart, 10);
  m -= 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function getNextMonthStr(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return "";
  const [yearStr, monthStrPart] = monthStr.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStrPart, 10);
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthDisplay(monthStr: string, format: MonthFormat = "vietnamese"): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const monthNum = parseInt(month, 10);

  if (format === "english") {
    const monthName = !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? ENGLISH_MONTHS[monthNum - 1] : month;
    return `${monthName} ${year}`;
  }

  if (format === "chinese") {
    return `${year}年${monthNum}月`;
  }

  if (format === "japanese") {
    return `${year}年${monthNum}月度`;
  }

  if (format === "number") {
    return `${month}/${year}`;
  }

  // Mặc định: vietnamese
  return `Tháng ${month}/${year}`;
}

const DAY_ORDER: Record<string, number> = {
  "Thứ 2": 2,
  "Thứ 3": 3,
  "Thứ 4": 4,
  "Thứ 5": 5,
  "Thứ 6": 6,
  "Thứ 7": 7,
  "Chủ Nhật": 8,
};

export function isDayInSlot(day: string, slot: { from_day?: string; to_day?: string; days?: string }): boolean {
  if (!day) return false;
  // If slot specifies exact days string containing this day
  if (slot.days && slot.days.includes(day)) return true;

  const targetOrder = DAY_ORDER[day];
  if (!targetOrder) return false;

  const fromOrder = slot.from_day ? DAY_ORDER[slot.from_day] || 2 : 2;
  const toOrder = slot.to_day ? DAY_ORDER[slot.to_day] || 7 : 7;

  if (fromOrder <= toOrder) {
    return targetOrder >= fromOrder && targetOrder <= toOrder;
  } else {
    // Cross Sunday (e.g. Thứ 7 to Thứ 2)
    return targetOrder >= fromOrder || targetOrder <= toOrder;
  }
}

export function formatTimeSlotLabel(slot: {
  name?: string;
  from_day?: string;
  to_day?: string;
  days?: string;
  start_time?: string;
  end_time?: string;
}): string {
  const time =
    slot.start_time && slot.end_time ? `${slot.start_time} - ${slot.end_time}` : (slot.start_time || slot.end_time || "");
  const days =
    slot.days ||
    (slot.from_day && slot.to_day
      ? slot.from_day === slot.to_day
        ? slot.from_day
        : `${slot.from_day} – ${slot.to_day}`
      : "");

  let rawName = (slot.name || "").trim();
  // Strip redundant text like "Khung giờ mở cửa mới", "Khung giờ mở cửa", "Khung giờ mới"
  let cleanName = rawName
    .replace(/^khung\s*giờ\s*(?:mở\s*cửa)?\s*(?:mới)?\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();

  const lower = cleanName.toLowerCase();
  const isGeneric = !cleanName || lower === "mở cửa" || lower.startsWith("ca");

  if (time && days) {
    if (!cleanName || isGeneric) {
      return `${time} (${days})`;
    }
    return `${cleanName} (${time} • ${days})`;
  }
  if (time) {
    return cleanName && !isGeneric ? `${cleanName} (${time})` : time;
  }
  if (days) {
    return cleanName && !isGeneric ? `${cleanName} (${days})` : days;
  }
  return cleanName || rawName || "Ca mở cửa";
}

// Convert "HH:MM" to total minutes
export function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert total minutes to "HH:MM" 24h
export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Check if a study interval [start_time, end_time] is inside an operating slot
export function isTimeRangeWithinSlot(
  start_time: string,
  end_time: string,
  slot: { start_time: string; end_time: string }
): boolean {
  const s = timeToMinutes(start_time);
  const e = timeToMinutes(end_time);
  const slotS = timeToMinutes(slot.start_time);
  const slotE = timeToMinutes(slot.end_time);

  return s >= slotS && e <= slotE && e > s;
}

// Generate valid 24h intervals for a given day based on active slots that cover this day
export function getSlotsForDay(
  day: string,
  slots: Array<{
    id: string;
    name?: string;
    from_day?: string;
    to_day?: string;
    days?: string;
    start_time: string;
    end_time: string;
    is_active?: number;
  }>
) {
  return slots.filter((slot) => {
    if (slot.is_active === 0) return false;
    return isDayInSlot(day, slot);
  });
}

// Get available start time options (24h) for a specific day based on operating slots
export function getDayStartTimes(
  day: string,
  slots: Array<{
    id: string;
    name?: string;
    from_day?: string;
    to_day?: string;
    days?: string;
    start_time: string;
    end_time: string;
    is_active?: number;
  }>,
  stepMinutes: number = 30
): string[] {
  const daySlots = getSlotsForDay(day, slots);
  if (daySlots.length === 0) {
    // Fallback: 07:00 to 21:00
    const list: string[] = [];
    for (let m = 7 * 60; m <= 21 * 60; m += stepMinutes) list.push(minutesToTime(m));
    return list;
  }
  const times = new Set<string>();
  daySlots.forEach((slot) => {
    const sMin = timeToMinutes(slot.start_time);
    const eMin = timeToMinutes(slot.end_time);
    for (let m = sMin; m < eMin; m += stepMinutes) {
      times.add(minutesToTime(m));
    }
  });
  return Array.from(times).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

// Get available end time options (24h) given a start time and operating slots for that day
export function getDayEndTimes(
  day: string,
  startTime: string,
  slots: Array<{
    id: string;
    name?: string;
    from_day?: string;
    to_day?: string;
    days?: string;
    start_time: string;
    end_time: string;
    is_active?: number;
  }>,
  stepMinutes: number = 30
): string[] {
  const daySlots = getSlotsForDay(day, slots);
  const sMin = timeToMinutes(startTime);
  if (daySlots.length === 0) {
    const list: string[] = [];
    for (let m = sMin + stepMinutes; m <= Math.min(23 * 60, sMin + 4 * 60); m += stepMinutes) {
      list.push(minutesToTime(m));
    }
    return list;
  }
  const covering = daySlots.filter(
    (s) => sMin >= timeToMinutes(s.start_time) && sMin < timeToMinutes(s.end_time)
  );
  const targetSlots = covering.length > 0 ? covering : daySlots;
  const times = new Set<string>();
  targetSlots.forEach((slot) => {
    const end = timeToMinutes(slot.end_time);
    const start = Math.max(sMin + stepMinutes, timeToMinutes(slot.start_time) + stepMinutes);
    for (let m = start; m <= end; m += stepMinutes) {
      times.add(minutesToTime(m));
    }
  });
  return Array.from(times).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

// Model một buổi học đã phân tích của học sinh để hiển thị lên Sơ đồ ma trận lớp
export interface ParsedStudentSchedule {
  day: string;          // "Thứ 2", "Thứ 4", "Thứ 6"...
  hourSlot: string;     // "17h", "18h", "19h", "09h", "08h"...
  timeDetail: string;   // "18h30", "17h30 - 19h", "18h - 19h30" hoặc rỗng nếu đúng giờ chuẩn
  subjectName?: string; // Tên bộ môn nếu có ghi riêng (VD: "Piano", "Guitar")
  detectedTeacherId?: string; // ID giáo viên nếu phát hiện từ chuỗi
  matchedTeacherIds?: string[]; // Danh sách các GV đứng ca tương ứng trong lớp (hỗ trợ nhiều GV cùng giờ)
}

// Phân tích lịch học chi tiết của học sinh từ schedule_details_json, study_time_detail và registered_days
export function parseStudentScheduleSlots(
  student: {
    schedule_details_json?: string;
    study_time_detail?: string;
    registered_days?: string;
    time_slot_name?: string;
    time_slot_desc?: string;
    status_note?: string;
    class_teacher_assignments_json?: string;
  },
  availableTeachers: Array<{ id: string; name: string }> = []
): ParsedStudentSchedule[] {
  const results: ParsedStudentSchedule[] = [];

  // Helper tìm ID giáo viên khớp với chuỗi văn bản
  const detectTeacher = (text: string): string | undefined => {
    if (!text || availableTeachers.length === 0) return undefined;
    const clean = text.toLowerCase().trim();
    for (const tc of availableTeachers) {
      const tcName = tc.name.toLowerCase().trim();
      if (clean === tcName) return tc.id;
      const words = tcName.split(/\s+/).filter((w) => !["thầy", "cô"].includes(w));
      const mainName = words[words.length - 1]; // Ví dụ: "phong", "điệp", "phát"
      if (tcName.length >= 2 && clean.includes(tcName)) return tc.id;
      if (mainName && mainName.length >= 3 && clean.includes(mainName)) return tc.id;
      // Khớp đặc biệt nếu gõ Phonk/Phong
      if ((mainName === "phonk" || mainName === "phong") && (clean.includes("phong") || clean.includes("phonk"))) {
        return tc.id;
      }
    }
    return undefined;
  };

  // Helper tìm tất cả GV trong lớp phụ trách ca/giờ này từ teacher_assignments_json
  const findClassTeachersForSlot = (day: string, startH: number): string[] => {
    if (!student.class_teacher_assignments_json) return [];
    try {
      const assignments = JSON.parse(student.class_teacher_assignments_json);
      if (!Array.isArray(assignments)) return [];
      const matched = assignments.filter((a: any) => {
        const matchDay = !a.day || a.day === "Tất cả các ngày" || a.day.includes(day);
        if (!matchDay) return false;
        if (!a.start_time || !a.end_time) return true;
        const [sh] = a.start_time.split(":").map(Number);
        const [eh] = a.end_time.split(":").map(Number);
        return startH >= sh && startH < eh;
      });
      return matched.map((m: any) => m.teacher_id).filter(Boolean);
    } catch {
      return [];
    }
  };

  const detectedTeacherFromNote = detectTeacher(
    `${student.study_time_detail || ""} ${student.status_note || ""}`
  );

  // Ưu tiên 1: Đọc từ schedule_details_json nếu có dữ liệu hợp lệ
  if (student.schedule_details_json) {
    try {
      const items = JSON.parse(student.schedule_details_json);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (item.day) {
            // Tách giờ bắt đầu và chuẩn hóa an toàn tuyệt đối, loại bỏ tiền tố thứ để không bị nhầm T2/T3/T4 thành 02:00
            const rawStart = String(item.start_time || "").trim();
            const rawEnd = String(item.end_time || "").trim();
            let startHour = 18;
            let timeDetail = "";

            const combined = `${rawStart} - ${rawEnd}`;
            const clean = combined.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\b/gi, " ");

            const rangeMatch = clean.match(
              /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
            );

            if (rangeMatch) {
              const sH = parseInt(rangeMatch[1], 10);
              const sM = rangeMatch[2] || rangeMatch[3] || "00";
              let eH = parseInt(rangeMatch[4], 10);
              const eM = rangeMatch[5] || rangeMatch[6] || "00";
              if (!isNaN(sH) && sH >= 0 && sH <= 23) {
                if (!isNaN(eH) && eH < sH && eH <= 5) eH += 12;
                const validEH = !isNaN(eH) ? eH : sH + 1;
                startHour = sH;
                timeDetail = `${String(sH).padStart(2, "0")}:${sM} - ${String(validEH).padStart(2, "0")}:${eM}`;
              }
            } else {
              const singleMatch = clean.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
              if (singleMatch) {
                const sH = parseInt(singleMatch[1], 10);
                const sM = singleMatch[2] || singleMatch[3] || "00";
                if (!isNaN(sH) && sH >= 0 && sH <= 23) {
                  startHour = sH;
                  timeDetail = `${String(sH).padStart(2, "0")}:${sM} - ${String(sH + 1).padStart(2, "0")}:${sM}`;
                }
              }
            }

            if (!timeDetail) {
              timeDetail = `${String(startHour).padStart(2, "0")}:00 - ${String(startHour + 1).padStart(2, "0")}:00`;
            }

            const slotHourStr = `${String(startHour).padStart(2, "0")}h`;
            const classTeachers = findClassTeachersForSlot(item.day, startHour);

            results.push({
              day: item.day,
              hourSlot: slotHourStr,
              timeDetail: timeDetail,
              detectedTeacherId: detectedTeacherFromNote || classTeachers[0],
              matchedTeacherIds: classTeachers.length > 0 ? classTeachers : undefined,
            });
          }
        }
        if (results.length > 0) return results;
      }
    } catch {}
  }

  // Ưu tiên 2: Phân tích thông minh chuỗi study_time_detail
  // VD: "T2, T4 (17h - 18h30)", "T2 (17h - 18h), T3, T4 (19h - 20h)", "Thứ 2: 18:00-19:30 | Thứ 4: 18:00-19:30"
  const rawText = (student.study_time_detail || "").trim();
  if (rawText && !rawText.toLowerCase().includes("linh hoạt")) {
    let clauses: string[] = [];
    if (/[|;]/.test(rawText)) {
      clauses = rawText.split(/[|;]+/).map((s) => s.trim()).filter(Boolean);
    } else if (/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/.test(rawText)) {
      clauses = rawText
        .split(/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/)
        .map((s, idx, arr) => {
          let res = s.trim();
          if (idx < arr.length - 1 && !res.endsWith(")")) res += ")";
          return res;
        })
        .filter(Boolean);
    } else {
      clauses = [rawText.trim()];
    }

    for (const seg of clauses) {
      // 1. Tìm các ngày thứ có trong đoạn (T2, T3, T4, T5, T6, T7, CN, S7, C7)
      const daysFound: string[] = [];

      if (/T2[-_ ]*4[-_ ]*6/i.test(seg) || /T2,?\s*4,?\s*6/i.test(seg)) {
        daysFound.push("Thứ 2", "Thứ 4", "Thứ 6");
      } else if (/T3[-_ ]*5[-_ ]*7/i.test(seg) || /T3,?\s*5,?\s*7/i.test(seg)) {
        daysFound.push("Thứ 3", "Thứ 5", "Thứ 7");
      } else if (/T2[-_ ]*4/i.test(seg) || /T2,?\s*4\b/i.test(seg)) {
        daysFound.push("Thứ 2", "Thứ 4");
      } else if (/T3[-_ ]*5/i.test(seg) || /T3,?\s*5\b/i.test(seg)) {
        daysFound.push("Thứ 3", "Thứ 5");
      } else {
        if (/(?:T2|Thứ\s*2)\b/i.test(seg)) daysFound.push("Thứ 2");
        if (/(?:T3|Thứ\s*3)\b/i.test(seg)) daysFound.push("Thứ 3");
        if (/(?:T4|Thứ\s*4)\b/i.test(seg)) daysFound.push("Thứ 4");
        if (/(?:T5|Thứ\s*5)\b/i.test(seg)) daysFound.push("Thứ 5");
        if (/(?:T6|Thứ\s*6)\b/i.test(seg)) daysFound.push("Thứ 6");
        if (/(?:T7|Thứ\s*7|S7|C7)\b/i.test(seg)) daysFound.push("Thứ 7");
        if (/(?:CN|Chủ\s*Nhật)\b/i.test(seg)) daysFound.push("Chủ Nhật");
      }

      // 2. Tách mốc giờ học chuẩn xác:
      let cleanTime = seg.replace(/T[2-7][-_ ]*[2-7][-_ ]*[2-7]?/gi, " ");
      cleanTime = cleanTime.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\s*[:\s-]*/gi, " ");
      cleanTime = cleanTime.replace(/\(\s*\d+(?:\.\d+)?\s*(?:h|tiếng|phút|p)\s*\)/gi, " ");

      let detectedHourSlot = "18h";
      let timeDetail = "";

      // Khớp khoảng giờ: 18:00-19:30, 18h-19h30, 19-20h, 09:00 - 10:30, 18h30 - 20h
      const rangeMatch = cleanTime.match(
        /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
      );

      if (rangeMatch) {
        const startH = parseInt(rangeMatch[1], 10);
        const startM = rangeMatch[2] || rangeMatch[3] || "00";
        const endH = parseInt(rangeMatch[4], 10);
        const endM = rangeMatch[5] || rangeMatch[6] || "00";

        if (!isNaN(startH) && startH >= 0 && startH <= 23) {
          detectedHourSlot = `${String(startH).padStart(2, "0")}h`;
          let endHourNum = !isNaN(endH) ? endH : startH + 1;
          if (endHourNum < startH && endHourNum <= 5) {
            endHourNum += 12;
          }
          const startStr = `${String(startH).padStart(2, "0")}:${startM}`;
          const endStr = `${String(endHourNum).padStart(2, "0")}:${endM}`;
          timeDetail = `${startStr} - ${endStr}`;
        }
      } else {
        // Khớp giờ đơn: 18h30, 18:30, 18h, 9h
        const singleMatch = cleanTime.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
        if (singleMatch) {
          const startH = parseInt(singleMatch[1], 10);
          const startM = singleMatch[2] || singleMatch[3] || "00";
          if (!isNaN(startH) && startH >= 0 && startH <= 23) {
            detectedHourSlot = `${String(startH).padStart(2, "0")}h`;
            const endH = startH + 1;
            const startStr = `${String(startH).padStart(2, "0")}:${startM}`;
            const endStr = `${String(endH).padStart(2, "0")}:${startM}`;
            timeDetail = `${startStr} - ${endStr}`;
          }
        }
      }

      // 3. Nhận diện tên môn học nếu có ghi trong chuỗi
      let segSubject = "";
      if (/guitar/i.test(seg)) segSubject = "Guitar";
      else if (/piano/i.test(seg)) segSubject = "Piano";
      else if (/organ/i.test(seg)) segSubject = "Organ";
      else if (/thanh nhạc|vocal/i.test(seg)) segSubject = "Thanh nhạc";
      else if (/trống|drum/i.test(seg)) segSubject = "Trống";

      // 4. Nhận diện giáo viên riêng trong đoạn này nếu có
      const teacherInSeg = detectTeacher(seg) || detectedTeacherFromNote;

      if (daysFound.length > 0) {
        for (const d of daysFound) {
          const startH = parseInt(detectedHourSlot.replace("h", ""), 10) || 18;
          const classTeachers = findClassTeachersForSlot(d, startH);

          results.push({
            day: d,
            hourSlot: detectedHourSlot,
            timeDetail: timeDetail,
            subjectName: segSubject,
            detectedTeacherId: teacherInSeg || classTeachers[0],
            matchedTeacherIds: classTeachers.length > 0 ? classTeachers : undefined,
          });
        }
      }
    }

    if (results.length > 0) return results;
  }

  // Ưu tiên 3: Phân tích từ registered_days nếu có (VD: "Thứ 2, Thứ 4, Thứ 6" hoặc "Thứ 7, Chủ Nhật")
  const regDays = (student.registered_days || "").trim();
  if (regDays) {
    const daysList = regDays.split(/[,|;]+/).map((d) => d.trim()).filter(Boolean);
    for (const d of daysList) {
      const isWeekend = d.includes("7") || d.toLowerCase().includes("nhật");
      const defaultStartH = isWeekend ? 9 : 18;
      results.push({
        day: d.startsWith("Thứ") || d === "Chủ Nhật" ? d : `Thứ ${d.replace(/\D/g, "")}`,
        hourSlot: isWeekend ? "09h" : "18h",
        timeDetail: `${String(defaultStartH).padStart(2, "0")}:00 - ${String(defaultStartH + 1).padStart(2, "0")}:00`,
        detectedTeacherId: detectedTeacherFromNote,
      });
    }
  }

  // Ưu tiên 4: Fallback Thứ 2 ca 18h
  if (results.length === 0) {
    results.push({
      day: "Thứ 2",
      hourSlot: "18h",
      timeDetail: "18:00 - 19:00",
      detectedTeacherId: detectedTeacherFromNote,
    });
  }

  return results;
}

// Chuyển đổi thông minh chuỗi "Giờ vào lớp" từ Excel thành cấu trúc lịch học chuẩn của hệ thống
export function parseStudyTimeToSchedule(raw?: string): {
  registered_days: string;
  sessions_per_week: number;
  hours_per_week: number;
  schedule_details_json: string;
} | null {
  if (!raw || typeof raw !== "string") return null;
  const str = raw.trim();
  if (!str || str.toLowerCase().includes("linh hoạt")) return null;

  let rawClauses: string[] = [];
  if (/[|;]/.test(str)) {
    rawClauses = str.split(/[|;]+/).map((s) => s.trim()).filter(Boolean);
  } else if (/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/.test(str)) {
    rawClauses = str
      .split(/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/)
      .map((s, idx, arr) => {
        let res = s.trim();
        if (idx < arr.length - 1 && !res.endsWith(")")) res += ")";
        return res;
      })
      .filter(Boolean);
  } else {
    rawClauses = [str.trim()];
  }

  const scheduleItems: Array<{
    id: string;
    day: string;
    start_time: string;
    end_time: string;
    hours: number;
  }> = [];
  const daysSet = new Set<string>();
  let totalHours = 0;

  for (const seg of rawClauses) {
    const days: string[] = [];
    if (/T2[-_ ]*4[-_ ]*6/i.test(seg) || /T2,?\s*4,?\s*6/i.test(seg)) {
      days.push("Thứ 2", "Thứ 4", "Thứ 6");
    } else if (/T3[-_ ]*5[-_ ]*7/i.test(seg) || /T3,?\s*5,?\s*7/i.test(seg)) {
      days.push("Thứ 3", "Thứ 5", "Thứ 7");
    } else if (/T2[-_ ]*4/i.test(seg) || /T2,?\s*4\b/i.test(seg)) {
      days.push("Thứ 2", "Thứ 4");
    } else if (/T3[-_ ]*5/i.test(seg) || /T3,?\s*5\b/i.test(seg)) {
      days.push("Thứ 3", "Thứ 5");
    } else {
      if (/(?:T2|Thứ\s*2)\b/i.test(seg)) days.push("Thứ 2");
      if (/(?:T3|Thứ\s*3)\b/i.test(seg)) days.push("Thứ 3");
      if (/(?:T4|Thứ\s*4)\b/i.test(seg)) days.push("Thứ 4");
      if (/(?:T5|Thứ\s*5)\b/i.test(seg)) days.push("Thứ 5");
      if (/(?:T6|Thứ\s*6)\b/i.test(seg)) days.push("Thứ 6");
      if (/(?:T7|Thứ\s*7|S7|C7)\b/i.test(seg)) days.push("Thứ 7");
      if (/(?:CN|Chủ\s*Nhật)\b/i.test(seg)) days.push("Chủ Nhật");
    }

    let cleanTime = seg.replace(/T[2-7][-_ ]*[2-7][-_ ]*[2-7]?/gi, " ");
    cleanTime = cleanTime.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\s*[:\s-]*/gi, " ");
    cleanTime = cleanTime.replace(/\(\s*\d+(?:\.\d+)?\s*(?:h|tiếng|phút|p)\s*\)/gi, " ");

    let start_time = "18:00";
    let end_time = "19:30";
    let hours = 1.5;

    const rangeMatch = cleanTime.match(
      /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
    );

    if (rangeMatch) {
      const startH = parseInt(rangeMatch[1], 10);
      const startM = rangeMatch[2] || rangeMatch[3] || "00";
      const endH = parseInt(rangeMatch[4], 10);
      const endM = rangeMatch[5] || rangeMatch[6] || "00";

      let endHourVal = endH;
      if (endHourVal < startH) {
        if (startH >= 8 && startH <= 11 && endHourVal === 1) {
          endHourVal = 11;
        } else if (endHourVal <= 5) {
          endHourVal += 12;
        }
      }

      start_time = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      end_time = `${String(endHourVal).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const diffMin = endHourVal * 60 + parseInt(endM, 10) - (startH * 60 + parseInt(startM, 10));
      hours = Math.max(0.5, Math.round((diffMin / 60) * 10) / 10);
    } else {
      const singleMatch = cleanTime.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
      if (singleMatch) {
        const startH = parseInt(singleMatch[1], 10);
        const startM = singleMatch[2] || singleMatch[3] || "00";
        const endH = startH + 1;
        start_time = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
        end_time = `${String(endH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
        hours = 1;
      }
    }

    for (const d of days) {
      daysSet.add(d);
      scheduleItems.push({
        id: String(scheduleItems.length + 1),
        day: d,
        start_time,
        end_time,
        hours,
      });
      totalHours += hours;
    }
  }

  if (scheduleItems.length === 0) return null;

  return {
    registered_days: Array.from(daysSet).join(", "),
    sessions_per_week: scheduleItems.length,
    hours_per_week: Math.round(totalHours * 10) / 10,
    schedule_details_json: JSON.stringify(scheduleItems),
  };
}

/* =========================================================================
 * BẢNG LỊCH HỌC CÒN LẠI (UPCOMING SCHEDULE GENERATOR)
 * Tự động phân tích lịch học cố định & sinh danh sách các buổi học còn lại
 * từ hôm nay đến N ngày tới (kèm trạng thái đã báo nghỉ / đã bù)
 * ========================================================================= */

export interface UpcomingLessonSession {
  id: string;            // unique: "2026-10-31_09:30"
  date: string;          // "2026-10-31" (YYYY-MM-DD)
  dayName: string;       // "Thứ 7"
  timeRange: string;     // "09:30 - 11:00"
  subjectName: string;   // "Piano"
  teacherName?: string;
  isToday: boolean;
  isPast: boolean;
  isReported: boolean;   // Đã báo nghỉ buổi này chưa
  makeupItem?: {
    id: string;
    absence_date: string;
    status: string;      // 'pending' | 'scheduled' | 'completed'
    makeup_date?: string;
    makeup_time?: string;
    absence_reason?: string;
  };
}

const VI_WEEKDAYS = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export function generateUpcomingStudentSchedule(
  student: {
    schedule_details_json?: string;
    study_time_detail?: string;
    registered_days?: string;
    subject_name?: string;
    teacher_name?: string;
    makeups?: Array<{
      id: string;
      absence_date: string;
      status: string;
      makeup_date?: string;
      makeup_time?: string;
      absence_reason?: string;
    }>;
  },
  daysAhead: number = 30,
  availableTeachers: Array<{ id: string; name: string }> = []
): UpcomingLessonSession[] {
  const parsedSlots = parseStudentScheduleSlots(student, availableTeachers);
  if (parsedSlots.length === 0) return [];

  // Gom các slot theo thứ
  const slotsByDay: Record<string, ParsedStudentSchedule[]> = {};
  for (const slot of parsedSlots) {
    if (!slotsByDay[slot.day]) slotsByDay[slot.day] = [];
    slotsByDay[slot.day].push(slot);
  }

  // Map các buổi đã báo nghỉ trước đó theo ngày
  const makeupsMap = new Map<string, any>();
  if (Array.isArray(student.makeups)) {
    for (const m of student.makeups) {
      if (m.absence_date && m.status !== "cancelled") {
        makeupsMap.set(m.absence_date, m);
      }
    }
  }

  const results: UpcomingLessonSession[] = [];
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayName = VI_WEEKDAYS[d.getDay()];

    const slots = slotsByDay[dayName];
    if (!slots || slots.length === 0) continue;

    for (const slot of slots) {
      const timeRange = slot.timeDetail || (slot.hourSlot ? `${slot.hourSlot.replace("h", "")}:00` : "18:00 - 19:00");
      const subName = slot.subjectName || student.subject_name || "Piano";
      const existingMakeup = makeupsMap.get(iso);

      results.push({
        id: `${iso}_${timeRange.split("-")[0]?.trim() || "00:00"}`,
        date: iso,
        dayName,
        timeRange,
        subjectName: subName,
        teacherName: student.teacher_name,
        isToday: iso === todayIso,
        isPast: iso < todayIso,
        isReported: Boolean(existingMakeup),
        makeupItem: existingMakeup || undefined,
      });
    }
  }

  return results;
}

/* =========================================================================
 * NHẬN DIỆN THÔNG MINH TÊN KIỂU LỊCH HỌC (SCHEDULE PRESET DETECTOR)
 * ========================================================================= */
export function detectStudentPresetName(
  student: {
    schedule_preset_name?: string;
    registered_days?: string;
    study_time_detail?: string;
    schedule_details_json?: string;
  },
  presets: Array<{ id: string; name: string; days?: string[] }> = []
): string {
  if (student.schedule_preset_name && student.schedule_preset_name.trim()) {
    return student.schedule_preset_name.trim();
  }

  // Thu thập danh sách ngày học từ registered_days hoặc schedule_details_json
  let days: string[] = [];
  if (student.registered_days && student.registered_days.trim()) {
    days = student.registered_days.split(",").map((d) => d.trim()).filter(Boolean);
  }
  if (days.length === 0 && student.schedule_details_json) {
    try {
      const items = JSON.parse(student.schedule_details_json);
      if (Array.isArray(items)) {
        days = Array.from(new Set(items.map((i: any) => String(i.day || "")).filter(Boolean)));
      }
    } catch {}
  }

  // So khớp với danh sách presets đã cấu hình trong Cài Đặt
  if (presets.length > 0 && days.length > 0) {
    const matched = presets.find((p) => {
      const pDays = Array.isArray(p.days) ? p.days : [];
      if (pDays.length !== days.length) return false;
      return pDays.every((pd) => days.some((d) => d.toLowerCase() === pd.toLowerCase()));
    });
    if (matched) return matched.name;
  }

  // Phân tích văn bản từ study_time_detail & registered_days
  const combined = `${student.registered_days || ""} ${student.study_time_detail || ""}`.toLowerCase();

  if (/t2[-_ ]*4[-_ ]*6/i.test(combined) || (combined.includes("thứ 2") && combined.includes("thứ 4") && combined.includes("thứ 6"))) {
    const evenPreset = presets.find((p) => p.name.toLowerCase().includes("chẵn") || p.name.includes("2-4-6"));
    return evenPreset ? evenPreset.name : "Thứ chẵn (2-4-6)";
  }

  if (/t3[-_ ]*5[-_ ]*7/i.test(combined) || (combined.includes("thứ 3") && combined.includes("thứ 5") && combined.includes("thứ 7"))) {
    const oddPreset = presets.find((p) => p.name.toLowerCase().includes("lẻ") || p.name.includes("3-5-7"));
    return oddPreset ? oddPreset.name : "Thứ lẻ (3-5-7)";
  }

  if ((combined.includes("thứ 7") || combined.includes("t7")) && (combined.includes("chủ nhật") || combined.includes("cn"))) {
    const weekendPreset = presets.find((p) => p.name.toLowerCase().includes("cuối tuần") || p.name.includes("t7-cn"));
    return weekendPreset ? weekendPreset.name : "Cuối tuần (T7-CN)";
  }

  if (combined.includes("linh hoạt")) {
    return "Linh hoạt";
  }

  if (days.length > 0) {
    return days.map((d) => d.replace("Thứ ", "T").replace("Chủ Nhật", "CN")).join("-");
  }

  return "";
}

// Helper giải quyết danh sách giáo viên phụ trách học sinh dựa trên Lớp học & Khung giờ học thực tế
export function resolveStudentTeachers(
  student: {
    teacher_id?: string;
    teacher_name?: string;
    class_id?: string;
    class_teacher_assignments_json?: string;
    study_time_detail?: string;
    schedule_details_json?: string;
    registered_days?: string;
  },
  availableTeachers: Array<{ id: string; name: string }> = []
): {
  primaryTeacherId?: string;
  primaryTeacherName: string;
  allTeacherNames: string[];
  teacherDisplay: string;
} {
  const teacherMap = new Map(availableTeachers.map((t) => [t.id, t.name]));

  // 1. Nếu có teacher_assignments_json từ lớp học
  if (student.class_teacher_assignments_json) {
    try {
      const assignments = JSON.parse(student.class_teacher_assignments_json);
      if (Array.isArray(assignments) && assignments.length > 0) {
        // Tách giờ bắt đầu/kết thúc học sinh đang học
        let stStartH = 18;
        if (student.schedule_details_json) {
          try {
            const items = JSON.parse(student.schedule_details_json);
            if (Array.isArray(items) && items.length > 0 && items[0].start_time) {
              stStartH = parseInt(items[0].start_time.split(":")[0], 10);
            }
          } catch {}
        } else if (student.study_time_detail) {
          const match = student.study_time_detail.match(/(\d{1,2})(?::(\d{2})|h)/);
          if (match) stStartH = parseInt(match[1], 10);
        }

        // Lọc các giáo viên đứng ca trùng với giờ của học sinh
        const matched = assignments.filter((a: any) => {
          if (!a.start_time || !a.end_time) return true;
          const [sh] = a.start_time.split(":").map(Number);
          const [eh] = a.end_time.split(":").map(Number);
          return stStartH >= sh && stStartH < eh;
        });

        const targetList = matched.length > 0 ? matched : assignments;
        const names = Array.from(
          new Set(
            targetList
              .map((a: any) => a.teacher_name || teacherMap.get(a.teacher_id))
              .filter(Boolean)
          )
        ) as string[];

        if (names.length > 0) {
          return {
            primaryTeacherId: targetList[0].teacher_id,
            primaryTeacherName: names[0],
            allTeacherNames: names,
            teacherDisplay: names.join(" & "),
          };
        }
      }
    } catch {}
  }

  // 2. Fallback qua teacher_name / teacher_id cá nhân
  if (student.teacher_name && student.teacher_name !== "Chưa gán GV") {
    return {
      primaryTeacherId: student.teacher_id,
      primaryTeacherName: student.teacher_name,
      allTeacherNames: [student.teacher_name],
      teacherDisplay: student.teacher_name,
    };
  }

  if (student.teacher_id && teacherMap.has(student.teacher_id)) {
    const tName = teacherMap.get(student.teacher_id)!;
    return {
      primaryTeacherId: student.teacher_id,
      primaryTeacherName: tName,
      allTeacherNames: [tName],
      teacherDisplay: tName,
    };
  }

  return {
    primaryTeacherId: undefined,
    primaryTeacherName: "Chưa gán GV",
    allTeacherNames: [],
    teacherDisplay: "Chưa gán GV",
  };
}


