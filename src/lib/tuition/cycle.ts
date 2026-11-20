/**
 * tuition/cycle.ts — Tính số buổi/phút được cấp trong một chu kỳ (Ví Giờ Học).
 */
import { DAY_ORDER } from "./constants";

const DAY_MS = 86400000;
// weekdays: 2..7 = Thứ 2..Thứ 7, 8 = Chủ Nhật. Ngày xử lý theo UTC 00:00 để tránh lệch múi giờ.
function weekdayOf(d: Date): number {
  return d.getUTCDay() === 0 ? 8 : d.getUTCDay() + 1;
}

export interface CycleGrantResult {
  days: number; // Số ngày của chu kỳ (28..31)
  fullWeeks: number; // Số tuần đủ
  leftoverDays: number; // Số ngày lẻ cuối tháng
  sessions: number; // Số buổi học thực tế rơi vào chu kỳ (đã trừ ngày nghỉ lễ)
  minutes: number; // Tổng số phút được cấp vào ví
}

export function calcCycleGrant(p: {
  start: Date; // 00:00 UTC ngày bắt đầu chu kỳ (bắt đầu tháng hoặc ngày vào học giữa tháng)
  endExclusive: Date; // 00:00 UTC ngày kết thúc KHÔNG bao gồm (ngày 1 tháng sau)
  weekdays: number[]; // Mảng thứ học, không trùng lặp (VD: [2,4,6])
  minutesPerSession: number; // ⭐ "1 buổi = bao nhiêu phút" của em học sinh này
  closedDates?: string[]; // Danh sách ngày trung tâm nghỉ 'YYYY-MM-DD'
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
    if (
      !isNaN(d.getTime()) &&
      d >= p.start &&
      d < p.endExclusive &&
      p.weekdays.includes(weekdayOf(d))
    ) {
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

// Chuyển chuỗi thứ "Thứ 2, Thứ 4, Chủ Nhật" -> [2, 4, 8]
export function parseRegisteredDaysToWeekdays(registeredDays: string): number[] {
  const result: number[] = [];
  const trimmed = (registeredDays || "").trim();
  if (!trimmed) return result;
  if (/T2[-_ ]*4[-_ ]*6/i.test(trimmed)) return [2, 4, 6];
  if (/T3[-_ ]*5[-_ ]*7/i.test(trimmed)) return [3, 5, 7];
  for (const [dayName, num] of Object.entries(DAY_ORDER as Record<string, number>)) {
    if (trimmed.includes(dayName) && !result.includes(num)) result.push(num);
  }
  return result.sort((a, b) => a - b);
}
