"use client";

import type { LevelSurcharge } from "@/lib/types";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from "lucide-react";

interface LevelsTabProps {
  levels: LevelSurcharge[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof LevelSurcharge, value: string | number) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: "up" | "down") => void;
  onDragStart: (event: React.DragEvent, index: number) => void;
  onDrop: (event: React.DragEvent, dropIndex: number) => void;
  formatMoney: (amount: number) => string;
}

/**
 * Tab cấu hình "levels" của SettingsModal — tách ra trong Giai đoạn 2.
 */
export function LevelsTab({
  levels,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
  onDragStart,
  onDrop,
  formatMoney,
}: LevelsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Bảng Phụ Thu Theo Level & Trình Độ
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Số tiền cộng thêm vào học phí cơ bản theo cấp độ của học sinh
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Thêm Level
        </button>
      </div>

      <div className="space-y-2.5">
        {levels.map((lvl, index) => (
          <div
            key={lvl.id || index}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, index)}
            className="p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center gap-2.5 sm:gap-3.5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700/80 transition cursor-grab active:cursor-grabbing group"
          >
            {/* Tay cầm kéo thả + Nút lên/xuống */}
            <div className="flex flex-col items-center justify-center gap-0.5 shrink-0">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMove(index, "up")}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                title="Di chuyển lên trên"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition" />
              <button
                type="button"
                disabled={index === levels.length - 1}
                onClick={() => onMove(index, "down")}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent transition cursor-pointer"
                title="Di chuyển xuống dưới"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
              #{index + 1}
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Tên Level
                </label>
                <input
                  type="text"
                  value={lvl.level_name}
                  onChange={(e) => onUpdate(index, "level_name", e.target.value)}
                  placeholder="Tên Level (Grade 1, Nâng Cao...)"
                  className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Kiểu Phụ Thu
                </label>
                <select
                  value={lvl.surcharge_type || "fixed"}
                  onChange={(e) => onUpdate(index, "surcharge_type", e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="fixed">Cố định (VNĐ)</option>
                  <option value="percent">Phần trăm (%)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {lvl.surcharge_type === "percent" ? "Mức phụ thu (%)" : "Mức phụ thu (VNĐ)"}
                </label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={lvl.surcharge_amount === 0 ? "" : lvl.surcharge_amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdate(index, "surcharge_amount", val === "" ? 0 : Number(val));
                    }}
                    className="w-full px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">
                    {lvl.surcharge_type === "percent" ? "%" : formatMoney(lvl.surcharge_amount)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onRemove(index)}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition shrink-0 cursor-pointer"
              title="Xóa Level"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {levels.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Chưa có Level nào. Bấm <strong>&quot;+ Thêm Level&quot;</strong> để thiết lập.
          </div>
        )}
      </div>
    </div>
  );
}
