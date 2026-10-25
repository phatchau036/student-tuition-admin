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

export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatMonthDisplay(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  return `Tháng ${month}/${year}`;
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

  const rawName = (slot.name || "").trim();
  const isGeneric =
    !rawName ||
    rawName.toLowerCase().includes("khung giờ") ||
    rawName.toLowerCase() === "mở cửa" ||
    (rawName.toLowerCase().startsWith("ca ") && rawName.includes(time));

  if (time && days) {
    if (isGeneric) {
      return `${time} (${days})`;
    }
    return `${time} • ${rawName} (${days})`;
  }
  if (time) {
    return isGeneric ? time : `${time} • ${rawName}`;
  }
  if (days) {
    return isGeneric ? days : `${rawName} (${days})`;
  }
  return rawName || "Khung giờ";
}

