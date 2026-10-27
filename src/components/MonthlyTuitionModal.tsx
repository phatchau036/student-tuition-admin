"use client";

import React, { useState, useEffect } from "react";
import { Student, MonthFormat, TuitionAdjustmentItem } from "@/lib/types";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import { Calendar, DollarSign, FileText, RotateCcw, Save, X, Sparkles, CheckCircle2, Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { MonthPicker } from "@/components/MonthPicker";

interface MonthlyTuitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  student: Student | null;
  selectedMonth: string; // YYYY-MM
  monthFormat?: MonthFormat;
}

export const MonthlyTuitionModal: React.FC<MonthlyTuitionModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  student,
  selectedMonth,
  monthFormat = "vietnamese",
}) => {
  const { showToast } = useToast();

  const [month, setMonth] = useState(selectedMonth);
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [adjustmentItems, setAdjustmentItems] = useState<TuitionAdjustmentItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // New item inputs
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState<"add" | "deduct">("add");
  const [newItemAmount, setNewItemAmount] = useState<number>(50000);

  useEffect(() => {
    if (student) {
      setMonth(selectedMonth);
      if (student.monthly_override && student.monthly_override.month === selectedMonth) {
        setAmount(student.monthly_override.amount);
        setNote(student.monthly_override.note || "");
        try {
          const parsed = JSON.parse(student.monthly_override.items_json || "[]");
          setAdjustmentItems(Array.isArray(parsed) ? parsed : []);
        } catch {
          setAdjustmentItems([]);
        }
      } else {
        setAmount(student.standard_tuition || 0);
        setNote("");
        setAdjustmentItems([]);
      }
    }
  }, [student, selectedMonth, isOpen]);

  // Compute total with items
  const baseStandard = student?.standard_tuition || 0;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount) return;

    const newItem: TuitionAdjustmentItem = {
      id: `it-${Date.now()}`,
      name: newItemName.trim(),
      type: newItemType,
      amount: Math.abs(Number(newItemAmount)),
    };

    const nextItems = [...adjustmentItems, newItem];
    setAdjustmentItems(nextItems);
    
    // Auto calculate final tuition based on standard tuition + adjustments
    const netAdjustment = nextItems.reduce(
      (acc, it) => acc + (it.type === "add" ? it.amount : -it.amount),
      0
    );
    setAmount(Math.max(0, baseStandard + netAdjustment));

    // Auto-update note summary
    const summary = nextItems.map(i => `${i.type === "add" ? "+" : "-"}${formatVND(i.amount)} (${i.name})`).join(", ");
    setNote(summary);

    setNewItemName("");
    setNewItemAmount(50000);
  };

  const handleRemoveItem = (id: string) => {
    const nextItems = adjustmentItems.filter((it) => it.id !== id);
    setAdjustmentItems(nextItems);

    const netAdjustment = nextItems.reduce(
      (acc, it) => acc + (it.type === "add" ? it.amount : -it.amount),
      0
    );
    setAmount(Math.max(0, baseStandard + netAdjustment));
    const summary = nextItems.map(i => `${i.type === "add" ? "+" : "-"}${formatVND(i.amount)} (${i.name})`).join(", ");
    setNote(summary);
  };

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
          items_json: JSON.stringify(adjustmentItems),
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Chỉnh Sửa Học Phí Riêng Tháng
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Học sinh: <span className="font-bold text-slate-800 dark:text-slate-200">{student.name}</span> ({student.phone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4.5">
          {/* Month Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Tháng áp dụng điều chỉnh <span className="text-rose-500">*</span>
            </label>
            <div>
              <MonthPicker
                value={month}
                onChange={(newM) => setMonth(newM)}
                monthFormat={monthFormat}
                className="w-full"
              />
            </div>
          </div>

          {/* Reference Info Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Học phí chuẩn mặc định</span>
              <span className="font-black text-slate-800 dark:text-slate-100 text-sm mt-0.5 block">
                {formatVND(student.standard_tuition)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Trạng thái tháng này</span>
              {hasCurrentOverride ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 mt-0.5">
                  <Sparkles className="w-3 h-3" /> Đã tùy chỉnh riêng
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Theo chuẩn mặc định
                </span>
              )}
            </div>
          </div>

          {/* Bóc Tách Hóa Đơn: Các Khoản Phụ Thu (+) & Giảm Trừ (-) */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Bóc Tách Khoản Thu / Giảm Trừ Phát Sinh</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Tự động cộng dồn vào tổng học phí</span>
            </div>

            {/* Form thêm khoản phụ thu/giảm trừ */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <div className="sm:col-span-3">
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as "add" | "deduct")}
                  className={`w-full px-2.5 py-1.5 text-xs font-bold rounded-xl border outline-none ${
                    newItemType === "add"
                      ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300"
                  }`}
                >
                  <option value="add">+ Phụ thu</option>
                  <option value="deduct">- Giảm trừ</option>
                </select>
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Tên khoản (sách, tập nhạc, nghỉ lễ...)"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="number"
                  step="10000"
                  min="0"
                  placeholder="Số tiền"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(Number(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 text-xs font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full h-full py-1.5 flex items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-xs"
                  title="Thêm khoản thu/trừ"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Danh sách các khoản đã thêm */}
            {adjustmentItems.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                {adjustmentItems.map((it) => (
                  <div
                    key={it.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold ${
                      it.type === "add"
                        ? "bg-amber-100/70 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200/80"
                        : "bg-blue-100/70 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs px-1.5 py-0.2 rounded bg-white/60 dark:bg-black/30">
                        {it.type === "add" ? "+ Phụ thu" : "- Giảm trừ"}
                      </span>
                      <span>{it.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black">
                        {it.type === "add" ? "+" : "-"}{formatVND(it.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Tổng số tiền học phí cuối cùng (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="number"
                min="0"
                step="50000"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                placeholder="Nhập số tiền..."
                className="w-full pl-10 pr-4 py-2.5 text-base font-black text-amber-600 dark:text-amber-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1 font-medium">
              <span>Định dạng hiển thị:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{formatVND(amount)}</span>
            </div>
          </div>

          {/* Note / Reason */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Ghi chú lý do tùy chỉnh (Hiển thị nhãn tag)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú lý do điều chỉnh học phí..."
                className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Lưu ý: Mức điều chỉnh này chỉ áp dụng riêng cho {formatMonthDisplay(month, monthFormat)}. Các tháng khác vẫn tính theo học phí chuẩn mặc định.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            {hasCurrentOverride ? (
              <button
                type="button"
                onClick={handleResetToStandard}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại về chuẩn</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4 stroke-[2.5]" />
                {isSaving ? "Đang lưu..." : "Lưu điều chỉnh"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
