"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Student, MakeUpClass, TimeSlot } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  ArrowRight,
  Users,
  Lock,
  X,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Phone,
  RefreshCw,
  History,
  Layers,
  ChevronRight,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

interface SlotOccupancyInfo {
  slot_id: string;
  slot_name: string;
  days: string;
  start_time: string;
  end_time: string;
  time_range: string;
  regular_count: number;
  makeup_count: number;
  total_count: number;
  max_capacity: number;
  occupancy_rate: number;
  is_crowded: boolean;
  is_full: boolean;
  is_day_supported: boolean;
}

interface LedgerHistoryItem {
  id: string;
  type: string;
  minutes: number;
  ref_type: string;
  note: string;
  created_at: string;
}

interface MakeUpClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  timeSlots: TimeSlot[];
  initialStudentId?: string;
  schoolId?: string;
  onRefresh: () => void;
}

export const MakeUpClassesModal: React.FC<MakeUpClassesModalProps> = ({
  isOpen,
  onClose,
  students,
  timeSlots,
  initialStudentId,
  schoolId,
  onRefresh,
}) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"list" | "report" | "history">("list");
  const [makeups, setMakeups] = useState<MakeUpClass[]>([]);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(initialStudentId || "all");
  const [isLoadingList, setIsLoadingList] = useState(false);

  // Form Báo Nghỉ (Tích Lũy Giờ Bù)
  const [reportStudentId, setReportStudentId] = useState<string>(initialStudentId || (students[0]?.id ?? ""));
  const [absenceDate, setAbsenceDate] = useState<string>("");
  const [absenceStartTime, setAbsenceStartTime] = useState<string>("17:00");
  const [absenceEndTime, setAbsenceEndTime] = useState<string>("18:30");
  const [absenceMinutes, setAbsenceMinutes] = useState<number>(90);
  const [absenceReason, setAbsenceReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Xếp Lịch Bù (Khấu Trừ Giờ Bù)
  const [schedulingItem, setSchedulingItem] = useState<MakeUpClass | null>(null);
  const [makeupDate, setMakeupDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [makeupStartTime, setMakeupStartTime] = useState<string>("18:00");
  const [makeupEndTime, setMakeupEndTime] = useState<string>("19:00");
  const [makeupMinutes, setMakeupMinutes] = useState<number>(60);
  const [makeupNote, setMakeupNote] = useState<string>("");

  // Quỹ Giờ Bù (Lấy từ học sinh đang chọn)
  const [walletData, setWalletData] = useState<{ balance_minutes: number; available_minutes: number } | null>(null);

  // Lịch sử Sổ cái Quỹ Giờ Bù (Tab 3)
  const [ledgerHistory, setLedgerHistory] = useState<LedgerHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Xóa bản ghi
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Kiểm tra sức chứa phòng học
  const [dayOccupancy, setDayOccupancy] = useState<SlotOccupancyInfo[]>([]);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(false);
  const [dayNameVi, setDayNameVi] = useState("");

  // Helper format phút -> giờ dạng "1.5 giờ (90 phút)" hoặc "3.5h"
  const fmtHoursAndMinutes = (minutes: number): string => {
    const hours = (minutes / 60).toFixed(1).replace(".0", "");
    return `${hours} giờ (${minutes} phút)`;
  };

  const fmtHoursShort = (minutes: number): string => {
    const hours = (minutes / 60).toFixed(1).replace(".0", "");
    return `${hours}h`;
  };

  const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (schoolId) headers["x-school-id"] = schoolId;
    return headers;
  };

  const loadMakeups = async () => {
    try {
      setIsLoadingList(true);
      const params = new URLSearchParams();
      if (selectedStudentFilter && selectedStudentFilter !== "all") {
        params.set("student_id", selectedStudentFilter);
      }
      if (schoolId) {
        params.set("school_id", schoolId);
      }

      const res = await fetch(`/api/makeups?${params.toString()}`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success) {
        setMakeups(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load makeups:", err);
    } finally {
      setIsLoadingList(false);
    }
  };

  const loadHistory = async (studentId: string) => {
    if (!studentId || studentId === "all") return;
    try {
      setIsLoadingHistory(true);
      const res = await fetch(`/api/makeups?action=history&student_id=${studentId}`, { headers: getHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        setLedgerHistory(json.data.history || []);
        if (json.data.balance) {
          setWalletData({
            balance_minutes: json.data.balance.balance_minutes,
            available_minutes: json.data.balance.available_minutes,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialStudentId) {
        setSelectedStudentFilter(initialStudentId);
        setReportStudentId(initialStudentId);
      }
      loadMakeups();
    }
  }, [isOpen, selectedStudentFilter, initialStudentId, schoolId]);

  // Tự động load lịch sử khi đổi tab hoặc đổi học sinh lọc
  useEffect(() => {
    if (activeTab === "history" && selectedStudentFilter && selectedStudentFilter !== "all") {
      loadHistory(selectedStudentFilter);
    }
  }, [activeTab, selectedStudentFilter]);

  // Khi chọn học sinh ở form báo nghỉ: tự động đọc lịch ca học của em để điền sẵn giờ bắt đầu/kết thúc
  useEffect(() => {
    const student = students.find((s) => s.id === reportStudentId);
    if (!student) return;

    // Tìm trong schedule_details_json trước
    try {
      if (student.schedule_details_json) {
        const parsed = JSON.parse(student.schedule_details_json);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].start_time && parsed[0].end_time) {
          const item = parsed[0];
          setAbsenceStartTime(item.start_time);
          setAbsenceEndTime(item.end_time);
          const [sh, sm] = item.start_time.split(":").map(Number);
          const [eh, em] = item.end_time.split(":").map(Number);
          const diff = Math.max(30, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0)));
          setAbsenceMinutes(diff);
          return;
        }
      }
    } catch {}

    // Fallback qua study_time_detail hoặc 18:00 - 19:30
    if (student.study_time_detail && student.study_time_detail.includes("-")) {
      const parts = student.study_time_detail.split("-");
      const s = parts[0]?.trim();
      const e = parts[1]?.trim();
      if (s && e) {
        setAbsenceStartTime(s);
        setAbsenceEndTime(e);
        const [sh, sm] = s.split(":").map(Number);
        const [eh, em] = e.split(":").map(Number);
        if (!isNaN(sh) && !isNaN(eh)) {
          setAbsenceMinutes(Math.max(30, (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))));
          return;
        }
      }
    }

    setAbsenceStartTime("17:00");
    setAbsenceEndTime("18:30");
    setAbsenceMinutes(90);
  }, [reportStudentId, students]);

  // Cập nhật số phút vắng khi thay đổi giờ bắt đầu/kết thúc
  const handleUpdateAbsenceTimes = (start: string, end: string) => {
    setAbsenceStartTime(start);
    setAbsenceEndTime(end);
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(eh)) {
      const diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
      if (diff > 0) setAbsenceMinutes(diff);
    }
  };

  // Cập nhật số phút bù khi chọn giờ kết thúc bù
  const handleUpdateMakeupTimes = (start: string, minutes: number) => {
    setMakeupStartTime(start);
    setMakeupMinutes(minutes);
    const [sh, sm] = start.split(":").map(Number);
    if (!isNaN(sh)) {
      const totalM = sh * 60 + (sm || 0) + minutes;
      const eh = Math.floor(totalM / 60);
      const em = totalM % 60;
      setMakeupEndTime(`${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
    }
  };

  // Tải thông tin sức chứa ca mở cửa khi chọn ngày học bù
  useEffect(() => {
    if (!makeupDate) {
      setDayOccupancy([]);
      setSelectedSlotId("");
      return;
    }

    const fetchOccupancy = async () => {
      try {
        setIsLoadingOccupancy(true);
        const schoolQuery = schoolId ? `&school_id=${schoolId}` : "";
        const res = await fetch(`/api/classes/occupancy?date=${makeupDate}${schoolQuery}`, { headers: getHeaders() });
        const json = await res.json();
        if (json.success) {
          const supportedSlots = (json.data.slots as SlotOccupancyInfo[]).filter((s) => s.is_day_supported);
          setDayOccupancy(supportedSlots);
          setDayNameVi(json.data.day_name || "");

          const firstAvailable = supportedSlots.find((s) => !s.is_full);
          if (firstAvailable) {
            setSelectedSlotId(firstAvailable.slot_id);
            setMakeupStartTime(firstAvailable.start_time);
            handleUpdateMakeupTimes(firstAvailable.start_time, makeupMinutes);
          } else {
            setSelectedSlotId("");
          }
        }
      } catch (err) {
        console.error("Failed to load occupancy:", err);
      } finally {
        setIsLoadingOccupancy(false);
      }
    };

    fetchOccupancy();
  }, [makeupDate, schoolId]);

  // Mở modal xếp bù: lấy quỹ giờ của học sinh đó
  const handleOpenScheduleModal = (item: MakeUpClass) => {
    setSchedulingItem(item);
    setMakeupDate("");
    setSelectedSlotId("");
    setMakeupNote("");
    // Mặc định thời lượng bù = thời lượng buổi nghỉ (hoặc 60 phút)
    const initialMin = item.absence_minutes ? Math.min(item.absence_minutes, 90) : 60;
    setMakeupMinutes(initialMin);
    handleUpdateMakeupTimes("18:00", initialMin);

    // Đọc quỹ giờ bù của học sinh
    const targetStudent = students.find((s) => s.id === item.student_id);
    if (targetStudent) {
      setWalletData({
        balance_minutes: targetStudent.balance_minutes ?? 0,
        available_minutes: targetStudent.available_minutes ?? 0,
      });
    }
  };

  // Submit Báo Nghỉ (Tích Lũy Giờ Bù)
  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportStudentId) {
      showToast("Vui lòng chọn học sinh!", "error");
      return;
    }
    if (!absenceDate) {
      showToast("Vui lòng chọn ngày báo nghỉ!", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "report_absence",
          student_id: reportStudentId,
          absence_date: absenceDate,
          absence_start_time: absenceStartTime,
          absence_end_time: absenceEndTime,
          absence_minutes: absenceMinutes,
          absence_reason: absenceReason.trim() || "Báo nghỉ có phép",
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setAbsenceDate("");
        setAbsenceReason("");
        setActiveTab("list");
        await loadMakeups();
        onRefresh();
      } else {
        showToast(json.message || "Báo nghỉ thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Xếp Lịch Bù (Khấu Trừ Giờ Bù)
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingItem || !makeupDate) {
      showToast("Vui lòng chọn ngày học bù!", "error");
      return;
    }

    const selectedSlot = dayOccupancy.find((s) => s.slot_id === selectedSlotId);
    if (selectedSlot?.is_full) {
      showToast("Khung giờ này đã hết suất! Vui lòng chọn khung giờ khác.", "error");
      return;
    }

    if (walletData && walletData.available_minutes < makeupMinutes) {
      showToast(
        `Quỹ giờ bù không đủ! Hiện còn ${fmtHoursAndMinutes(walletData.available_minutes)}, cần ${fmtHoursAndMinutes(makeupMinutes)}.`,
        "error"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "schedule_makeup",
          makeup_id: schedulingItem.id,
          makeup_date: makeupDate,
          makeup_slot_id: selectedSlotId || null,
          makeup_start_time: makeupStartTime,
          makeup_end_time: makeupEndTime,
          makeup_minutes: makeupMinutes,
          note: makeupNote.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setSchedulingItem(null);
        setMakeupDate("");
        setSelectedSlotId("");
        setMakeupNote("");
        setWalletData(null);
        await loadMakeups();
        onRefresh();
      } else {
        showToast(json.message || "Lỗi xếp lịch học bù!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMakeup = async (id: string) => {
    try {
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "complete", makeup_id: id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        await loadMakeups();
        onRefresh();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleResetPending = async (id: string) => {
    try {
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "reset_pending", makeup_id: id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        await loadMakeups();
        onRefresh();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "delete", makeup_id: deleteConfirmId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setDeleteConfirmId(null);
        await loadMakeups();
        onRefresh();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Thống kê nhanh danh sách makeups
  const stats = useMemo(() => {
    const pendingList = makeups.filter((m) => m.status === "pending");
    const scheduledList = makeups.filter((m) => m.status === "scheduled");
    const completedList = makeups.filter((m) => m.status === "completed");

    const pendingMinutes = pendingList.reduce((acc, m) => acc + (m.absence_minutes || 90), 0);
    const scheduledMinutes = scheduledList.reduce((acc, m) => acc + (m.makeup_minutes || m.absence_minutes || 60), 0);
    const completedMinutes = completedList.reduce((acc, m) => acc + (m.makeup_minutes || m.absence_minutes || 60), 0);

    return {
      pendingCount: pendingList.length,
      pendingHours: (pendingMinutes / 60).toFixed(1).replace(".0", ""),
      scheduledCount: scheduledList.length,
      scheduledHours: (scheduledMinutes / 60).toFixed(1).replace(".0", ""),
      completedCount: completedList.length,
      completedHours: (completedMinutes / 60).toFixed(1).replace(".0", ""),
    };
  }, [makeups]);

  // Học sinh đang được chọn để lọc (nếu có)
  const currentFilteredStudent = useMemo(() => {
    if (!selectedStudentFilter || selectedStudentFilter === "all") return null;
    return students.find((s) => s.id === selectedStudentFilter) || null;
  }, [selectedStudentFilter, students]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* ================= HEADER MODAL ================= */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 ring-4 ring-indigo-50 dark:ring-indigo-950/50">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Quản Lý Báo Nghỉ & Quỹ Giờ Học Bù
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <Clock className="w-3 h-3" /> Quản lý theo giờ/phút
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tích lũy chính xác giờ nghỉ vào quỹ, khấu trừ theo thời lượng buổi bù và kiểm soát sĩ số phòng học
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= THANH TỔNG HỢP QUỸ GIỜ & TAB ĐIỀU KHIỂN ================= */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Cụm Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "list"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Danh Sách Bù ({makeups.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("report")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "report"
                  ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ghi Nhận Báo Nghỉ</span>
            </button>

            {currentFilteredStudent && (
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "history"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Biến Động Quỹ Giờ</span>
              </button>
            )}
          </div>

          {/* Bộ lọc học sinh & Quỹ giờ hiện có */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">Học sinh:</span>
              <select
                value={selectedStudentFilter}
                onChange={(e) => setSelectedStudentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="all">Tất cả học sinh ({students.length})</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.phone}
                  </option>
                ))}
              </select>
            </div>

            {currentFilteredStudent && (
              <div className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Quỹ bù: {fmtHoursShort(currentFilteredStudent.available_minutes ?? 0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ================= NỘI DUNG CHÍNH (CONTENT BODY) ================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40 dark:bg-slate-950/30 scrollbar-thin">
          
          {/* TAB 1: DANH SÁCH BÁO NGHỈ & XẾP BÙ */}
          {activeTab === "list" && (
            <div className="space-y-4">
              
              {/* Thống kê 3 thẻ trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                      Đang chờ xếp bù
                    </span>
                    <span className="text-xl font-black text-amber-900 dark:text-amber-200">
                      {stats.pendingCount} ca ({stats.pendingHours}h)
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                      Đã xếp lịch học bù
                    </span>
                    <span className="text-xl font-black text-indigo-900 dark:text-indigo-200">
                      {stats.scheduledCount} ca ({stats.scheduledHours}h)
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
                      Đã hoàn thành học bù
                    </span>
                    <span className="text-xl font-black text-emerald-900 dark:text-emerald-200">
                      {stats.completedCount} ca ({stats.completedHours}h)
                    </span>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Danh sách các buổi bù */}
              {isLoadingList ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  Đang tải danh sách báo nghỉ & học bù...
                </div>
              ) : makeups.length === 0 ? (
                <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Không có buổi học bù nào cần xử lý
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Tất cả học viên đang theo học đầy đủ hoặc đã được bù xong. Bấm nút Ghi Nhận Báo Nghỉ nếu có học viên xin nghỉ mới.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {makeups.map((mk) => {
                    const absHoursText = ((mk.absence_minutes || 90) / 60).toFixed(1).replace(".0", "") + "h";
                    const makeupHoursText = mk.makeup_minutes ? ((mk.makeup_minutes / 60).toFixed(1).replace(".0", "") + "h") : absHoursText;

                    return (
                      <div
                        key={mk.id}
                        className="p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:shadow-sm transition"
                      >
                        {/* Chi tiết học viên & Buổi nghỉ */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {mk.student_name}
                            </span>
                            <span className="font-mono text-xs text-slate-500 font-semibold">
                              ({mk.student_phone})
                            </span>

                            {/* Badge trạng thái */}
                            {mk.status === "pending" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" /> Chờ xếp lịch bù
                              </span>
                            )}
                            {mk.status === "scheduled" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <CalendarCheck className="w-3 h-3" /> Đã xếp lịch bù
                              </span>
                            )}
                            {mk.status === "completed" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Đã học bù xong
                              </span>
                            )}
                          </div>

                          {/* Thông tin ca nghỉ (Tích lũy giờ) */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                              <CalendarDays className="w-3.5 h-3.5" /> Nghỉ: <strong>{mk.absence_date}</strong>
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                              Ca: {mk.absence_start_time || "17:00"} - {mk.absence_end_time || "18:30"}
                            </span>
                            <span className="px-2 py-0.2 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-[10px] font-black">
                              Tích lũy: +{absHoursText} ({mk.absence_minutes || 90}p)
                            </span>
                            {mk.absence_reason && (
                              <span className="italic text-slate-400 truncate max-w-[200px]">
                                &ldquo;{mk.absence_reason}&rdquo;
                              </span>
                            )}
                          </div>

                          {/* Thông tin ca học bù đã xếp (nếu có) */}
                          {mk.status !== "pending" && mk.makeup_date && (
                            <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-200 flex-wrap">
                              <span className="font-black text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Lịch học bù:
                              </span>
                              <strong className="font-bold">{mk.makeup_date}</strong>
                              <span>({mk.makeup_time || `${mk.makeup_start_time} - ${mk.makeup_end_time}`})</span>
                              <span className="px-2 py-0.2 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 text-[10px] font-black">
                                Thời lượng bù: {makeupHoursText} ({mk.makeup_minutes || 60}p)
                              </span>
                              {mk.note && <span className="italic text-slate-500">• {mk.note}</span>}
                            </div>
                          )}
                        </div>

                        {/* Các nút hành động */}
                        <div className="flex items-center gap-2 shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          {mk.status === "pending" && (
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(mk)}
                              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              <span>Xếp Lịch Bù</span>
                            </button>
                          )}

                          {mk.status === "scheduled" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCompleteMakeup(mk.id)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1 cursor-pointer"
                                title="Xác nhận học viên đã học bù xong"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Đã bù xong</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResetPending(mk.id)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 hover:bg-amber-100 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300 transition flex items-center gap-1 cursor-pointer"
                                title="Hủy lịch này và quay lại chờ xếp lại"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(mk.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                            title="Xóa bản ghi báo nghỉ này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FORM GHI NHẬN BÁO NGHỈ (TÍCH LŨY GIỜ BÙ) */}
          {activeTab === "report" && (
            <form onSubmit={handleReportAbsence} className="max-w-xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Plus className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Ghi Nhận Học Sinh Báo Nghỉ & Tích Lũy Giờ Bù
                </h3>
              </div>

              {/* Chọn học sinh */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. Chọn học sinh báo nghỉ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={reportStudentId}
                  onChange={(e) => setReportStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) - {s.registered_days} ({s.study_time_detail})
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày nghỉ */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. Ngày học sinh nghỉ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={absenceDate}
                  onChange={(e) => setAbsenceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Ca học nghỉ & Số giờ tích lũy */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    3. Khung giờ ca nghỉ & Thời lượng tích lũy
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    +{fmtHoursAndMinutes(absenceMinutes)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Giờ bắt đầu
                    </label>
                    <input
                      type="time"
                      required
                      value={absenceStartTime}
                      onChange={(e) => handleUpdateAbsenceTimes(e.target.value, absenceEndTime)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Giờ kết thúc
                    </label>
                    <input
                      type="time"
                      required
                      value={absenceEndTime}
                      onChange={(e) => handleUpdateAbsenceTimes(absenceStartTime, e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Chọn nhanh thời lượng */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 font-bold">Chọn nhanh:</span>
                  {[45, 60, 90, 120].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        const [sh, sm] = absenceStartTime.split(":").map(Number);
                        const totalM = sh * 60 + (sm || 0) + m;
                        const eh = Math.floor(totalM / 60);
                        const em = totalM % 60;
                        handleUpdateAbsenceTimes(absenceStartTime, `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        absenceMinutes === m
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {m / 60}h ({m}p)
                    </button>
                  ))}
                </div>
              </div>

              {/* Lý do */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  4. Lý do xin nghỉ
                </label>
                <input
                  type="text"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="VD: Bị ốm, bận thi học kỳ, việc gia đình..."
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Hệ thống sẽ tự động cộng dồn <strong>+{fmtHoursAndMinutes(absenceMinutes)}</strong> vào Quỹ giờ học bù của học viên.
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isSubmitting ? "Đang ghi nhận..." : "+ Ghi Nhận Báo Nghỉ"}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: LỊCH SỬ BIẾN ĐỘNG SỔ CÁI QUỸ GIỜ BÙ */}
          {activeTab === "history" && currentFilteredStudent && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    Sổ Cái Quỹ Giờ Học Bù: {currentFilteredStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lưu vết toàn bộ lịch sử tích lũy (khi báo nghỉ) và khấu trừ (khi học bù)
                  </p>
                </div>
                {walletData && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Quỹ bù khả dụng</span>
                    <span className="text-base font-black text-emerald-600">
                      {fmtHoursAndMinutes(walletData.available_minutes)}
                    </span>
                  </div>
                )}
              </div>

              {isLoadingHistory ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-600" />
                  Đang tải lịch sử biến động quỹ giờ...
                </div>
              ) : ledgerHistory.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                  Chưa có biến động quỹ giờ nào được ghi nhận cho học viên này.
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ledgerHistory.map((item) => {
                      const isPositive = item.minutes > 0;
                      return (
                        <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isPositive
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/60"
                              }`}
                            >
                              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                {item.note || (isPositive ? "Tích lũy giờ nghỉ" : "Khấu trừ học bù")}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {item.created_at}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`font-black font-mono text-sm shrink-0 ${
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isPositive ? `+${fmtHoursShort(item.minutes)}` : `-${fmtHoursShort(Math.abs(item.minutes))}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= POPUP: XẾP LỊCH HỌC BÙ & KHẤU TRỪ QUỸ GIỜ ================= */}
          {schedulingItem && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4.5 animate-in fade-in zoom-in-95">
                
                {/* Header Popup */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Xếp Lịch Học Bù: {schedulingItem.student_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bù cho ca nghỉ ngày: <strong>{schedulingItem.absence_date}</strong> (+{fmtHoursAndMinutes(schedulingItem.absence_minutes || 90)})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSchedulingItem(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  
                  {/* Quỹ giờ hiện có */}
                  {walletData && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Quỹ giờ học bù khả dụng:
                      </span>
                      <span className={`text-xs font-black ${walletData.available_minutes < 60 ? "text-rose-600" : "text-emerald-600"}`}>
                        {fmtHoursAndMinutes(walletData.available_minutes)}
                      </span>
                    </div>
                  )}

                  {/* 1. Ngày bù */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      1. Chọn ngày học bù <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={makeupDate}
                      onChange={(e) => setMakeupDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 2. Chọn Khung Giờ & Kiểm Tra Sĩ Số */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        2. Chọn Ca Học Mở Cửa ({dayNameVi || "Vui lòng chọn ngày trước"})
                      </label>
                      {isLoadingOccupancy && (
                        <span className="text-[10px] text-indigo-600 animate-pulse font-bold">
                          Đang kiểm tra sĩ số...
                        </span>
                      )}
                    </div>

                    {!makeupDate ? (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                        Vui lòng chọn ngày học bù ở bước 1 để xem các khung giờ và sĩ số
                      </div>
                    ) : dayOccupancy.length === 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center text-xs text-amber-800 dark:text-amber-300 font-medium">
                        Ngày {dayNameVi} ({makeupDate}) không có ca mở cửa nào phù hợp.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                        {dayOccupancy.map((slot) => {
                          const isSelected = selectedSlotId === slot.slot_id;
                          return (
                            <div
                              key={slot.slot_id}
                              onClick={() => {
                                if (!slot.is_full) {
                                  setSelectedSlotId(slot.slot_id);
                                  handleUpdateMakeupTimes(slot.start_time, makeupMinutes);
                                }
                              }}
                              className={`p-2.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                                slot.is_full
                                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 opacity-60 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 shadow-xs"
                                  : "bg-white dark:bg-slate-800 border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-indigo-600 bg-indigo-600" : "border-slate-300"}`}>
                                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                                  {slot.slot_name} ({slot.time_range})
                                </span>
                              </div>

                              <div className="text-[10px] font-bold">
                                {slot.is_full ? (
                                  <span className="text-rose-600">Hết chỗ ({slot.total_count}/{slot.max_capacity})</span>
                                ) : (
                                  <span className="text-emerald-600">Còn {slot.max_capacity - slot.total_count} chỗ</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 3. Chọn Số Giờ Muốn Bù Trong Ca (Khấu Trừ) */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        3. Chọn thời lượng muốn bù
                      </label>
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        Khấu trừ: -{fmtHoursAndMinutes(makeupMinutes)}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[30, 60, 90, 120].map((min) => {
                        const isPicked = makeupMinutes === min;
                        const overBalance = walletData ? walletData.available_minutes < min : false;
                        return (
                          <button
                            key={min}
                            type="button"
                            disabled={overBalance}
                            onClick={() => handleUpdateMakeupTimes(makeupStartTime, min)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                              isPicked
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                                : overBalance
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div>{min / 60} giờ</div>
                            <div className="text-[9px] opacity-80">{min} phút</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Hiển thị dự kiến quỹ giờ còn lại */}
                    {walletData && (
                      <div className="text-[11px] pt-1 flex items-center justify-between text-slate-500">
                        <span>Quỹ giờ sau khi xếp bù:</span>
                        <strong className={`font-mono ${walletData.available_minutes - makeupMinutes < 0 ? "text-rose-500" : "text-slate-800 dark:text-slate-200"}`}>
                          {fmtHoursAndMinutes(Math.max(0, walletData.available_minutes - makeupMinutes))}
                          {walletData.available_minutes - makeupMinutes < 0 && " (vượt quỹ!)"}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Ghi chú */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1">
                      Ghi chú thêm
                    </label>
                    <input
                      type="text"
                      value={makeupNote}
                      onChange={(e) => setMakeupNote(e.target.value)}
                      placeholder="VD: Học cùng Thầy Phát, bù đàn Organ..."
                      className="w-full px-3.5 py-2 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSchedulingItem(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (walletData ? walletData.available_minutes < makeupMinutes : false)}
                      className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {isSubmitting ? "Đang xếp..." : "Xác Nhận & Khấu Trừ Giờ"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ================= MODAL XÁC NHẬN XÓA ================= */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa bản ghi?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bản ghi báo nghỉ hoặc học bù này sẽ bị xóa khỏi hệ thống.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Tất cả số giờ học bù đều được đồng bộ tự động theo thời gian thực</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
