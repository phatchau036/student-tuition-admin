"use client";

import React, { useState, useEffect } from "react";
import {
  Phone,
  User,
  GraduationCap,
  Calendar,
  Clock,
  DollarSign,
  CalendarCheck,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Sparkles,
  LogOut,
  ChevronRight,
  Plus,
  MessageCircle,
  ExternalLink,
  ShieldAlert,
  MessageSquareHeart,
  Star,
  Send,
} from "lucide-react";
import Link from "next/link";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { MonthFormat, AppLanguage } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

interface MakeupItem {
  id: string;
  absence_date: string;
  absence_reason?: string;
  status: "pending" | "scheduled" | "completed";
  makeup_date?: string;
  makeup_time?: string;
  note?: string;
}

interface StudentData {
  id: string;
  name: string;
  phone: string;
  zalo_link?: string;
  school_name: string;
  school_address?: string;
  school_phone?: string;
  level_name: string;
  teacher_name: string;
  teacher_phone: string;
  teacher_color?: string;
  duration_mode: string;
  sessions_per_week: number;
  hours_per_week: number;
  registered_days: string;
  study_time_detail?: string;
  current_month: string;
  current_tuition: number;
  standard_tuition: number;
  is_paid?: boolean;
  is_overdue?: boolean;
  unpaid_months_count?: number;
  previous_debt_amount?: number;
  total_tuition_due?: number;
  is_override: boolean;
  override_note?: string;
  makeups: MakeupItem[];
}

interface SlotOccupancy {
  slot_id: string;
  slot_name: string;
  time_range: string;
  max_capacity: number;
  regular_count: number;
  makeup_count: number;
  total_occupied: number;
  occupancy_rate: number;
  is_full: boolean;
  is_crowded: boolean;
}

