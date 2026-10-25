"use client";

import React, { useState, useEffect } from "react";
import { Student } from "@/lib/types";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import { Calendar, DollarSign, FileText, RotateCcw, Save } from "lucide-react";

interface MonthlyTuitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  student: Student | null;
  selectedMonth: string; // YYYY-MM
}

export const MonthlyTuitionModal: React.FC<MonthlyTuitionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  student,
  selectedMonth,
}) => {
  const { showToast } = useToast();

  const [month, setMonth] = useState(selectedMonth);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setMonth(selectedMonth);
      if (student.monthly_override && student.monthly_override.month === selectedMonth) {
        setAmount(student.monthly_override.amount);
        setNote(student.monthly_override.note || "");
      } else {
        setAmount(student.standard_tuition || 0);
        setNote("");
      }
    }
  }, [student, selectedMonth, isOpen]);

  if (!isOpen || !student) return null;

  const hasCurrentOverride = Boolean(student.monthly_override && student.monthly_override.month === selectedMonth);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch("/api/tuition-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          month: month,
          amount: Number(amount) || 0,
          note: note.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        onSaved();
        onClose();
      } else {
        showToast(data.message || "Lỗi khi lưu tùy chỉnh!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToStandard = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/tuition-override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          month: month,
          action: "reset",
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "info");
        onSaved();
        onClose();
      } else {
        showToast(data.message || "Lỗi khi đặt lại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Chỉnh Sửa Học Phí Theo Tháng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Học sinh: <span className="font-semibold text-slate-700 dark:text-slate-300">{student.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Month Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Tháng áp dụng <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Reference Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500 block">Học phí chuẩn mặc định:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                {formatVND(student.standard_tuition)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block">Trạng thái tháng này:</span>
              {hasCurrentOverride ? (
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Đã ghi đè riêng
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Theo chuẩn mặc định
                </span>
              )}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Số tiền học phí tùy chỉnh (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="number"
                min="0"
                step="50000"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="Nhập số tiền..."
                className="w-full pl-9 pr-3 py-2 text-base font-bold text-amber-600 dark:text-amber-400 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Định dạng: <span className="font-bold text-slate-700 dark:text-slate-200">{formatVND(amount)}</span>
            </div>
          </div>

          {/* Note / Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Ghi chú lý do tùy chỉnh (Hiển thị nhãn tag)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Nghỉ 2 buổi có phép, Đóng bù tháng trước..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Lưu ý: Mức điều chỉnh này chỉ áp dụng riêng cho {formatMonthDisplay(month)}. Các tháng khác vẫn tính theo học phí chuẩn mặc định.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {hasCurrentOverride ? (
              <button
                type="button"
                onClick={handleResetToStandard}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Khôi phục về chuẩn
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "Đang lưu..." : "Xác nhận ghi đè"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
