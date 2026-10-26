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

export function calculateStandardTuition(
  baseTuition: number,
  levelSurcharge: number,
  isDiscountEnabled: boolean | number,
  discountPercent: number
): number {
  const base = Number(baseTuition) || 0;
  const surcharge = Number(levelSurcharge) || 0;
  const discount = Boolean(Number(isDiscountEnabled)) ? Number(discountPercent) || 0 : 0;

  const totalBeforeDiscount = base + surcharge;
  const discountMultiplier = Math.max(0, 1 - discount / 100);
  return Math.round(totalBeforeDiscount * discountMultiplier);
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

