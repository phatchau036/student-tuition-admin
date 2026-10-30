"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Phone,
  User,
  GraduationCap,
  Calendar,
  CalendarDays,
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
  Sun,
  Moon,
  QrCode,
  CreditCard,
  Check,
  X,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { formatVND, formatMonthDisplay, generateUpcomingStudentSchedule, UpcomingLessonSession } from "@/lib/tuition";
import { MonthFormat, AppLanguage } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";

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
  school_id?: string;
  student_code?: string;
  name: string;
  phone: string;
  zalo_link?: string;
  zalo_chat_id?: string;
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
  schedule_details_json?: string;
  schedule_preset_name?: string;
  study_time_detail?: string;
  tuition_package_name?: string;
  tuition_formula_text?: string;
  tuition_base_amount?: number;
  level_surcharge?: number;
  tuition_discount_amount?: number;
  is_discount_enabled?: number;
  discount_percent?: number;
  discount_reason?: string;
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
  override_items_json?: string;
  balance_minutes?: number;
  available_minutes?: number;
  wallet_ledger?: Array<{ type: string; minutes: number; note: string; created_at: string }>;
  makeups: MakeupItem[];
}

interface SlotOccupancy {
  slot_id: string;
  slot_name: string;
  time_range: string;
  days?: string;
  max_capacity: number;
  regular_count: number;
  makeup_count: number;
  total_count?: number;
  total_occupied: number;
  remaining_slots?: number;
  occupancy_rate: number;
  is_full: boolean;
  is_crowded: boolean;
  is_day_supported: boolean;
}

