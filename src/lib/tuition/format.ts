/**
 * tuition/format.ts — Định dạng tiền, phút, tháng và tên thứ.
 */
import type { MonthFormat } from "@/types/common";

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

/**
 * Chuyển đổi chuỗi ngày YYYY-MM-DD thành Thứ tiếng Việt ("Thứ 2".."Thứ 7", "Chủ Nhật")
 */
export function getDayNameVi(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0: CN, 1: T2, 2: T3...
  return day === 0 ? "Chủ Nhật" : `Thứ ${day + 1}`;
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
    const monthName =
      !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? ENGLISH_MONTHS[monthNum - 1] : month;
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
