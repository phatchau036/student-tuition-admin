import { CheckCircle2, DollarSign, Lock, Package, Sparkles, TrendingUp, Users } from "lucide-react";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import type { MonthFormat } from "@/types/common";
import type { Translations } from "@/lib/i18n";

interface DashboardKpiCardsProps {
  t: Translations;
  isRangeValid: boolean;
  periodShortLabel: string;
  selectedMonth: string;
  monthFormat: MonthFormat;
  periodRevenue: { total: number; paid_students: number } | null;
  totalRevenueThisMonth: number;
  visibleStudentsCount: number;
  packageCount: number;
  overriddenCount: number;
  canViewRevenue: boolean;
  canViewTuition: boolean;
}

/**
 * Hai thẻ KPI đầu trang quản trị: dự thu kỳ đang chọn và số gói học phí áp dụng.
 */
export function DashboardKpiCards({
  t,
  isRangeValid,
  periodShortLabel,
  selectedMonth,
  monthFormat,
  periodRevenue,
  totalRevenueThisMonth,
  visibleStudentsCount,
  packageCount,
  overriddenCount,
  canViewRevenue,
  canViewTuition,
}: DashboardKpiCardsProps) {
  return (
    <>
      {/* KPI Stat 1: Total Revenue for Month */}
      <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md shadow-indigo-600/20 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-300" />
            {t.expected_revenue}{" "}
            {isRangeValid
              ? `KỲ ${periodShortLabel}`
              : formatMonthDisplay(selectedMonth, monthFormat)}
          </span>
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-3xl font-black tracking-tight">
            {canViewRevenue ? (
              formatVND(totalRevenueThisMonth)
            ) : (
              <span
                className="text-2xl font-bold tracking-widest text-indigo-200 select-none"
                title="Tài khoản không có quyền xem tổng doanh thu cơ sở"
              >
                •••••••• đ
              </span>
            )}
          </div>
          <span className="text-xs text-indigo-100 font-medium mt-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 opacity-80" />
            <strong>{visibleStudentsCount}</strong> {t.total_active_students}
          </span>
          {isRangeValid && periodRevenue && canViewRevenue && (
            <span
              className="text-[10.5px] text-indigo-100 font-semibold mt-1 flex items-center gap-1 flex-wrap"
              title="Tổng tiền các kỳ thanh toán (student_payments) bao phủ tháng neo — tháng của ngày bắt đầu kỳ học phí"
            >
              <CheckCircle2 className="w-3 h-3 opacity-90 shrink-0" />
              Đã thu theo kỳ:
              <strong className="text-white">{formatVND(periodRevenue.total)}</strong>
              <span className="opacity-80">({periodRevenue.paid_students} HS)</span>
            </span>
          )}
        </div>
      </div>

      {/* KPI Stat 2: Active Packages & Overrides */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-500" />
            {t.tuition_packages_custom}
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {packageCount}{" "}
            <span className="text-sm font-semibold text-slate-400">{t.packages_applied}</span>
          </div>
          {canViewTuition ? (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1 inline-flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {overriddenCount} {t.overridden_students}
            </span>
          ) : (
            <span className="text-xs text-slate-400 font-semibold mt-1 inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Không có quyền xem học phí
            </span>
          )}
        </div>
      </div>
    </>
  );
}