export default function ParentPortal() {
  const { language, setLanguage, t } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [monthFormat, setMonthFormat] = useState<MonthFormat>("vietnamese");
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Absence modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [absenceDate, setAbsenceDate] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);

  // Makeup scheduling modal
  const [schedulingItem, setSchedulingItem] = useState<MakeupItem | null>(null);
  const [makeupDate, setMakeupDate] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [makeupTime, setMakeupTime] = useState("");
  const [makeupNote, setMakeupNote] = useState("");
  const [occupancySlots, setOccupancySlots] = useState<SlotOccupancy[]>([]);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(false);
  const [dayNameVi, setDayNameVi] = useState("");
  const [isSubmittingMakeup, setIsSubmittingMakeup] = useState(false);

  // Feedback modal for parents
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState<"teaching" | "facility" | "tuition" | "schedule" | "other">("teaching");
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [parentNameInput, setParentNameInput] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check saved login
  useEffect(() => {
    const savedPhone = localStorage.getItem("parent_phone");
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      handleLoginWithPhone(savedPhone);
    }
  }, []);

  const handleLoginWithPhone = async (phoneToAuth: string) => {
    if (!phoneToAuth || !phoneToAuth.trim()) {
      showToast("Vui lòng nhập số điện thoại!", "error");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", phone: phoneToAuth.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStudents(data.data.students || []);
        if (data.data.month_format) {
          setMonthFormat(data.data.month_format);
        }
        setIsLoggedIn(true);
        localStorage.setItem("parent_phone", phoneToAuth.trim());
      } else {
        showToast(data.message || "Không tìm thấy học sinh với số điện thoại này!", "error");
      }
    } catch {
      showToast("Lỗi kết nối đến máy chủ!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("parent_phone");
    setIsLoggedIn(false);
    setStudents([]);
    setPhoneNumber("");
  };

  const activeStudent = students[activeStudentIndex] || null;

  // Refresh student data
  const refreshStudentData = async () => {
    if (phoneNumber) {
      await handleLoginWithPhone(phoneNumber);
    }
  };

  // Handle report absence
  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !absenceDate) {
      showToast("Vui lòng chọn ngày muốn báo nghỉ!", "error");
      return;
    }

    try {
      setIsSubmittingAbsence(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_absence",
          student_id: activeStudent.id,
          absence_date: absenceDate,
          absence_reason: absenceReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã báo nghỉ thành công! Quý phụ huynh đã được cộng 1 suất học bù.", "success");
        setIsReportModalOpen(false);
        setAbsenceDate("");
        setAbsenceReason("");
        refreshStudentData();
      } else {
        showToast(data.message || "Báo nghỉ thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối mạng", "error");
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

  // Query occupancy when makeup date changes
  useEffect(() => {
    if (!makeupDate) {
      setOccupancySlots([]);
      setSelectedSlotId("");
      return;
    }

    const fetchOccupancy = async () => {
      try {
        setIsLoadingOccupancy(true);
        const res = await fetch(`/api/classes/occupancy?date=${makeupDate}`);
        const json = await res.json();
        if (json.success) {
          setOccupancySlots(json.data.slots || []);
          setDayNameVi(json.data.day_name || "");

          const firstNonFull = (json.data.slots as SlotOccupancy[]).find((s) => !s.is_full);
          if (firstNonFull) {
            setSelectedSlotId(firstNonFull.slot_id);
            setMakeupTime(firstNonFull.time_range);
          } else {
            setSelectedSlotId("");
            setMakeupTime("");
          }
        }
      } catch {
        console.error("Failed to load occupancy");
      } finally {
        setIsLoadingOccupancy(false);
      }
    };

    fetchOccupancy();
  }, [makeupDate]);

  // Handle schedule makeup
  const handleScheduleMakeup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingItem || !makeupDate || !selectedSlotId) {
      showToast("Vui lòng chọn ngày và khung giờ học bù!", "error");
      return;
    }

    try {
      setIsSubmittingMakeup(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_makeup",
          makeup_id: schedulingItem.id,
          makeup_date: makeupDate,
          time_slot_id: selectedSlotId,
          makeup_time: makeupTime,
          note: makeupNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setSchedulingItem(null);
        setMakeupDate("");
        setSelectedSlotId("");
        setMakeupNote("");
        refreshStudentData();
      } else {
        showToast(data.message || "Xếp lịch học bù thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối mạng", "error");
    } finally {
      setIsSubmittingMakeup(false);
    }
  };

  // Handle submit feedback
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) {
      showToast("Vui lòng nhập nội dung góp ý!", "error");
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      const res = await fetch("/api/feedbacks/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: "school-default",
          student_name: activeStudent?.name || "",
          parent_name: parentNameInput.trim() || undefined,
          parent_phone: phoneNumber || "",
          category: feedbackCategory,
          rating: feedbackRating,
          content: feedbackContent.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Cảm ơn quý phụ huynh! Ý kiến đóng góp đã được gửi tới Ban Quản Trị trung tâm.", "success");
        setFeedbackContent("");
        setFeedbackRating(5);
        setIsFeedbackModalOpen(false);
      } else {
        showToast(data.message || "Không thể gửi góp ý!", "error");
      }
    } catch {
      showToast("Lỗi kết nối mạng!", "error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans pb-16 sm:pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-md sm:max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/30 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Cổng Phụ Huynh
                </span>
                {activeStudent?.school_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <Building2 className="w-3 h-3" />
                    <span className="line-clamp-1">{activeStudent.school_name}</span>
                  </span>
                )}
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {isLoggedIn && activeStudent ? activeStudent.name : "Tra Cứu & Đăng Ký Học Bù"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Language Dropdown */}
            <select
              value={language}
              onChange={(e) => {
                const newL = e.target.value as AppLanguage;
                setLanguage(newL);
                setMonthFormat(newL === "vi" ? "vietnamese" : newL === "zh" ? "chinese" : newL === "ja" ? "japanese" : "english");
              }}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="vi">🇻🇳 VI</option>
              <option value="en">🇬🇧 EN</option>
              <option value="zh">🇨🇳 中文</option>
              <option value="ja">🇯🇵 日本語</option>
            </select>

            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.logout}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md sm:max-w-xl w-full mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* LOGIN SCREEN */}
        {!isLoggedIn ? (
          <div className="mt-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
                <Phone className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Đăng Nhập Phụ Huynh</h2>
              <p className="text-xs text-slate-500">
                Nhập số điện thoại đã đăng ký với trung tâm để tra cứu lịch học, học phí và đăng ký học bù.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLoginWithPhone(phoneNumber);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số điện thoại đăng ký:
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Nhập số điện thoại đã đăng ký"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 text-base font-semibold tracking-wider rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 text-center"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Đang tra cứu...</span>
                ) : (
                  <>
                    <span>Tra Cứu Lịch Học & Học Bù</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400">
                Nếu quý phụ huynh gặp khó khăn khi đăng nhập, vui lòng liên hệ hotline trung tâm.
              </p>
            </div>
          </div>
        ) : (
          /* PARENT DASHBOARD AFTER LOGIN */
          <div className="space-y-4">
            {/* If parent has multiple children registered */}
            {students.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {students.map((st, idx) => (
                  <button
                    key={st.id}
                    onClick={() => setActiveStudentIndex(idx)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                      activeStudentIndex === idx
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            )}

            {/* School Banner Card */}
            {activeStudent && (
              <div className="p-4 rounded-3xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-600/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-100 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {activeStudent.school_name}
                    </span>
                    <h2 className="text-xl font-black mt-0.5">{activeStudent.name}</h2>
                    <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md">
                      Trình độ: {activeStudent.level_name}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-emerald-100">
                      {activeStudent.is_overdue
                        ? `Tổng nợ (${activeStudent.unpaid_months_count} tháng)`
                        : `Học phí ${formatMonthDisplay(activeStudent.current_month, monthFormat)}`}
                    </p>
                    <p className={`text-lg font-black ${activeStudent.is_overdue ? "text-amber-200" : "text-white"}`}>
                      {activeStudent.is_overdue && activeStudent.total_tuition_due
                        ? formatVND(activeStudent.total_tuition_due)
                        : formatVND(activeStudent.current_tuition)}
                    </p>
                    {activeStudent.is_overdue && activeStudent.previous_debt_amount ? (
                      <span className="text-[10px] text-rose-200 font-bold block bg-rose-900/60 px-2 py-0.5 rounded mt-0.5">
                        * Nợ cũ: +{formatVND(activeStudent.previous_debt_amount)}
                      </span>
                    ) : activeStudent.is_override ? (
                      <span className="text-[10px] text-amber-200 font-semibold block">
                        Đã điều chỉnh học phí
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <p className="text-emerald-100 text-[11px]">Giáo viên phụ trách:</p>
                    <p className="font-bold mt-0.5">{activeStudent.teacher_name}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                    <p className="text-emerald-100 text-[11px]">Suất học bù khả dụng:</p>
                    <p className="font-extrabold text-amber-300 mt-0.5">
                      {activeStudent.makeups.filter((m) => m.status === "pending").length} buổi
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Details Card */}
            {activeStudent && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    <span>Lịch Học Trong Tuần</span>
                  </h3>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {activeStudent.duration_mode === "by_hours"
                      ? `${activeStudent.hours_per_week} tiếng / tuần`
                      : `${activeStudent.sessions_per_week} buổi / tuần`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Các ngày học: {activeStudent.registered_days || "Chưa chọn lịch"}
                  </p>
                  {activeStudent.study_time_detail && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{activeStudent.study_time_detail}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {activeStudent.teacher_phone && (
                      <a
                        href={`tel:${activeStudent.teacher_phone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                        <span>SĐT Giáo Viên</span>
                      </a>
                    )}
                    {activeStudent.school_phone && (
                      <a
                        href={`tel:${activeStudent.school_phone}`}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Hotline Trung Tâm</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions: Report Absence & Feedback */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="py-3 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <CalendarCheck className="w-4 h-4 text-amber-600" />
                <span>Báo Nghỉ Học</span>
              </button>

              <button
                onClick={() => setIsFeedbackModalOpen(true)}
                className="py-3 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 border border-rose-200 dark:border-rose-800/60 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <MessageSquareHeart className="w-4 h-4 text-rose-600" />
                <span>Góp Ý Cho Trung Tâm</span>
              </button>
            </div>

            {/* Makeups Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Danh Sách Buổi Báo Nghỉ & Học Bù</span>
                </h3>
              </div>

              {activeStudent && activeStudent.makeups.length === 0 && (
                <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
                  <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p>Bé đi học đầy đủ! Chưa có ngày nghỉ nào cần xếp lịch học bù.</p>
                </div>
              )}

              {activeStudent?.makeups.map((mk) => (
                <div
                  key={mk.id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Nghỉ ngày: {mk.absence_date}
                        </span>
                        {mk.status === "pending" && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                            Chưa chọn ngày bù
                          </span>
                        )}
                        {mk.status === "scheduled" && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200">
                            Đã xếp lịch bù
                          </span>
                        )}
                        {mk.status === "completed" && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                            Đã học xong
                          </span>
                        )}
                      </div>
                      {mk.absence_reason && (
                        <p className="text-xs text-slate-500 mt-1">Lý do: {mk.absence_reason}</p>
                      )}
                    </div>

                    {mk.status === "pending" && (
                      <button
                        onClick={() => {
                          setSchedulingItem(mk);
                          setMakeupDate("");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition shrink-0"
                      >
                        Chọn Lịch Bù
                      </button>
                    )}
                  </div>

                  {mk.status === "scheduled" && (
                    <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lịch học bù: {mk.makeup_date}</span>
                        </span>
                        {mk.makeup_time && (
                          <span className="text-blue-700 font-semibold">{mk.makeup_time}</span>
                        )}
                      </div>
                      {mk.note && <p className="text-slate-500 text-[11px]">Ghi chú: {mk.note}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal: Báo nghỉ học */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                <span>Báo Nghỉ Học</span>
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Quý phụ huynh chọn ngày bé xin phép nghỉ. Hệ thống sẽ tự động lưu lại 1 buổi học bù để quý vị chọn lịch bù sau.
            </p>

            <form onSubmit={handleReportAbsence} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày xin nghỉ *
                </label>
                <input
                  type="date"
                  required
                  value={absenceDate}
                  onChange={(e) => setAbsenceDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do xin nghỉ
                </label>
                <input
                  type="text"
                  placeholder="Nhập lý do xin nghỉ học..."
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAbsence}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30 disabled:opacity-50"
                >
                  {isSubmittingAbsence ? "Đang lưu..." : "Xác Nhận Báo Nghỉ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chọn Lịch Học Bù (với kiểm tra sĩ số, cảnh báo Lớp đông / Khóa Hết suất) */}
      {schedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                <span>Xếp Lịch Học Bù</span>
              </h3>
              <button
                onClick={() => setSchedulingItem(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Bù cho buổi nghỉ ngày: <span className="font-bold text-slate-800 dark:text-white">{schedulingItem.absence_date}</span>
            </p>

            <form onSubmit={handleScheduleMakeup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Chọn ngày muốn học bù *
                </label>
                <input
                  type="date"
                  required
                  value={makeupDate}
                  onChange={(e) => setMakeupDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Slot picker with occupancy status */}
              {makeupDate && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    2. Chọn khung giờ (Hệ thống kiểm tra sĩ số thời gian thực):
                  </label>

                  {isLoadingOccupancy ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Đang kiểm tra sĩ số các lớp trong ngày {makeupDate}...
                    </div>
                  ) : occupancySlots.length === 0 ? (
                    <div className="p-3 text-xs text-center text-slate-400 bg-slate-50 rounded-xl">
                      Không tìm thấy ca học nào cho ngày này.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {occupancySlots.map((slot) => {
                        const isSelected = selectedSlotId === slot.slot_id;
                        return (
                          <div
                            key={slot.slot_id}
                            onClick={() => {
                              if (!slot.is_full) {
                                setSelectedSlotId(slot.slot_id);
                                setMakeupTime(slot.time_range);
                              }
                            }}
                            className={`p-3 rounded-xl border text-xs transition flex items-center justify-between ${
                              slot.is_full
                                ? "opacity-60 bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 cursor-not-allowed select-none"
                                : isSelected
                                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 cursor-pointer"
                                : "bg-white dark:bg-slate-800 border-slate-200 hover:border-amber-300 cursor-pointer"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${slot.is_full ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                                  {slot.time_range}
                                </span>
                                {slot.is_full ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Hết suất ({slot.total_occupied}/{slot.max_capacity})
                                  </span>
                                ) : slot.is_crowded ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Lớp đông ({slot.occupancy_rate}%)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Còn chỗ ({slot.total_occupied}/{slot.max_capacity})
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{slot.slot_name}</p>
                            </div>

                            <input
                              type="radio"
                              name="slot"
                              disabled={slot.is_full}
                              checked={isSelected}
                              onChange={() => {
                                if (!slot.is_full) {
                                  setSelectedSlotId(slot.slot_id);
                                  setMakeupTime(slot.time_range);
                                }
                              }}
                              className="text-amber-600 focus:ring-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú cho giáo viên (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú nội dung muốn học bù..."
                  value={makeupNote}
                  onChange={(e) => setMakeupNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSchedulingItem(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMakeup || !selectedSlotId}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/30 disabled:opacity-50"
                >
                  {isSubmittingMakeup ? "Đang xếp lịch..." : "Xác Nhận Lịch Học Bù"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Góp ý cho Trung Tâm từ Phụ Huynh */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquareHeart className="w-5 h-5 text-rose-600" />
                <span>Ý Kiến Đóng Góp Cho Trung Tâm</span>
              </h3>
              <button
                onClick={() => setIsFeedbackModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Mọi ý kiến của quý phụ huynh về giáo viên, cơ sở vật chất, lịch học hoặc học phí đều giúp trung tâm nâng cao chất lượng phục vụ các bé tốt hơn.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-3.5">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chủ đề góp ý:
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="teaching">Chất lượng giảng dạy & Giáo viên</option>
                  <option value="facility">Cơ sở vật chất & Phòng học</option>
                  <option value="schedule">Lịch học, điểm danh & Học bù</option>
                  <option value="tuition">Học phí & Chính sách ưu đãi</option>
                  <option value="other">Ý kiến đóng góp khác</option>
                </select>
              </div>

              {/* Star Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Đánh giá mức độ hài lòng:
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className="p-1 transition hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= feedbackRating
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1">
                    {feedbackRating === 5
                      ? "Rất hài lòng (5/5)"
                      : feedbackRating === 4
                      ? "Hài lòng (4/5)"
                      : feedbackRating === 3
                      ? "Bình thường (3/5)"
                      : feedbackRating === 2
                      ? "Chưa hài lòng (2/5)"
                      : "Cần cải thiện (1/5)"}
                  </span>
                </div>
              </div>

              {/* Parent Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ tên phụ huynh (Tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Để trống nếu muốn ẩn danh"
                  value={parentNameInput}
                  onChange={(e) => setParentNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung đóng góp ý kiến <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Kính mong quý phụ huynh chia sẻ cụ thể để trung tâm hỗ trợ tốt nhất..."
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFeedbackModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedbackContent.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingFeedback ? "Đang gửi..." : "Gửi Ý Kiến"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
