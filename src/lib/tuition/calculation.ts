/**
 * tuition/calculation.ts — Công thức tính học phí và chiết khấu.
 */
import { formatVND } from "./format";

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
  levelSurchargeType?: "fixed" | "percent" | null;
  levelName?: string | null;
  isDiscountEnabled?: boolean | number | null;
  discountPercent?: number | null;
}): TuitionBreakdown {
  const pkgAmount = Number(params.packageAmount) || 0;
  const base = pkgAmount > 0 ? pkgAmount : Number(params.baseTuition) || 0;
  const baseLabel = pkgAmount > 0 ? params.packageName || "Gói học phí" : "Học phí cơ bản";
  const rawSurchargeVal = Number(params.levelSurcharge) || 0;
  const surchargeType = params.levelSurchargeType || "fixed";

  // Nếu là kiểu phần trăm (percent), tính phụ thu = (base * rawSurchargeVal) / 100
  const surcharge =
    surchargeType === "percent" ? Math.round((base * rawSurchargeVal) / 100) : rawSurchargeVal;

  const subtotal = base + surcharge;
  const hasDiscount =
    Boolean(Number(params.isDiscountEnabled)) && Number(params.discountPercent || 0) > 0;
  const discountPercent = hasDiscount ? Number(params.discountPercent || 0) : 0;
  const discountMultiplier = Math.max(0, 1 - discountPercent / 100);
  const finalTuition = Math.round(subtotal * discountMultiplier);
  const discountAmount = subtotal - finalTuition;

  // Xây dựng chuỗi công thức diễn giải: ví dụ "1.000.000 đ (Gói 1 tháng) + 10% (100.000 đ) (Grade 7)"
  const parts: string[] = [];
  if (base > 0) {
    parts.push(`${formatVND(base)} (${baseLabel})`);
  } else {
    parts.push(`0 đ`);
  }
  if (surcharge > 0 || rawSurchargeVal > 0) {
    const surchargeDesc =
      surchargeType === "percent"
        ? `${rawSurchargeVal}% (${formatVND(surcharge)})`
        : formatVND(surcharge);
    parts.push(
      `+ ${surchargeDesc} (${params.levelName ? `Level ${params.levelName}` : "Phụ thu level"})`
    );
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
