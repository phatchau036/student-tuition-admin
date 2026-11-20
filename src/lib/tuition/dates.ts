/**
 * tuition/dates.ts — Tiện ích tính toán tháng/kỳ.
 */

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

/** Ngày hôm nay theo định dạng `YYYY-MM-DD` (múi giờ máy). */
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Tính toán tháng kết thúc từ chu kỳ gói phí (startMonth + cycleMonths - 1)
 * Ví dụ: computeEndMonth("2026-10", 3) => "2026-12" (tháng 10, 11, 12 là 3 tháng)
 */
export function computeEndMonth(startMonth: string, cycleMonths: number): string {
  if (!startMonth || !startMonth.includes("-")) return startMonth;
  const [yearStr, monthStr] = startMonth.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  const totalMonths = m + (cycleMonths - 1);
  m = ((totalMonths - 1) % 12) + 1;
  y += Math.floor((totalMonths - 1) / 12);

  return `${y}-${String(m).padStart(2, "0")}`;
}
