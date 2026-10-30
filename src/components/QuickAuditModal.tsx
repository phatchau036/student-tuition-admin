"use client";

import React, { useState, useEffect } from "react";
import { Student, MonthFormat, TuitionPackage } from "@/lib/types";
import { formatVND, formatMonthDisplay, getPreviousMonthStr, getNextMonthStr } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import {
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Calendar,
  Sparkles,
  Layers,
  Save,
  Check,
  RotateCcw,
} from "lucide-react";

interface QuickAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  selectedMonth: string;
  monthFormat?: MonthFormat;
  tuitionPackages: TuitionPackage[];
  onSuccess: () => void;
}

export const QuickAuditModal: React.FC<QuickAuditModalProps> = ({
  isOpen,
  onClose,
  student,
  selectedMonth,
  monthFormat = "vietnamese",
  tuitionPackages,
  onSuccess,
}) => {
  const { showToast } = useToast();

  // Mode: "current_month" (Chọn nhanh Đã đóng/Chưa đóng cho tháng này hoặc khóa) | "multi_months" (Tick chọn từng tháng)
  const [auditMode, setAuditMode] = useState<"quick_choice" | "matrix">("quick_choice");
  const [selectedPackageId, setSelectedPackageId] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [auditNote, setAuditNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Danh sách các tháng hiển thị (từ 5 tháng trước đến 3 tháng tới)
  const [monthsList, setMonthsList] = useState<string[]>([]);
  // Trạng thái tick đóng tiền của từng tháng: Record<YYYY-MM, boolean>
  const [monthStatusMap, setMonthStatusMap] = useState<Record<string, boolean>>({});
  const [originalMonthStatusMap, setOriginalMonthStatusMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && student) {
      setCustomAmount(student.current_tuition || 0);
      setSelectedPackageId(student.tuition_package_id || "");
      setAuditNote("");

      // Sinh danh sách 9 tháng (4 tháng trước, tháng hiện tại, 4 tháng tới)
      const list: string[] = [];
      let cur = selectedMonth;
      // lùi 4 tháng
      for (let i = 0; i < 4; i++) {
        cur = getPreviousMonthStr(cur);
      }
      for (let i = 0; i < 9; i++) {
        list.push(cur);
        cur = getNextMonthStr(cur);
      }
      setMonthsList(list);

      // Tải lịch sử thanh toán từ API
      loadPaymentsHistory(student.id, list);
    }
  }, [isOpen, student, selectedMonth]);

  const loadPaymentsHistory = async (studentId: string, months: string[]) => {
    try {
      const res = await fetch(`/api/payments?student_id=${studentId}`);
      const json = await res.json();
      const statusMap: Record<string, boolean> = {};

      if (json.success && Array.isArray(json.data)) {
        const payments = json.data;
        for (const m of months) {
          const isCovered = payments.some(
            (p: any) => p.status === "paid" && m >= p.start_period && m <= p.end_period
          );
          statusMap[m] = isCovered;
        }
      } else {
        // Fallback: tháng hiện tại lấy theo payment_status
        for (const m of months) {
          statusMap[m] = m === selectedMonth ? student?.payment_status === "paid" : false;
        }
      }

      setMonthStatusMap(statusMap);
      setOriginalMonthStatusMap(statusMap);
    } catch {
      const statusMap: Record<string, boolean> = {};
      for (const m of months) {
        statusMap[m] = m === selectedMonth ? student?.payment_status === "paid" : false;
      }
      setMonthStatusMap(statusMap);
      setOriginalMonthStatusMap(statusMap);
    }
  };

  if (!isOpen || !student) return null;

  const isCurrentPaid = student.payment_status === "paid";

  // Thao tác 1: Chọn trực tiếp Đã đóng (hỗ trợ theo gói/khóa hoặc tháng đơn)
  const handleConfirmPaid = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_paid",
          student_id: student.id,
          month: selectedMonth,
          package_id: selectedPackageId || undefined,
          amount: customAmount,
          note: auditNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        onSuccess();
        onClose();
      } else {
        showToast(data.message || "Lỗi khi cập nhật!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thao tác 2: Chọn Chuyển thành Chưa đóng
  const handleConfirmUnpaid = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_unpaid",
          student_id: student.id,
          month: selectedMonth,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        onSuccess();
        onClose();
      } else {
        showToast(data.message || "Lỗi khi cập nhật!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Thao tác 3: Lưu ma trận tick từng tháng
  const handleSaveMatrix = async () => {
    const paidMonths: string[] = [];
    const unpaidMonths: string[] = [];

    for (const m of monthsList) {
      const nowChecked = Boolean(monthStatusMap[m]);
      const wasChecked = Boolean(originalMonthStatusMap[m]);

      if (nowChecked && !wasChecked) {
        paidMonths.push(m);
      } else if (!nowChecked && wasChecked) {
        unpaidMonths.push(m);
      }
    }

    if (paidMonths.length === 0 && unpaidMonths.length === 0) {
      showToast("Không có thay đổi nào cần lưu!", "info");
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_months_status",
          student_id: student.id,
          paid_months: paidMonths,
          unpaid_months: unpaidMonths,
          amount: customAmount,
          package_id: selectedPackageId || undefined,
          note: auditNote.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        onSuccess();
        onClose();
      } else {
        showToast(data.message || "Cập nhật thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Đối Soát Học Phí Nhanh</span>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {student.student_code || `HS${student.id.slice(-4).toUpperCase()}`}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Học sinh: <strong className="text-slate-800 dark:text-slate-200">{student.name}</strong> • Kỳ đối soát: <strong className="text-indigo-600">{formatMonthDisplay(selectedMonth, monthFormat)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setAuditMode("quick_choice")}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              auditMode === "quick_choice"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đối Soát Kỳ {formatMonthDisplay(selectedMonth, monthFormat)}</span>
          </button>

          <button
            type="button"
            onClick={() => setAuditMode("matrix")}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              auditMode === "matrix"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Tick Chọn Từng Tháng (Đã / Chưa Đóng)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Chế độ 1: Chọn nhanh Đã Đóng / Chưa Đóng */}
          {auditMode === "quick_choice" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Hiện trạng thái hiện tại */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Trạng thái hiện tại kỳ {formatMonthDisplay(selectedMonth, monthFormat)}:
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {isCurrentPaid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Đã Hoàn Tất Học Phí</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Cần Đóng Tiền</span>
                      </span>
                    )}
                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      Mức phí: {formatVND(student.current_tuition)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Gói áp dụng:</span>
                  <span className="text-xs font-black text-indigo-600">
                    {student.tuition_package_name || "Gói chuẩn"}
                  </span>
                </div>
              </div>

              {/* Tùy chọn chuyển trạng thái */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Chọn hành động đối soát:
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Nút 1: Đánh dấu Đã Đóng */}
                  <div
                    onClick={() => {}}
                    className={`p-3.5 rounded-2xl border-2 transition flex flex-col justify-between gap-2 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>1. Đã Đóng Học Phí</span>
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Xác nhận học sinh đã hoàn tất học phí kỳ này (hỗ trợ đóng theo khóa 3 tháng, 6 tháng nếu chọn gói bên dưới).
                    </p>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmPaid}
                      className="w-full mt-1 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                    >
                      {isSubmitting ? "Đang lưu..." : "Xác Nhận ĐÃ ĐÓNG"}
                    </button>
                  </div>

                  {/* Nút 2: Đánh dấu Cần Đóng Tiền */}
                  <div
                    className={`p-3.5 rounded-2xl border-2 transition flex flex-col justify-between gap-2 bg-rose-50/40 dark:bg-rose-950/20 border-rose-500`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>2. Cần Đóng Tiền</span>
                      </span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Chuyển tháng này về trạng thái Chưa đóng. Các tháng trước đó đã đóng vẫn được bảo lưu an toàn.
                    </p>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmUnpaid}
                      className="w-full mt-1 py-2 text-xs font-black rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition"
                    >
                      {isSubmitting ? "Đang lưu..." : "Chuyển CẦN ĐÓNG"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Tùy chỉnh gói & số tiền khi xác nhận đóng */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Tùy chỉnh kỳ đóng học phí (Tùy chọn):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Chọn Gói học phí:
                    </label>
                    <select
                      value={selectedPackageId}
                      onChange={(e) => {
                        const pkgId = e.target.value;
                        setSelectedPackageId(pkgId);
                        const found = tuitionPackages.find((p) => p.id === pkgId);
                        if (found) setCustomAmount(found.amount);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                    >
                      <option value="">-- Gói 1 tháng chuẩn ({formatVND(student.current_tuition)}) --</option>
                      {tuitionPackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name} ({formatVND(pkg.amount)} - {pkg.cycle_value} {pkg.cycle_unit === "week" ? "tuần" : "tháng"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Số tiền thực thu (VNĐ):
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={customAmount === 0 ? "" : customAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomAmount(val === "" ? 0 : Number(val));
                      }}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Ghi chú đối soát (VD: Chuyển khoản VietQR, đóng tiền mặt...):
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập ghi chú thanh toán nếu có..."
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Chế độ 2: Ma trận chọn từng tháng (Tick Đã Đóng / Chưa Đóng) */}
          {auditMode === "matrix" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 leading-relaxed">
                <span className="font-bold block mb-0.5">Quản lý đóng học phí chi tiết theo từng tháng:</span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  Tick chọn <strong className="text-emerald-700 dark:text-emerald-400">Xanh lá</strong> = Đã đóng học phí. Bỏ tick = Cần đóng tiền. Bạn có thể tick chọn nhiều tháng cùng lúc và bấm Lưu để hệ thống cập nhật đồng loạt.
                </p>
              </div>

              {/* Grid 9 Tháng */}
              <div className="grid grid-cols-3 gap-2.5">
                {monthsList.map((m) => {
                  const isChecked = Boolean(monthStatusMap[m]);
                  const isCurrent = m === selectedMonth;

                  return (
                    <div
                      key={m}
                      onClick={() => {
                        setMonthStatusMap((prev) => ({
                          ...prev,
                          [m]: !prev[m],
                        }));
                      }}
                      className={`p-3 rounded-2xl border-2 cursor-pointer transition select-none flex flex-col justify-between gap-1.5 ${
                        isChecked
                          ? "bg-emerald-50/70 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-600 shadow-2xs"
                          : "bg-rose-50/40 border-rose-300 hover:border-rose-400 dark:bg-rose-950/20 dark:border-rose-900/60"
                      } ${isCurrent ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                          {formatMonthDisplay(m, monthFormat)}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center transition ${
                            isChecked
                              ? "bg-emerald-600 text-white"
                              : "border border-rose-300 dark:border-rose-800 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span
                          className={`font-bold ${
                            isChecked ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {isChecked ? "Đã đóng" : "Cần đóng"}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded font-black text-[9px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            Tháng đang xem
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nút bấm lưu thay đổi ma trận */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMonthStatusMap(originalMonthStatusMap)}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Hoàn tác thay đổi</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveMatrix}
                  className="px-5 py-2 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Đang lưu..." : "Lưu Trạng Thái Các Tháng"}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end bg-slate-50/70 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
