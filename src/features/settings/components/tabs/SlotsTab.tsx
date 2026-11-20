"use client";

import type { TimeSlot } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

interface SlotsTabProps {
  timeSlots: TimeSlot[];
  weekdays: string[];
  maxStudents: number;
  onAdd: () => void;
  onUpdate: (index: number, field: keyof TimeSlot, value: string | number) => void;
  onRemove: (index: number) => void;
}

/**
 * Tab cấu hình "slots" của SettingsModal — tách ra trong Giai đoạn 2.
 */
export function SlotsTab({
  timeSlots,
  weekdays,
  maxStudents,
  onAdd,
  onUpdate,
  onRemove,
}: SlotsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Danh Sách Khung Giờ Mở Cửa Của Cơ Sở
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Chọn nhanh từ Thứ mấy tới Thứ mấy bằng menu chọn gọn gàng
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" /> Thêm khung giờ
        </button>
      </div>

      <div className="space-y-3">
        {timeSlots.map((slot, index) => (
          <div
            key={slot.id || index}
            className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center gap-3 shadow-xs hover:border-slate-300 transition"
          >
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-2.5">
              {/* Name */}
              <div className="sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Tên khung giờ
                </label>
                <input
                  type="text"
                  value={slot.name}
                  onChange={(e) => onUpdate(index, "name", e.target.value)}
                  placeholder="Ca Sáng T7"
                  className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Dropdown: Từ thứ mấy */}
              <div className="sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Từ thứ
                </label>
                <select
                  value={slot.from_day || "Thứ 2"}
                  onChange={(e) => onUpdate(index, "from_day", e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {weekdays.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropdown: Tới thứ mấy */}
              <div className="sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Đến thứ
                </label>
                <select
                  value={slot.to_day || "Thứ 7"}
                  onChange={(e) => onUpdate(index, "to_day", e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {weekdays.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Giờ mở */}
              <div className="sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Mở cửa
                </label>
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => onUpdate(index, "start_time", e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                />
              </div>

              {/* Giờ đóng */}
              <div className="sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Đóng cửa
                </label>
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => onUpdate(index, "end_time", e.target.value)}
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                />
              </div>

              {/* Sĩ số max */}
              <div className="sm:col-span-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Sĩ số max
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={slot.max_students || maxStudents || 10}
                  onChange={(e) => onUpdate(index, "max_students", Number(e.target.value) || 10)}
                  className="w-full mt-1 px-2.5 py-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(slot.is_active)}
                  onChange={(e) => onUpdate(index, "is_active", e.target.checked ? 1 : 0)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                Hoạt động
              </label>

              <button
                onClick={() => onRemove(index)}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                title="Xóa khung giờ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {timeSlots.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            Chưa có khung giờ nào. Bấm <strong>&quot;+ Thêm khung giờ&quot;</strong> để thiết lập ca
            học.
          </div>
        )}
      </div>
    </div>
  );
}
