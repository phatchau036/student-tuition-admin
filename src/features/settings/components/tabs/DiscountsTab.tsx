"use client";

import type { DiscountOption } from "@/lib/types";
import { Percent, Plus, Trash2 } from "lucide-react";

interface DiscountsTabProps {
  discounts: DiscountOption[];
  onAdd: () => void;
  onUpdate: (index: number, field: "percentage" | "label", value: string | number) => void;
  onRemove: (index: number) => void;
}

/**
 * Tab cấu hình "discounts" của SettingsModal — tách ra trong Giai đoạn 2.
 */
export function DiscountsTab({ discounts, onAdd, onUpdate, onRemove }: DiscountsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Cấu Hình Các Mốc Chiết Khấu (Discount Presets)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Các mốc phần trăm giảm giá nhanh khi thêm/sửa học sinh
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Thêm mốc chiết khấu
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {discounts.map((disc, index) => (
          <div
            key={disc.id || index}
            className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-slate-300 transition"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={disc.percentage}
                    onChange={(e) => onUpdate(index, "percentage", e.target.value)}
                    className="w-16 px-2 py-1 text-sm font-black text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="text-xs font-black text-slate-500">%</span>
                </div>
              </div>

              <button
                onClick={() => onRemove(index)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                title="Xóa mức chiết khấu"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Lý do được giảm / Tên mức giảm
              </label>
              <input
                type="text"
                value={disc.label || ""}
                onChange={(e) => onUpdate(index, "label", e.target.value)}
                placeholder="VD: Anh em ruột, Đăng ký sớm, Hộ nghèo..."
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>
        ))}

        {discounts.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            Chưa có mức chiết khấu nào. Bấm <strong>&quot;+ Thêm mốc chiết khấu&quot;</strong> để
            tạo nhanh các mốc 10%, 20%...
          </div>
        )}
      </div>
    </div>
  );
}
