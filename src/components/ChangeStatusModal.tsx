"use client";

import React, { useState } from "react";
import { Student, StudentStatus } from "@/lib/types";
import { X, Calendar, Clock, AlertCircle, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/Toast";

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onSaved: () => void;
  schoolId?: string;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  student,
  onSaved,
  schoolId,
}) => {
  const { showToast } = useToast();
  const [actionType, setActionType] = useState<"reserve" | "drop" | "resume">("reserve");
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [returnDate, setReturnDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !student) return null;

  const currentStatus: StudentStatus = student.status || "studying";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveDate) {
      showToast("Vui lòng chọn ngày có hiệu lực!", "error");
      return;
    }

    if (actionType === "reserve" && !returnDate) {
      showToast("Vui lòng nhập ngày dự kiến học lại!", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (schoolId) headers["x-school-id"] = schoolId;

      const res = await fetch("/api/students/status", {
        method: "POST",
        headers,
        body: JSON.stringify({
          student_id: student.id,
          action_type: actionType,
          effective_date: effectiveDate,
          return_date: actionType === "reserve" ? returnDate : undefined,
          reason: reason.trim(),
          school_id: schoolId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        onSaved();
        onClose();
      } else {
        showToast(data.message || "Cập nhật trạng thái thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Chuyển Trạng Thái Học Sinh
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Học sinh: <strong className="text-slate-800 dark:text-slate-200">{student.name}</strong> ({student.phone})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Action Choice Tabs */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
              Chọn thao tác chuyển:
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              {/* Option 1: Bảo lưu */}
              <button
                type="button"
                onClick={() => setActionType("reserve")}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition text-center ${
                  actionType === "reserve"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Bảo Lưu
              </button>

              {/* Option 2: Nghỉ học */}
              <button
                type="button"
                onClick={() => setActionType("drop")}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition text-center ${
                  actionType === "drop"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Nghỉ Học
              </button>

              {/* Option 3: Học tiếp */}
              <button
                type="button"
                onClick={() => setActionType("resume")}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition text-center ${
                  actionType === "resume"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Học Tiếp
              </button>
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {actionType === "resume" ? "Ngày bắt đầu học lại *" : "Ngày bắt đầu áp dụng *"}
            </label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Expected Return Date (Only for reserve) */}
          {actionType === "reserve" && (
            <div>
              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">
                Ngày dự kiến trở lại học tiếp *
              </label>
              <input
                type="date"
                required={actionType === "reserve"}
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Ghi nhận để trung tâm theo dõi và liên hệ nhắc phụ huynh khi đến ngày.
              </span>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Lý do (tùy chọn):
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Bận thi học kỳ, đi du lịch gia đình, chuyển nơi ở..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none resize-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-md transition disabled:opacity-50 ${
                actionType === "reserve"
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25"
                  : actionType === "drop"
                  ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/25"
                  : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25"
              }`}
            >
              {isSubmitting ? "Đang lưu..." : "Xác nhận chuyển"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