export default function ParentPortal() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [monthFormat, setMonthFormat] = useState<MonthFormat>("vietnamese");
  const [activeStudentIndex, setActiveStudentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Absence modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedLessonDate, setSelectedLessonDate] = useState<string>("");
  const [absenceReason, setAbsenceReason] = useState("");
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);

  // Makeup scheduling modal

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

  // Bank Info & Zalo Bot Info from API
  const [bankInfo, setBankInfo] = useState<{ bank_name: string; account_number: string; prefix: string }>({
    bank_name: "",
    account_number: "",
    prefix: "HP",
  });
  const [zaloBotInfo, setZaloBotInfo] = useState<{ name: string; is_configured: boolean }>({
    name: "",
    is_configured: false,
  });

  // Zalo Connection Modal State for Student
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);
  const [studentZaloChatIdInput, setStudentZaloChatIdInput] = useState("");
  const [isSubmittingZalo, setIsSubmittingZalo] = useState(false);

  // Tuition Payment Confirmation Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Active Tab for Parent Portal
  const [activeParentTab, setActiveParentTab] = useState<"schedule" | "tuition" | "contact">("schedule");

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
        if (data.data.bank_info) {
          setBankInfo(data.data.bank_info);
        }
        if (data.data.zalo_bot) {
          setZaloBotInfo(data.data.zalo_bot);
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

  // ⭐ LỊCH HỌC CÒN LẠI: Sinh danh sách đầy đủ các buổi học từ hôm nay đến 30 ngày tới
  // Dùng chung cho cả Tab "Lịch học & Bù" và Modal "Báo Nghỉ Học" (nguồn sự thật duy nhất)
  const upcomingSchedule = useMemo(() => {
    if (!activeStudent) return [] as UpcomingLessonSession[];
    return generateUpcomingStudentSchedule(
      {
        schedule_details_json: activeStudent.schedule_details_json,
        study_time_detail: activeStudent.study_time_detail,
        registered_days: activeStudent.registered_days,
        subject_name: undefined,
        teacher_name: activeStudent.teacher_name,
        makeups: activeStudent.makeups,
      },
      30
    );
  }, [activeStudent]);

  // Refresh student data
  const refreshStudentData = async () => {
    if (phoneNumber) {
      await handleLoginWithPhone(phoneNumber);
    }
  };

  // Handle Save / Disconnect Student Zalo Chat ID
  const handleSaveStudentZalo = async (newId: string | null) => {
    if (!activeStudent) return;
    try {
      setIsSubmittingZalo(true);
      const res = await fetch("/api/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_student_zalo_chat_id",
          student_id: activeStudent.id,
          zalo_chat_id: newId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsZaloModalOpen(false);
        setStudents((prev) =>
          prev.map((s, idx) =>
            idx === activeStudentIndex ? { ...s, zalo_chat_id: newId || undefined } : s
          )
        );
      } else {
        showToast(data.message || "Không thể lưu kết nối Zalo!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingZalo(false);
    }
  };

  // Handle Confirm Tuition Payment
  const handleConfirmPayment = async () => {
    if (!activeStudent) return;
    const amountToPay = activeStudent.is_overdue && activeStudent.total_tuition_due
      ? activeStudent.total_tuition_due
      : activeStudent.current_tuition;

    try {
      setIsSubmittingPayment(true);
      const res = await fetch("/api/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_payment",
          student_id: activeStudent.id,
          month: activeStudent.current_month,
          amount: amountToPay,
          note: paymentNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsPaymentModalOpen(false);
        setPaymentNote("");
        await refreshStudentData();
      } else {
        showToast(data.message || "Ghi nhận thanh toán thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handle report absence
  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !selectedLessonDate) {
      showToast("Vui lòng chọn buổi học cần nghỉ trong danh sách!", "error");
      return;
    }
    const chosenLesson = upcomingSchedule.find((l) => l.id === selectedLessonDate);
    if (!chosenLesson) {
      showToast("Không tìm thấy buổi học đã chọn!", "error");
      return;
    }
    if (chosenLesson.isPast) {
      showToast("Không thể báo nghỉ cho buổi đã qua!", "error");
      return;
    }
    if (chosenLesson.isReported) {
      showToast("Buổi này đã được báo nghỉ trước đó rồi!", "error");
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
          absence_date: chosenLesson.date,
          absence_reason: absenceReason.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã báo nghỉ thành công! Giờ học vẫn nằm trong Ví Giờ để xếp lịch bù.", "success");
        setIsReportModalOpen(false);
        setSelectedLessonDate("");
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
        const schoolQuery = activeStudent?.school_id ? `&school_id=${activeStudent.school_id}` : "";
        const res = await fetch(`/api/classes/occupancy?date=${makeupDate}${schoolQuery}`);
        const json = await res.json();
        if (json.success) {
          const supportedSlots = (json.data.slots as SlotOccupancy[]).filter((s) => s.is_day_supported);
          setOccupancySlots(supportedSlots);
          setDayNameVi(json.data.day_name || "");

          const firstNonFull = supportedSlots.find((s) => !s.is_full);
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
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title={theme === "dark" ? "Chế độ Sáng" : "Chế độ Tối"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>

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

            {/* School & Student Profile Card */}
            {activeStudent && (
              <div className="p-4.5 rounded-3xl bg-linear-to-br from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-600/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-100 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {activeStudent.school_name}
                    </span>
                    <h2 className="text-xl font-black mt-0.5">{activeStudent.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/20 backdrop-blur-md">
                        Trình độ: {activeStudent.level_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-500/40">
                        {activeStudent.student_code || activeStudent.phone}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] text-emerald-100">
                      {activeStudent.is_overdue
                        ? `Nợ (${activeStudent.unpaid_months_count} tháng)`
                        : `Học phí ${formatMonthDisplay(activeStudent.current_month, monthFormat)}`}
                    </p>
                    <p className={`text-lg font-black ${activeStudent.is_overdue ? "text-amber-200" : "text-white"}`}>
                      {activeStudent.is_paid
                        ? "Đã đóng"
                        : activeStudent.is_overdue && activeStudent.total_tuition_due
                        ? formatVND(activeStudent.total_tuition_due)
                        : formatVND(activeStudent.current_tuition)}
                    </p>
                    {activeStudent.is_paid ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200 bg-white/10 px-2 py-0.5 rounded mt-0.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Hoàn tất
                      </span>
                    ) : activeStudent.is_overdue ? (
                      <span className="text-[10px] text-rose-200 font-bold block bg-rose-900/60 px-2 py-0.5 rounded mt-0.5">
                        * Nợ quá hạn
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
                    <p className="text-emerald-100 text-[11px]">⏱️ Ví giờ còn lại:</p>
                    <p
                      className={`font-extrabold mt-0.5 ${
                        (activeStudent.available_minutes ?? 0) < 0 ? "text-rose-300" : "text-amber-300"
                      }`}
                    >
                      {(() => {
                        const avail = Number(activeStudent.available_minutes ?? 0);
                        const abs = Math.abs(avail);
                        const h = Math.floor(abs / 60);
                        const m = abs % 60;
                        const label = avail === 0 ? "0 phút" : h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m} phút`;
                        return avail < 0 ? `Âm ${label}` : label;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Segmented 3-Tab Navigation Bar */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveParentTab("schedule")}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeParentTab === "schedule"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="truncate">Lịch học & Bù</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveParentTab("tuition")}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 relative ${
                  activeParentTab === "tuition"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="truncate">Học phí & QR</span>
                {activeStudent && !activeStudent.is_paid && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse absolute top-1.5 right-1.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveParentTab("contact")}
                className={`py-2 px-1 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeParentTab === "contact"
                    ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                <span className="truncate">Liên hệ & Góp ý</span>
              </button>
            </div>

            {/* TAB 1: LỊCH HỌC & ĐIỂM DANH */}
            {activeParentTab === "schedule" && activeStudent && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Schedule Details Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
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
                      Kiểu lịch:{" "}
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {activeStudent.schedule_preset_name || activeStudent.registered_days || "Chưa chọn lịch"}
                      </span>
                    </p>
                    {activeStudent.study_time_detail && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{activeStudent.study_time_detail}</p>
                    )}
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      <span>Báo Nghỉ Học (Chọn Buổi Trong Lịch Còn Lại)</span>
                    </button>
                  </div>
                </div>

                {/* ⭐ LỊCH HỌC CÒN LẠI CỦA BÉ (FULL REMAINING SCHEDULE) */}
                {(() => {
                  const upcomingList = upcomingSchedule;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CalendarDays className="w-4 h-4 text-emerald-600" />
                          <span>Lịch Học Còn Lại Của Bé</span>
                          <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {upcomingList.length} buổi
                          </span>
                        </h3>
                        <span className="text-[10px] text-slate-400">30 ngày tới</span>
                      </div>

                      {upcomingList.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
                          <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <p>Bé chưa có lịch học cố định hoặc đã hoàn thành khóa học.</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-0.5 scrollbar-thin">
                          {upcomingList.map((lesson) => {
                            const [, m, d] = lesson.date.split("-").map(Number);
                            const dateLabel = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
                            const isReported = lesson.isReported;

                            return (
                              <div
                                key={lesson.id}
                                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                                  lesson.isToday
                                    ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800"
                                    : isReported
                                    ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-80"
                                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-2xs hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Day Icon Pill */}
                                  <div
                                    className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs shrink-0 ${
                                      lesson.isToday
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : isReported
                                        ? "bg-slate-200 dark:bg-slate-700 text-slate-500"
                                        : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                                    }`}
                                  >
                                    <span className="text-[10px] uppercase font-black tracking-tight">
                                      {lesson.dayName === "Chủ Nhật" ? "CN" : lesson.dayName.replace("Thứ ", "T")}
                                    </span>
                                    <span className="text-[11px] font-black leading-none">{dateLabel}</span>
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                        {lesson.dayName} · {lesson.date}
                                      </span>
                                      {lesson.isToday && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-600 text-white">
                                          HÔM NAY
                                        </span>
                                      )}
                                      {isReported && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                          {lesson.makeupItem?.status === "scheduled"
                                            ? "ĐÃ XẾP BÙ"
                                            : lesson.makeupItem?.status === "completed"
                                            ? "ĐÃ HỌC BÙ"
                                            : "ĐÃ BÁO NGHỈ"}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                                      <span className="text-amber-700 dark:text-amber-400 font-bold">
                                        {lesson.timeRange}
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-600 dark:text-slate-300 font-sans">
                                        {lesson.subjectName}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {isReported ? (
                                    <span className="text-[11px] text-slate-400 font-medium italic">
                                      Giờ còn trong ví
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLessonDate(lesson.id);
                                        setIsReportModalOpen(true);
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition cursor-pointer active:scale-95"
                                      title="Bấm để xin nghỉ buổi học này"
                                    >
                                      Báo nghỉ
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ⭐ VÍ GIỜ HỌC: Lịch sử ví giờ (3 dòng gần nhất) */}
                {activeStudent.wallet_ledger && activeStudent.wallet_ledger.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>Lịch Sử Ví Giờ</span>
                    </h3>
                    <div className="space-y-1.5">
                      {activeStudent.wallet_ledger.slice(0, 3).map((entry, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {entry.type === "GRANT"
                                ? "Cấp giờ khi đóng tiền"
                                : entry.type === "CONSUME"
                                ? "Học / trừ giờ"
                                : entry.type === "ADJUST"
                                ? "Điều chỉnh từ trung tâm"
                                : entry.type === "EXPIRE"
                                ? "Giờ hết hạn"
                                : entry.type}
                            </p>
                            {entry.note && <p className="text-[11px] text-slate-400 truncate">{entry.note}</p>}
                          </div>
                          <span
                            className={`font-mono font-black shrink-0 ${
                              entry.minutes >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                            }`}
                          >
                            {entry.minutes > 0 ? "+" : ""}
                            {(() => {
                              const abs = Math.abs(entry.minutes);
                              const h = Math.floor(abs / 60);
                              const m = abs % 60;
                              return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m}p`;
                            })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Makeups Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Danh Sách Buổi Báo Nghỉ & Học Bù</span>
                    </h3>
                  </div>

                  {activeStudent.makeups.length === 0 && (
                    <div className="p-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs">
                      <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p>Bé đi học đầy đủ! Chưa có ngày nghỉ nào cần xếp lịch học bù.</p>
                    </div>
                  )}

                  {activeStudent.makeups.map((mk) => (
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

            {/* TAB 2: HỌC PHÍ & VIETQR */}
            {activeParentTab === "tuition" && activeStudent && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div className={`p-4.5 rounded-3xl border shadow-sm transition space-y-3.5 ${
                  activeStudent.is_paid
                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                    : activeStudent.is_overdue
                    ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80"
                    : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        activeStudent.is_paid
                          ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                      }`}>
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          Học Phí {formatMonthDisplay(activeStudent.current_month, monthFormat)}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {activeStudent.tuition_package_name ? `Gói: ${activeStudent.tuition_package_name}` : "Học phí chuẩn hàng tháng"}
                        </p>
                      </div>
                    </div>

                    {activeStudent.is_paid ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ĐÃ THANH TOÁN
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border ${
                        activeStudent.is_overdue
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                      }`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        {activeStudent.is_overdue ? `Nợ ${activeStudent.unpaid_months_count} tháng` : "CẦN ĐÓNG TIỀN"}
                      </span>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
                    {/* Học phí gốc */}
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span>{activeStudent.tuition_package_name ? `Gói học phí (${activeStudent.tuition_package_name})` : "Học phí chuẩn"}:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatVND(activeStudent.tuition_base_amount || (activeStudent.standard_tuition ? activeStudent.standard_tuition - (activeStudent.level_surcharge || 0) : activeStudent.current_tuition))}
                      </span>
                    </div>

                    {/* Phụ thu level */}
                    {activeStudent.level_surcharge && activeStudent.level_surcharge > 0 ? (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>+ Phụ thu Level ({activeStudent.level_name}):</span>
                        <span className="font-bold">+{formatVND(activeStudent.level_surcharge)}</span>
                      </div>
                    ) : null}

                    {activeStudent.is_discount_enabled && activeStudent.discount_percent ? (
                      <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-semibold">
                        <span>- Chiết khấu ({activeStudent.discount_reason || "Ưu đãi"}):</span>
                        <span>-{activeStudent.discount_percent}%</span>
                      </div>
                    ) : null}

                    {/* Breakdown of custom adjustment items (Phụ thu & Giảm trừ) */}
                    {(() => {
                      try {
                        const items = JSON.parse(activeStudent.override_items_json || "[]");
                        if (Array.isArray(items) && items.length > 0) {
                          return items.map((it: any, idx: number) => (
                            <div
                              key={it.id || idx}
                              className={`flex items-center justify-between text-xs font-semibold pl-2 border-l-2 ${
                                it.type === "add"
                                  ? "border-amber-400 text-amber-700 dark:text-amber-400"
                                  : "border-blue-400 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              <span>{it.type === "add" ? "+" : "-"} {it.name}:</span>
                              <span>{it.type === "add" ? "+" : "-"}{formatVND(it.amount)}</span>
                            </div>
                          ));
                        }
                      } catch {}
                      return null;
                    })()}

                    {activeStudent.is_overdue && activeStudent.previous_debt_amount ? (
                      <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold border-t border-slate-100 dark:border-slate-700 pt-1.5">
                        <span>Nợ tích lũy ({activeStudent.unpaid_months_count} tháng trước):</span>
                        <span>+{formatVND(activeStudent.previous_debt_amount)}</span>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between font-black text-sm pt-2 border-t border-slate-100 dark:border-slate-700">
                      <span className="text-slate-900 dark:text-white">Tổng số tiền cần nộp:</span>
                      <span className={activeStudent.is_paid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                        {activeStudent.is_paid
                          ? "0 đ (Đã hoàn tất)"
                          : activeStudent.is_overdue && activeStudent.total_tuition_due
                          ? formatVND(activeStudent.total_tuition_due)
                          : formatVND(activeStudent.current_tuition)}
                      </span>
                    </div>
                  </div>

                  {/* If Not Paid: Show Payment Guide & 1-Click Confirmation */}
                  {!activeStudent.is_paid && (
                    <div className="space-y-3 pt-1">
                      {/* VietQR Quick Scan Box if bank info is set */}
                      {bankInfo.account_number && bankInfo.bank_name ? (
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-3.5">
                          <div className="w-32 h-32 rounded-xl bg-white p-1.5 shadow-xs border border-slate-200 shrink-0 flex items-center justify-center">
                            <img
                              src={`https://img.vietqr.io/image/${bankInfo.bank_name.trim().toLowerCase()}-${bankInfo.account_number.trim()}-compact2.png?amount=${activeStudent.is_overdue && activeStudent.total_tuition_due ? activeStudent.total_tuition_due : activeStudent.current_tuition}&addInfo=${bankInfo.prefix || "HP"}+${activeStudent.student_code || activeStudent.phone}&accountName=${encodeURIComponent(activeStudent.school_name || "TRUNG TAM")}`}
                              alt="Mã QR Chuyển Khoản Học Phí"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 flex-1 w-full">
                            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1 text-xs">
                              <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Quét mã VietQR chuyển khoản nhanh:
                            </p>
                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span>Ngân hàng: <strong className="text-slate-900 dark:text-white uppercase">{bankInfo.bank_name}</strong></span>
                            </div>

                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span>STK: <strong className="text-slate-900 dark:text-white font-mono">{bankInfo.account_number}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(bankInfo.account_number);
                                  showToast("Đã copy số tài khoản!", "success");
                                }}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>

                            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                              <span className="truncate mr-1">Cú pháp: <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-black">{bankInfo.prefix || "HP"} {activeStudent.student_code || activeStudent.phone}</strong></span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${bankInfo.prefix || "HP"} ${activeStudent.student_code || activeStudent.phone}`);
                                  showToast("Đã copy cú pháp chuyển khoản!", "success");
                                }}
                                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 shrink-0"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Confirm Button */}
                      <button
                        type="button"
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="w-full py-3 px-4 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-md shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Tôi Đã Đóng Học Phí (Xác Nhận & Ghi Nhận Ngay)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: LIÊN HỆ & ĐÓNG GÓP Ý KIẾN */}
            {activeParentTab === "contact" && activeStudent && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                {/* Zalo Notification Connection Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Thông Báo Tự Động Qua Zalo
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Nhận lịch học, báo nghỉ và nhắc học phí trực tiếp
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setStudentZaloChatIdInput(activeStudent.zalo_chat_id || "");
                        setIsZaloModalOpen(true);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        activeStudent.zalo_chat_id
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                      }`}
                    >
                      <span>{activeStudent.zalo_chat_id ? "Đã kết nối (Sửa)" : "Kết nối ngay"}</span>
                    </button>
                  </div>
                </div>

                {/* Direct Hotlines Card */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Đường Dây Nóng Hỗ Trợ</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <a
                      href={`tel:${activeStudent.school_phone || "0909123456"}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200/70 dark:border-emerald-800/60 font-bold transition"
                    >
                      <span className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>Hotline Trung Tâm:</span>
                      </span>
                      <span className="font-mono">{activeStudent.school_phone || "0909123456"}</span>
                    </a>

                    {activeStudent.teacher_phone && (
                      <a
                        href={`tel:${activeStudent.teacher_phone}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold transition"
                      >
                        <span className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-500" />
                          <span>Giáo Viên ({activeStudent.teacher_name}):</span>
                        </span>
                        <span className="font-mono">{activeStudent.teacher_phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Feedback CTA */}
                <div className="p-4 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/60 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquareHeart className="w-4 h-4 text-rose-600" />
                      <span>Đóng Góp Ý Kiến</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Đánh giá chất lượng giảng dạy, cơ sở vật chất hoặc lịch học
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs shadow-xs transition shrink-0"
                  >
                    Gửi ý kiến
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Báo nghỉ học — Chọn buổi từ lịch sắp tới */}
      {isReportModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                <span>Báo Nghỉ Học</span>
              </h3>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Body: Scrollable */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chọn <strong className="text-slate-700 dark:text-slate-200">buổi học cần nghỉ</strong> trong lịch sắp tới của{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">{activeStudent.name}</strong>. Giờ của buổi đó{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">vẫn nằm trong Ví Giờ</strong> để xếp lịch học bù — không mất giờ!
              </p>

              {/* Danh sách buổi học sắp tới */}
              {upcomingSchedule.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs space-y-2">
                  <CalendarDays className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p>Chưa tìm thấy buổi học nào trong 30 ngày tới.</p>
                  <p className="text-[11px]">Vui lòng liên hệ trung tâm để cập nhật lịch học.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Lịch học 30 ngày tới ({upcomingSchedule.length} buổi)
                  </span>
                  {upcomingSchedule.map((lesson) => {
                    const isSelected = selectedLessonDate === lesson.id;
                    const isDisabled = lesson.isPast || lesson.isReported;
                    // Format hiển thị ngày: "Hôm nay · 30/10", "Thứ 7 · 01/11"
                    const [, m, d] = lesson.date.split("-").map(Number);
                    const dateLabel = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
                    const dayPrefix = lesson.isToday ? "Hôm nay" : lesson.dayName;

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedLessonDate(isSelected ? "" : lesson.id)}
                        className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between gap-3 ${
                          isDisabled
                            ? "opacity-45 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-not-allowed"
                            : isSelected
                            ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20 cursor-pointer active:scale-[0.99]"
                            : "bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-amber-300 cursor-pointer active:scale-[0.99]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Radio circle */}
                          <div
                            className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? "border-amber-500 bg-amber-500"
                                : isDisabled
                                ? "border-slate-200 dark:border-slate-700"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold text-sm ${
                                  isDisabled ? "text-slate-400" : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {dayPrefix} · {dateLabel}
                              </span>
                              {lesson.isToday && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                  HÔM NAY
                                </span>
                              )}
                              {lesson.isReported && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                  ĐÃ BÁO NGHỈ
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {lesson.timeRange} · {lesson.subjectName}
                            </p>
                          </div>
                        </div>

                        {isDisabled ? (
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {lesson.isPast ? "Đã qua" : "Đã báo"}
                          </span>
                        ) : isSelected ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shrink-0">
                            Chọn nghỉ
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Lý do xin nghỉ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lý do xin nghỉ (không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="VD: Bé ốm, đi họ họ hàng..."
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-slate-700 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleReportAbsence}
                disabled={isSubmittingAbsence || !selectedLessonDate}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-md shadow-amber-600/30 disabled:opacity-50 cursor-pointer transition"
              >
                {isSubmittingAbsence
                  ? "Đang lưu..."
                  : (() => {
                      const sel = upcomingSchedule.find((l) => l.id === selectedLessonDate);
                      if (!sel) return "Chọn buổi học trước";
                      const [, m, d] = sel.date.split("-").map(Number);
                      return `Xác Nhận Nghỉ ${sel.dayName} (${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")})`;
                    })()}
              </button>
            </div>
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
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      2. Chọn khung giờ mở cửa trong ngày ({dayNameVi}):
                    </label>
                    {dayNameVi && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        {dayNameVi}
                      </span>
                    )}
                  </div>

                  {isLoadingOccupancy ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Đang kiểm tra sĩ số các lớp trong {dayNameVi} ({makeupDate})...
                    </div>
                  ) : occupancySlots.length === 0 ? (
                    <div className="p-3 text-xs text-center text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                      Ngày <strong>{dayNameVi} ({makeupDate})</strong> cơ sở không có ca mở cửa nào phù hợp. Vui lòng chọn một ngày khác!
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
                                    <AlertCircle className="w-3 h-3" /> Hết suất ({slot.total_occupied ?? slot.total_count ?? 0}/{slot.max_capacity})
                                  </span>
                                ) : slot.is_crowded ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Lớp đông ({slot.total_occupied ?? slot.total_count ?? 0}/{slot.max_capacity})
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Còn {Math.max(0, slot.max_capacity - (slot.total_occupied ?? slot.total_count ?? 0))} chỗ ({slot.total_occupied ?? slot.total_count ?? 0}/{slot.max_capacity})
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

      {/* Modal Kết Nối Nhận Tin Nhắn & Thông Báo Zalo (Phụ Huynh) */}
      {isZaloModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Kết Nối Zalo Nhận Thông Báo
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Học sinh: <strong>{activeStudent.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZaloModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Bot Info if configured */}
              {zaloBotInfo.is_configured && zaloBotInfo.name && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Bot Zalo trung tâm:</span> {zaloBotInfo.name}
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Phụ huynh mở ứng dụng Zalo, tìm bot <strong>{zaloBotInfo.name}</strong> và gửi tin nhắn để kích hoạt nhận lịch học, báo nghỉ và nhắc học phí tự động.
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                  Hướng dẫn kết nối nhanh:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li>Mở Zalo và tìm kiếm Bot trung tâm (hoặc số Zalo trung tâm).</li>
                  <li>Gửi tin nhắn chào Bot để nhận mã cuộc trò chuyện (Chat ID).</li>
                  <li>Nhập mã <strong>Chat ID</strong> hoặc số điện thoại Zalo của phụ huynh vào ô dưới.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã Zalo Chat ID (hoặc SĐT Zalo của Phụ Huynh):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 894726482103 hoặc số điện thoại Zalo"
                  value={studentZaloChatIdInput}
                  onChange={(e) => setStudentZaloChatIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {activeStudent.zalo_chat_id ? (
                  <button
                    type="button"
                    disabled={isSubmittingZalo}
                    onClick={() => handleSaveStudentZalo(null)}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                  >
                    Hủy kết nối
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsZaloModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingZalo}
                    onClick={() => handleSaveStudentZalo(studentZaloChatIdInput.trim())}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingZalo ? "Đang lưu..." : "Lưu Kết Nối"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Đã Đóng Học Phí (Phụ Huynh) */}
      {isPaymentModalOpen && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in font-sans">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Xác Nhận Đã Đóng Học Phí
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ghi nhận thanh toán cho bé {activeStudent.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Kỳ học phí:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatMonthDisplay(activeStudent.current_month, monthFormat)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Học sinh:</span>
                <span className="font-bold text-slate-900 dark:text-white">{activeStudent.name} ({activeStudent.student_code || activeStudent.phone})</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-sm font-black">
                <span className="text-emerald-900 dark:text-emerald-200">Số tiền xác nhận đã nộp:</span>
                <span className="text-emerald-700 dark:text-emerald-300">
                  {formatVND(
                    activeStudent.is_overdue && activeStudent.total_tuition_due
                      ? activeStudent.total_tuition_due
                      : activeStudent.current_tuition
                  )}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Ghi chú thêm (Tùy chọn):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đã chuyển khoản qua Vietcombank lúc 10h, tiền mặt..."
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isSubmittingPayment}
                onClick={handleConfirmPayment}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingPayment ? "Đang ghi nhận..." : "Xác Nhận Đã Đóng"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
