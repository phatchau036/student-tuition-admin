"use client";

import React, { useState, useEffect } from "react";
import { Student, StudentStatusLog, StudentPayment } from "@/lib/types";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import {
  User,
  Phone,
  Calendar,
  Clock,
  Layers,
  GraduationCap,
  MessageSquare,
  History,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  UserX,
  UserCheck,
  X,
  CreditCard,
  Tag,
  ArrowRight,
  ExternalLink,
  Calculator,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  selectedMonth: string;
  onOpenStatusChange: (student: Student) => void;
  onOpenZaloReminder: (student: Student) => void;
  onReconciliationToggle: (student: Student) => void;
  onOpenWallet?: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  selectedMonth,
  onOpenStatusChange,
  onOpenZaloReminder,
  onReconciliationToggle,
  onOpenWallet,
}) => {
  const [statusLogs, setStatusLogs] = useState<StudentStatusLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "status_history" | "schedule">("info");

  useEffect(() => {
    if (isOpen && student) {
      loadStudentStatusLogs(student.id);
    }
  }, [isOpen, student]);

  const loadStudentStatusLogs = async (studentId: string) => {
    try {
      setIsLoadingLogs(true);
      const res = await fetch(`/api/status-logs?student_id=${studentId}`);
      const json = await res.json();
      if (json.success) {
        setStatusLogs(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load status logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  if (!isOpen || !student) return null;

  const status = student.status || "studying";
  const isPaid = student.payment_status === "paid";
  const zaloPhone = student.phone ? student.phone.replace(/\D/g, "") : "";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/25 shrink-0">
              {student.name ? student.name.trim().charAt(0).toUpperCase() : "H"}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {student.name}
                </h3>
                {status === "studying" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                    Đang học
                  </span>
                ) : status === "reserved" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                    Bảo lưu
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                    Nghỉ học
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                <span>SĐT: {student.phone}</span>
                <span>•</span>
                <span>Level: {student.level_name || "Chưa phân loại"}</span>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab("info")}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === "info"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Thông Tin & Học Phí
          </button>
          <button
            onClick={() => setActiveTab("status_history")}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === "status_history"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử Nghỉ / Bảo Lưu ({statusLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeTab === "schedule"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Lịch Học Chi Tiết
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === "info" && (
            <div className="space-y-4">
              {/* Status Alert Banner */}
              {status === "reserved" && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <PauseCircle className="w-4 h-4 text-amber-600" />
                      Học sinh đang trong thời gian BẢO LƯU
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      Ngày bắt đầu bảo lưu: <strong>{student.status_date || "Chưa ghi nhận"}</strong>
                    </p>
                    <p className="text-amber-900 dark:text-amber-200 font-extrabold">
                      Dự kiến học lại vào: {student.expected_return_date || "Chưa xác định"}
                    </p>
                    {student.status_note && (
                      <p className="text-slate-500 italic mt-0.5">&ldquo;{student.status_note}&rdquo;</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenStatusChange(student);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/30 shrink-0 transition"
                  >
                    Đổi trạng thái
                  </button>
                </div>
              )}

              {/* Banner khi học sinh Đang học: Cho phép chuyển nhanh sang bảo lưu */}
              {status === "studying" && (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                      Học sinh muốn tạm dừng một thời gian?
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStatusChange(student);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25 border border-amber-300 dark:border-amber-500/30 shrink-0 transition"
                  >
                    Chuyển vào bảo lưu
                  </button>
                </div>
              )}

              {status === "dropped" && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                      <UserX className="w-4 h-4 text-rose-600" />
                      Học sinh đã NGHỈ HỌC
                    </span>
                    <p className="text-slate-600 dark:text-slate-400">
                      Ngày nghỉ học: <strong>{student.status_date || "Chưa ghi nhận"}</strong>
                    </p>
                    {student.status_note && (
                      <p className="text-slate-500 italic mt-0.5">&ldquo;{student.status_note}&rdquo;</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      onClose();
                      onOpenStatusChange(student);
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/30 shrink-0 transition"
                  >
                    Cho học lại tiếp
                  </button>
                </div>
              )}

              {/* Tuition & Billing Box */}
              <div className="p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    Học Phí & Đối Soát ({formatMonthDisplay(selectedMonth)})
                  </span>
                  <span className="text-xs font-extrabold text-indigo-600">
                    {student.tuition_package_name ? `Gói: ${student.tuition_package_name}` : "Gói chuẩn"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className={`p-3 bg-white dark:bg-slate-900 rounded-xl border ${student.is_overdue ? "border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20" : "border-slate-200 dark:border-slate-700/70"}`}>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Số tiền cần đóng</span>
                    <span className={`text-lg font-black mt-0.5 block ${student.is_overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                      {student.total_tuition_due ? formatVND(student.total_tuition_due) : formatVND(student.current_tuition)}
                    </span>
                    {student.is_overdue && student.previous_debt_amount ? (
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                        * Bao gồm nợ cũ: +{formatVND(student.previous_debt_amount)} (Nợ {student.unpaid_months_count} tháng)
                      </span>
                    ) : student.monthly_override ? (
                      <div className="mt-1 space-y-0.5">
                        <span className="text-[10px] text-amber-600 font-bold block">
                          * Đã điều chỉnh riêng tháng này
                        </span>
                        {(() => {
                          try {
                            const items = JSON.parse(student.monthly_override.items_json || "[]");
                            if (Array.isArray(items) && items.length > 0) {
                              return items.map((it: any) => (
                                <span key={it.id} className="text-[10px] text-slate-500 block">
                                  • {it.type === "add" ? "+" : "-"}{formatVND(it.amount)} ({it.name})
                                </span>
                              ));
                            }
                          } catch {}
                          return null;
                        })()}
                      </div>
                    ) : null}
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/70 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Trạng thái công nợ</span>
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã đóng học phí
                        </span>
                      ) : student.is_overdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white mt-1 shadow-xs animate-pulse">
                          <AlertCircle className="w-3.5 h-3.5" /> NỢ QUÁ HẠN ({student.unpaid_months_count} THÁNG)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Cần đóng tiền
                        </span>
                      )}
                    </div>
                    {student.payment_period_desc && (
                      <span className="text-[10px] text-slate-400 font-mono mt-1">
                        {student.payment_period_desc}
                      </span>
                    )}
                  </div>
                </div>

                {/* BẢNG KÊ CẤU THÀNH HỌC PHÍ CHI TIẾT (TỰ ĐỘNG CỘNG / TRỪ CÁC KHOẢN) */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-200 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <Calculator className="w-3.5 h-3.5" />
                      Chi tiết cấu thành học phí:
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      = {formatVND(student.current_tuition)}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    {/* 1. Học phí gốc (Gói hoặc Base) */}
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        • {student.tuition_package_name ? `Gói học phí (${student.tuition_package_name})` : "Mức học phí cơ bản"}:
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatVND(student.tuition_base_amount || (student.standard_tuition ? student.standard_tuition - (student.level_surcharge || 0) : 1000000))}
                      </span>
                    </div>

                    {/* 2. Phụ thu level (nếu có) */}
                    {student.level_surcharge && student.level_surcharge > 0 ? (
                      <div className="flex items-center justify-between py-0.5 text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Plus className="w-3 h-3 stroke-[2.5]" /> Phụ thu level ({student.level_name || "Trình độ"}):
                        </span>
                        <span className="font-mono font-black">
                          +{formatVND(student.level_surcharge)}
                        </span>
                      </div>
                    ) : null}

                    {/* 3. Chiết khấu giảm giá (nếu có) */}
                    {student.is_discount_enabled && student.discount_percent > 0 ? (
                      <div className="flex items-center justify-between py-0.5 text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Minus className="w-3 h-3 stroke-[2.5]" /> Chiết khấu riêng (-{student.discount_percent}%{student.discount_reason ? ` • ${student.discount_reason}` : ""}):
                        </span>
                        <span className="font-mono font-black">
                          -{formatVND(student.tuition_discount_amount || Math.round(((student.tuition_base_amount || 1000000) + (student.level_surcharge || 0)) * (student.discount_percent / 100)))}
                        </span>
                      </div>
                    ) : null}

                    {/* 4. Điều chỉnh riêng tháng này (nếu có override) */}
                    {student.monthly_override && (() => {
                      try {
                        const items = JSON.parse(student.monthly_override.items_json || "[]");
                        if (Array.isArray(items) && items.length > 0) {
                          return items.map((it: any) => (
                            <div
                              key={it.id}
                              className={`flex items-center justify-between py-0.5 ${
                                it.type === "add" ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              <span className="flex items-center gap-1 font-semibold">
                                {it.type === "add" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                Điều chỉnh tháng ({it.name}):
                              </span>
                              <span className="font-mono font-black">
                                {it.type === "add" ? "+" : "-"}{formatVND(it.amount)}
                              </span>
                            </div>
                          ));
                        }
                      } catch {}
                      return null;
                    })()}

                    {/* 5. Nợ cũ cộng dồn (nếu có) */}
                    {student.is_overdue && student.previous_debt_amount ? (
                      <div className="flex items-center justify-between py-0.5 text-rose-600 dark:text-rose-400 pt-1 border-t border-dashed border-rose-200 dark:border-rose-900/60">
                        <span className="flex items-center gap-1 font-extrabold">
                          <AlertCircle className="w-3 h-3" /> Nợ cũ tích lũy ({student.unpaid_months_count} tháng):
                        </span>
                        <span className="font-mono font-black">
                          +{formatVND(student.previous_debt_amount)}
                        </span>
                      </div>
                    ) : null}

                    {/* Tổng kết dòng tính toán */}
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase text-slate-500">
                        {student.total_tuition_due ? "Tổng thực thu cần đóng:" : "Học phí tháng này:"}
                      </span>
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {formatVND(student.total_tuition_due || student.current_tuition)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick actions for billing */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onReconciliationToggle(student)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 ${
                      isPaid
                        ? "bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isPaid ? "Hủy đánh dấu đã đóng" : "Đánh dấu ĐÃ ĐÓNG"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenZaloReminder(student);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Nhắc học phí Zalo</span>
                  </button>
                </div>
              </div>

              {/* General info list */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Môn học đào tạo:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {student.subject_name || "Chưa phân môn"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Ngày đăng ký học:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {student.start_date || "Chưa ghi nhận"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Giáo viên phụ trách:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {student.teacher_name || "Chưa gán giáo viên"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Chiết khấu / Giảm giá:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {student.is_discount_enabled && student.discount_percent > 0
                      ? `Giảm ${student.discount_percent}% ${student.discount_reason ? `(${student.discount_reason})` : ""}`
                      : "Không áp dụng"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Hình thức học:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {student.hours_per_week || 3} tiếng / tuần ({student.sessions_per_week || 3} buổi)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Kiểu lịch học:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-right">
                    {student.schedule_preset_name || student.registered_days || "Chưa chọn kiểu"}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 font-medium">Lịch học hàng tuần:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-right">
                    {student.registered_days || "Chưa chọn ngày"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Chi tiết ca học:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 text-right max-w-xs">
                    {student.study_time_detail || "Linh hoạt"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "status_history" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Lịch sử thay đổi trạng thái học tập
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenStatusChange(student);
                  }}
                  className="px-3 py-1 text-xs font-bold rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition"
                >
                  + Chuyển trạng thái mới
                </button>
              </div>

              {isLoadingLogs ? (
                <div className="py-12 text-center text-xs text-slate-400">Đang tải lịch sử...</div>
              ) : statusLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  Chưa có lịch sử bảo lưu hay nghỉ học nào cho học sinh này.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {statusLogs.map((log) => {
                    let badge = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
                    let label = "Bảo Lưu";
                    if (log.action_type === "drop") {
                      badge = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300";
                      label = "Nghỉ Học";
                    } else if (log.action_type === "resume") {
                      badge = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
                      label = "Học Tiếp";
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shrink-0 ${badge}`}>
                            {label}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              Ngày áp dụng: <strong>{log.effective_date}</strong>
                              {log.return_date && (
                                <span className="text-amber-600 dark:text-amber-400 ml-2 font-bold">
                                  (Dự kiến học lại: {log.return_date})
                                </span>
                              )}
                            </p>
                            {log.reason && (
                              <p className="text-slate-500 italic mt-0.5">&ldquo;{log.reason}&rdquo;</p>
                            )}
                          </div>
                        </div>

                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {log.logged_at}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "schedule" && (
            <div className="space-y-3">
              {/* ⭐ VÍ GIỜ HỌC: Card số dư ví giờ */}
              <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                    ⏱️ Ví Giờ Học
                  </p>
                  <p className="text-2xl font-black mt-0.5">
                    {(() => {
                      const avail = Number(student.available_minutes ?? 0);
                      const abs = Math.abs(avail);
                      const h = Math.floor(abs / 60);
                      const m = abs % 60;
                      const label = avail === 0 ? "0 phút" : h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m} phút`;
                      return `${avail < 0 ? "-" : ""}${label}`;
                    })()}
                  </p>
                  <p className="text-[10px] text-indigo-200 mt-0.5">
                    Số dư khả dụng (đã trừ bù đã xếp)
                  </p>
                </div>
                {onOpenWallet && (
                  <button
                    type="button"
                    onClick={() => onOpenWallet(student)}
                    className="px-3 py-1.5 text-xs font-black rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md text-white transition cursor-pointer shrink-0 border border-white/20"
                  >
                    Xem sổ cái →
                  </button>
                )}
              </div>

              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Chi tiết các buổi học trong tuần:
              </span>
              <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
                <p className="text-slate-700 dark:text-slate-300 font-semibold">
                  {student.study_time_detail || "Linh hoạt trong ca mở cửa"}
                </p>
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
                  Khung giờ tham chiếu: <strong>{student.time_slot_name || "Linh hoạt"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStatusChange(student);
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition"
          >
            Đổi trạng thái học (Bảo lưu / Nghỉ / Học tiếp)
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
