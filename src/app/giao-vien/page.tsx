"use client";

import React, { useState, useEffect } from "react";
import { formatTimeSlotLabel, getDayNameVi } from "@/lib/tuition";
import { formatScheduleCompact } from "@/lib/shiftDetection";
import { TimeSlot, TeacherDaySchedule, TeacherLeave } from "@/lib/types";
import {
  GraduationCap,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Building2,
  Search,
  Filter,
  UserCheck,
  CalendarCheck,
  CalendarDays,
  Award,
  Layers,
  ArrowRight,
  LogOut,
  User,
  Sun,
  Moon,
  Bell,
  Check,
  X,
  ExternalLink,
  Star,
  BookOpen,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  CalendarX,
  UserMinus,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

interface Teacher {
  id: string;
  name: string;
  phone: string;
  email?: string;
  color?: string;
  specialty?: string;
  zalo_chat_id?: string;
  zalo_link?: string;
  assigned_slot_ids?: string[];
  school_id?: string;
  school_name?: string;
  school_code?: string;
  student_count?: number;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  zalo_link?: string;
  level_id: string;
  level_name: string;
  level_surcharge: number;
  class_id?: string;
  class_name?: string;
  class_room?: string;
  duration_mode: string;
  sessions_per_week: number;
  hours_per_week: number;
  registered_days: string;
  study_time_detail?: string;
  schedule_details_json?: string;
  schedule_preset_name?: string;
  is_makeup?: boolean;
  balance_minutes?: number;
  available_minutes?: number;
}

interface TeacherClass {
  id: string;
  name: string;
  code?: string;
  subject_name?: string;
  room?: string;
  max_students: number;
  student_count: number;
  schedule_json?: string;
  teacher_assignments_json?: string;
  color?: string;
}

interface MakeupClass {
  id: string;
  student_id: string;
  student_name: string;
  student_phone: string;
  level_id: string;
  level_name: string;
  absence_date: string;
  absence_reason?: string;
  makeup_date: string;
  makeup_time?: string;
  status: string;
  note?: string;
}

interface Level {
  id: string;
  level_name: string;
  surcharge_amount: number;
  sort_order: number;
}

export default function TeacherPortal() {
  const { theme, toggleTheme } = useTheme();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<TeacherDaySchedule[]>([]);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [makeups, setMakeups] = useState<MakeupClass[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"attendance" | "schedule" | "classes" | "all" | "makeups" | "leave">("attendance");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Điểm danh & Nhận xét buổi học
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>("");
  const [todayDateStr, setTodayDateStr] = useState<string>("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, {
    status: "attended" | "absent_excused" | "absent_unexcused";
    teacher_notes: string;
    homework: string;
    rating: number;
  }>>({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);
  const [savedSuccessShiftId, setSavedSuccessShiftId] = useState<string | null>(null);

  // Đơn xin nghỉ của giáo viên
  const [teacherLeaves, setTeacherLeaves] = useState<TeacherLeave[]>([]);
  const [leaveDate, setLeaveDate] = useState<string>("");
  const [leaveShiftDesc, setLeaveShiftDesc] = useState<string>("Cả ngày");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [leaveSubstituteTeacherId, setLeaveSubstituteTeacherId] = useState<string>("");
  const [allSchoolTeachers, setAllSchoolTeachers] = useState<{ id: string; name: string }[]>([]);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);

  // Level Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | MakeupClass | null>(null);
  const [newLevelId, setNewLevelId] = useState("");
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false);

  // Mật khẩu & Đổi mật khẩu giáo viên
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isSubmittingChangePass, setIsSubmittingChangePass] = useState(false);

  // Zalo Connection Modal State
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);
  const [zaloChatIdInput, setZaloChatIdInput] = useState("");
  const [isSubmittingZalo, setIsSubmittingZalo] = useState(false);
  const [zaloBotName, setZaloBotName] = useState("");
  const [isBotConfigured, setIsBotConfigured] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check saved session on mount
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setTodayDateStr(today);
      setSelectedAttendanceDate(today);
      setLeaveDate(today);
      loadAllSchoolTeachers();

      if (typeof window !== "undefined") {
        const savedPhone = localStorage.getItem("teacher_phone");
        if (savedPhone) {
          setInputPhone(savedPhone);
          handleLoginWithPhone(savedPhone);
        }
      }
    } catch {}
  }, []);

  // Login with phone number & password
  const handleLoginWithPhone = async (phoneToAuth: string, passToAuth?: string) => {
    if (!phoneToAuth || !phoneToAuth.trim()) {
      showToast("Vui lòng nhập số điện thoại giáo viên!", "error");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login_by_phone",
          phone: phoneToAuth.trim(),
          password: passToAuth !== undefined ? passToAuth : inputPassword,
        }),
      });
      const data = await res.json();
      if (data.success && data.teacher) {
        setActiveTeacher(data.teacher);
        setIsLoggedIn(true);
        if (typeof window !== "undefined") {
          localStorage.setItem("teacher_phone", phoneToAuth.trim());
          localStorage.setItem("active_teacher_id", data.teacher.id);
        }
        await loadTeacherDetails(data.teacher.id);
      } else {
        showToast(data.message || "Đăng nhập thất bại!", "error");
        setIsLoggedIn(false);
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher?.id) return;
    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      showToast("Vui lòng điền đầy đủ các trường!", "error");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showToast("Mật khẩu mới và xác nhận mật khẩu không trùng khớp!", "error");
      return;
    }
    if (newPasswordInput.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
      return;
    }

    try {
      setIsSubmittingChangePass(true);
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_password",
          teacher_id: activeTeacher.id,
          current_password: currentPasswordInput.trim(),
          new_password: newPasswordInput.trim(),
          confirm_password: confirmPasswordInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Đổi mật khẩu thành công!", "success");
        setIsChangePasswordModalOpen(false);
        setCurrentPasswordInput("");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
      } else {
        showToast(data.message || "Đổi mật khẩu thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingChangePass(false);
    }
  };

  const handleLogout = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("teacher_phone");
        localStorage.removeItem("active_teacher_id");
      }
    } catch {}
    setIsLoggedIn(false);
    setActiveTeacher(null);
    setStudents([]);
    setWeeklySchedule([]);
    setClasses([]);
    setMakeups([]);
    setInputPhone("");
    showToast("Đã đăng xuất khỏi Cổng Giáo Viên", "success");
  };

  // Load teacher details (students, makeups, levels)
  const loadTeacherDetails = async (teacherId: string) => {
    if (!teacherId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/teacher?teacher_id=${teacherId}`);
      const json = await res.json();
      if (json.success) {
        setActiveTeacher(json.data.teacher);
        setStudents(json.data.students || []);
        setWeeklySchedule(json.data.weekly_schedule || []);
        setClasses(json.data.classes || []);
        setMakeups(json.data.makeups || []);
        setLevels(json.data.levels || []);
        setTimeSlots(json.data.time_slots || []);
        setZaloBotName(json.data.zalo_bot_name || "");
        setIsBotConfigured(Boolean(json.data.is_bot_configured));
        setTeacherLeaves(json.data.leaves || []);
        if (json.data.teacher?.zalo_chat_id) {
          setZaloChatIdInput(json.data.teacher.zalo_chat_id);
        }
      } else {
        showToast(json.message || "Lỗi tải thông tin giáo viên", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi tải dữ liệu lớp học", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Tải thông tin điểm danh và nhận xét đã lưu của ngày được chọn
  const loadAttendanceForDate = async (teacherId: string, dateStr: string) => {
    try {
      const res = await fetch(`/api/teacher?teacher_id=${teacherId}&date=${dateStr}`);
      const json = await res.json();
      if (json.success && json.data?.lessons_on_date) {
        const recordsMap: Record<string, any> = {};
        for (const [key, lesson] of Object.entries(json.data.lessons_on_date as Record<string, any>)) {
          recordsMap[key] = {
            status: lesson.status || "attended",
            teacher_notes: lesson.teacher_notes || "",
            homework: lesson.homework || "",
            rating: lesson.rating || 5,
          };
        }
        setAttendanceRecords(recordsMap);
      }
    } catch {}
  };

  useEffect(() => {
    if (activeTeacher?.id && selectedAttendanceDate) {
      loadAttendanceForDate(activeTeacher.id, selectedAttendanceDate);
    }
  }, [activeTeacher?.id, selectedAttendanceDate]);

  const handleUpdateRecord = (key: string, field: string, value: any) => {
    setAttendanceRecords((prev) => {
      const current = prev[key] || {
        status: "attended",
        teacher_notes: "",
        homework: "",
        rating: 5,
      };
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const [loadingAiKey, setLoadingAiKey] = useState<string | null>(null);

  const handleAiSuggest = async (recordKey: string, studentName: string, subjectName?: string) => {
    const current = attendanceRecords[recordKey] || {
      status: "attended",
      teacher_notes: "",
      homework: "",
      rating: 5,
    };
    try {
      setLoadingAiKey(recordKey);
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_feedback",
          student_name: studentName,
          subject_name: subjectName || "Âm nhạc",
          rating: current.rating || 5,
          keywords: current.teacher_notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceRecords((prev) => ({
          ...prev,
          [recordKey]: {
            ...current,
            teacher_notes: data.teacher_notes || current.teacher_notes,
            homework: data.homework || current.homework,
          },
        }));
        showToast("AI đã gợi ý nhận xét và bài tập thành công!", "success");
      } else {
        showToast(data.message || "Chưa thể tạo gợi ý AI", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi gọi AI", "error");
    } finally {
      setLoadingAiKey(null);
    }
  };

  const handleSaveAttendance = async (shiftId: string, shiftStartTime: string, shiftClassId?: string, shiftStudents: any[] = []) => {
    if (!activeTeacher || shiftStudents.length === 0) return;
    try {
      setIsSavingAttendance(true);
      const recordsToSave = shiftStudents.map((st) => {
        const key = `${st.id}_${shiftStartTime}`;
        const rec = attendanceRecords[key] || {
          status: "attended",
          teacher_notes: "",
          homework: "",
          rating: 5,
        };
        return {
          student_id: st.id,
          class_id: shiftClassId || null,
          start_time: shiftStartTime,
          planned_minutes: 90,
          status: rec.status,
          teacher_notes: rec.teacher_notes,
          homework: rec.homework,
          rating: rec.rating,
        };
      });

      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_attendance",
          teacher_id: activeTeacher.id,
          date: selectedAttendanceDate,
          records: recordsToSave,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setSavedSuccessShiftId(shiftId);
        setTimeout(() => setSavedSuccessShiftId(null), 3000);
        loadAttendanceForDate(activeTeacher.id, selectedAttendanceDate);
      } else {
        showToast(data.message || "Lưu điểm danh thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingAttendance(false);
    }
  };

  const handleShiftDate = (offsetDays: number) => {
    const cur = new Date(selectedAttendanceDate);
    cur.setDate(cur.getDate() + offsetDays);
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    setSelectedAttendanceDate(`${y}-${m}-${d}`);
  };

  // Lấy danh sách giáo viên khác của trường để gợi ý dạy thay
  const loadAllSchoolTeachers = async () => {
    try {
      const res = await fetch("/api/teacher");
      const json = await res.json();
      if (json.success && json.data?.teachers) {
        setAllSchoolTeachers(
          (json.data.teachers as any[]).map((t) => ({ id: String(t.id), name: String(t.name) }))
        );
      }
    } catch {}
  };

  // Gửi đơn xin nghỉ
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher || !leaveDate || !leaveReason.trim()) {
      showToast("Vui lòng chọn ngày nghỉ và nhập lý do xin nghỉ!", "error");
      return;
    }

    try {
      setIsSubmittingLeave(true);
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request_leave",
          teacher_id: activeTeacher.id,
          leave_date: leaveDate,
          shift_desc: leaveShiftDesc,
          reason: leaveReason.trim(),
          substitute_teacher_id: leaveSubstituteTeacherId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setLeaveReason("");
        setLeaveSubstituteTeacherId("");
        loadTeacherDetails(activeTeacher.id);
      } else {
        showToast(data.message || "Gửi đơn xin nghỉ thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  // Hủy đơn xin nghỉ đang chờ duyệt
  const handleCancelLeave = async (leaveId: string) => {
    if (!activeTeacher || !confirm("Bạn có chắc chắn muốn hủy đơn xin nghỉ này không?")) return;
    try {
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel_leave",
          leave_id: leaveId,
          teacher_id: activeTeacher.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadTeacherDetails(activeTeacher.id);
      } else {
        showToast(data.message || "Hủy đơn thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  // Handle Level Upgrade
  const handleOpenUpgrade = (st: Student | MakeupClass) => {
    setTargetStudent(st);
    setNewLevelId(st.level_id || (levels[0]?.id ?? ""));
    setIsUpgradeModalOpen(true);
  };

  const handleSubmitLevelUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !newLevelId) return;

    try {
      setIsSubmittingLevel(true);
      const studentId = "student_id" in targetStudent ? targetStudent.student_id : targetStudent.id;
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_level",
          student_id: studentId,
          new_level_id: newLevelId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsUpgradeModalOpen(false);
        if (activeTeacher) {
          loadTeacherDetails(activeTeacher.id);
        }
      } else {
        showToast(data.message || "Cập nhật thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối mạng", "error");
    } finally {
      setIsSubmittingLevel(false);
    }
  };

  // Handle Save / Disconnect Zalo Chat ID
  const handleSaveZaloChatId = async (newId: string | null) => {
    if (!activeTeacher) return;
    try {
      setIsSubmittingZalo(true);
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_zalo_chat_id",
          teacher_id: activeTeacher.id,
          zalo_chat_id: newId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsZaloModalOpen(false);
        setActiveTeacher((prev) => (prev ? { ...prev, zalo_chat_id: newId || undefined } : null));
      } else {
        showToast(data.message || "Không thể cập nhật Zalo!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingZalo(false);
    }
  };

  // Filter students (An toàn tuyệt đối nếu học viên chưa có số điện thoại)
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      (s.level_name && s.level_name.toLowerCase().includes(q)) ||
      (s.class_name && s.class_name.toLowerCase().includes(q))
    );
  });

  const filteredMakeups = makeups.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (m.student_name && m.student_name.toLowerCase().includes(q)) ||
      (m.student_phone && m.student_phone.includes(q)) ||
      (m.level_name && m.level_name.toLowerCase().includes(q))
    );
  });

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

      {/* Mobile-Friendly Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-md sm:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Cổng Giáo Viên
                </span>
                {activeTeacher?.school_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Building2 className="w-3 h-3" />
                    <span className="line-clamp-1">{activeTeacher.school_name}</span>
                  </span>
                )}
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {isLoggedIn && activeTeacher ? `Thầy/Cô: ${activeTeacher.name}` : "Đăng Nhập Giảng Dạy"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              title={theme === "dark" ? "Chế độ Sáng" : "Chế độ Tối"}
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
            </button>

            {isLoggedIn && (
              <>
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition cursor-pointer"
                  title="Đổi mật khẩu tài khoản giáo viên"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đổi Mật Khẩu</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Thoát</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md sm:max-w-2xl w-full mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* LOGIN SCREEN IF NOT AUTHENTICATED */}
        {!isLoggedIn ? (
          <div className="mt-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Đăng Nhập Giáo Viên</h2>
              <p className="text-xs text-slate-500">
                Nhập số điện thoại giáo viên đã đăng ký với trung tâm để kiểm tra ca dạy, xem học sinh học bù và nâng level.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLoginWithPhone(inputPhone, inputPassword);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số điện thoại giáo viên:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="Nhập số điện thoại giáo viên"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm font-semibold tracking-wider rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mật khẩu đăng nhập:
                  </label>
                  <span className="text-[10.5px] text-slate-400">
                    Mặc định ban đầu: <strong>123456</strong>
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Nhập mật khẩu (mặc định 123456)"
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Đang đăng nhập...</span>
                ) : (
                  <>
                    <span>Vào Không Gian Giảng Dạy</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400">
                Nếu số điện thoại chưa được đăng ký trong hệ thống, vui lòng báo Quản Trị Viên thêm giáo viên.
              </p>
            </div>
          </div>
        ) : (
          /* TEACHER DASHBOARD AFTER LOGIN */
          <div className="space-y-4">
            {/* Teacher Overview Card */}
            {activeTeacher && (
              <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-blue-100">
                      {activeTeacher.school_name || "Trung Tâm Đào Tạo"} • Mã: {activeTeacher.school_code || "TT-01"}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-black mt-0.5">{activeTeacher.name}</h2>
                    <p className="text-xs text-blue-100 flex items-center gap-2 mt-1">
                      <span>Chuyên môn: {activeTeacher.specialty || "Giáo viên trung tâm"}</span>
                      <span>•</span>
                      <span>SĐT: {activeTeacher.phone}</span>
                    </p>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-2xl font-black leading-none">{students.length}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tight text-blue-100">Học sinh</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center justify-between">
                    <span className="text-blue-100">Lớp chính khóa:</span>
                    <span className="font-extrabold text-sm">{students.length} HS</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center justify-between">
                    <span className="text-blue-100">Lịch học bù:</span>
                    <span className="font-extrabold text-sm text-amber-300">{makeups.length} Buổi</span>
                  </div>
                </div>

                {/* Assigned Teaching Slots Badge */}
                {Array.isArray(activeTeacher.assigned_slot_ids) && activeTeacher.assigned_slot_ids.length > 0 && (
                  <div className="pt-2 border-t border-white/20 text-xs">
                    <span className="text-blue-200 block text-[10px] uppercase font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-200" /> Ca dạy được phân công:
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {activeTeacher.assigned_slot_ids.map((sId) => {
                        const s = timeSlots.find((slot) => slot.id === sId);
                        if (!s) return null;
                        return (
                          <span
                            key={sId}
                            className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-white/20 backdrop-blur-md text-white border border-white/30"
                          >
                            {formatTimeSlotLabel(s)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Zalo Notification Status & Connect Action */}
                <div className="pt-2.5 border-t border-white/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <MessageCircle className="w-4 h-4 text-emerald-300 shrink-0" />
                    {activeTeacher.zalo_chat_id ? (
                      <span className="text-emerald-200 font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Đã kết nối nhận thông báo Zalo
                      </span>
                    ) : (
                      <span className="text-amber-200 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Chưa kết nối nhận thông báo Zalo
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setZaloChatIdInput(activeTeacher.zalo_chat_id || "");
                      setIsZaloModalOpen(true);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1 shrink-0 ${
                      activeTeacher.zalo_chat_id
                        ? "bg-white/20 hover:bg-white/30 text-white border border-white/30"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400 animate-pulse"
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{activeTeacher.zalo_chat_id ? "Sửa kết nối" : "Kết nối Zalo ngay"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Tabs (Mobile Optimized: 5 Tabs) */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 text-xs font-bold overflow-x-auto scrollbar-none gap-1">
              <button
                onClick={() => setActiveTab("attendance")}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === "attendance"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Điểm Danh & Nhận Xét</span>
              </button>

              <button
                onClick={() => setActiveTab("schedule")}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === "schedule"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarDays className="w-4 h-4 text-blue-500" />
                <span>Lịch Dạy</span>
              </button>

              <button
                onClick={() => setActiveTab("classes")}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === "classes"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Lớp Đứng ({classes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("all")}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Học Sinh ({students.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("makeups")}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === "makeups"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-amber-500" />
                <span>Lịch Bù ({makeups.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("leave")}
                className={`py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shrink-0 ${
                  activeTab === "leave"
                    ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarX className="w-4 h-4 text-rose-500" />
                <span>Báo Nghỉ ({teacherLeaves.length})</span>
              </button>
            </div>

            {/* Search Bar with Counter & Quick Clear (Ẩn khi đang ở tab Lịch Dạy, Điểm Danh và Báo Nghỉ) */}
            {activeTab !== "schedule" && activeTab !== "attendance" && activeTab !== "leave" && (
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên học sinh, số điện thoại, trình độ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-9 py-2 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {searchQuery && (
                  <p className="text-[11px] text-slate-400 px-1 font-medium">
                    Hiển thị {activeTab === "all" ? filteredStudents.length : filteredMakeups.length} học sinh phù hợp.
                  </p>
                )}
              </div>
            )}

            {/* TAB 0: ĐIỂM DANH & NHẬN XÉT BUỔI HỌC THEO NGÀY */}
            {activeTab === "attendance" && (() => {
              const dateToUse = selectedAttendanceDate || todayDateStr || "2026-11-08";
              const dayNameForAttendance = getDayNameVi(dateToUse);
              const daySchForAttendance = weeklySchedule.find((d) => d.day === dayNameForAttendance);
              const shiftsForDate = daySchForAttendance ? daySchForAttendance.shifts : [];
              const makeupsForDate = makeups.filter(
                (m) => m.makeup_date === dateToUse && m.status !== "cancelled"
              );
              const isToday = Boolean(todayDateStr && dateToUse === todayDateStr);

              const [sy, sm, sd] = dateToUse.split("-");

              return (
                <div className="space-y-4">
                  {/* Thanh điều hướng chọn ngày điểm danh */}
                  <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">
                            {dayNameForAttendance}, ngày {sd}/{sm}/{sy}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {shiftsForDate.length} ca dạy • Điểm danh học viên & ghi nhận xét bài học
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleShiftDate(-1)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                          title="Lùi 1 ngày"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <input
                          type="date"
                          value={dateToUse}
                          onChange={(e) => {
                            if (e.target.value) setSelectedAttendanceDate(e.target.value);
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleShiftDate(1)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                          title="Tiến 1 ngày"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {!isToday && todayDateStr && (
                          <button
                            type="button"
                            onClick={() => setSelectedAttendanceDate(todayDateStr)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer"
                          >
                            Hôm nay
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Danh sách ca dạy trong ngày để điểm danh */}
                  {shiftsForDate.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-medium">Hôm nay ({dayNameForAttendance}) giáo viên không có ca dạy nào.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("schedule")}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Xem lịch dạy các ngày khác trong tuần →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {shiftsForDate.map((shift) => {
                        const shiftStudents = [
                          ...shift.students.map((st) => ({ ...st, is_makeup: false })),
                          ...makeupsForDate
                            .filter((m) => !shift.students.some((st) => st.id === m.student_id))
                            .map((m) => ({
                              id: m.student_id,
                              name: m.student_name,
                              phone: m.student_phone,
                              student_code: undefined,
                              level_name: m.level_name,
                              time_label: m.makeup_time || "Học bù",
                              is_makeup: true,
                            })),
                        ];

                        const isSavedThisShift = savedSuccessShiftId === shift.id;

                        return (
                          <div
                            key={shift.id}
                            className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4"
                          >
                            {/* Tiêu đề ca học */}
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2 flex-wrap">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                                    <Clock className="w-3.5 h-3.5" />
                                    {shift.start_time} - {shift.end_time}
                                  </span>
                                  <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {shift.class_name}
                                  </strong>
                                  {shift.room && (
                                    <span className="text-xs text-slate-500 font-medium">📍 {shift.room}</span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-500">
                                  Sĩ số: {shiftStudents.length} học viên
                                </span>
                              </div>
                            </div>

                            {/* Danh sách học viên trong ca */}
                            {shiftStudents.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">Chưa có học sinh nào trong ca học này.</p>
                            ) : (
                              <div className="space-y-3">
                                {shiftStudents.map((st) => {
                                  const recordKey = `${st.id}_${shift.start_time}`;
                                  const currentRecord = attendanceRecords[recordKey] || {
                                    status: "attended",
                                    teacher_notes: "",
                                    homework: "",
                                    rating: 5,
                                  };

                                  return (
                                    <div
                                      key={st.id}
                                      className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-2.5"
                                    >
                                      {/* Header học sinh */}
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black flex items-center justify-center text-xs">
                                            {st.name.slice(0, 1).toUpperCase()}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <strong className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                                {st.name}
                                              </strong>
                                              {st.student_code && (
                                                <code className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                                                  {st.student_code}
                                                </code>
                                              )}
                                              {st.is_makeup && (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-white">
                                                  [HỌC BÙ]
                                                </span>
                                              )}
                                              {/* Huy hiệu hiển thị nếu đã điểm danh ngày hôm đó */}
                                              {Boolean(attendanceRecords[recordKey]) ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                                  <Check className="w-3 h-3" />
                                                  <span>
                                                    Đã điểm danh:{" "}
                                                    {currentRecord.status === "attended"
                                                      ? "Có mặt"
                                                      : currentRecord.status === "absent_excused"
                                                      ? "Vắng có phép"
                                                      : "Không phép"}
                                                  </span>
                                                </span>
                                              ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                                  Chưa điểm danh
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                              ⏰ {st.time_label} {st.level_name && `• Trình độ: ${st.level_name}`}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Đánh giá sao 1 -> 5 */}
                                        <div className="flex items-center gap-1">
                                          <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">
                                            Đánh giá:
                                          </span>
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                              key={star}
                                              type="button"
                                              onClick={() => handleUpdateRecord(recordKey, "rating", star)}
                                              className="p-0.5 transition hover:scale-110 cursor-pointer"
                                            >
                                              <Star
                                                className={`w-4 h-4 ${
                                                  star <= currentRecord.rating
                                                    ? "text-amber-400 fill-amber-400"
                                                    : "text-slate-300 dark:text-slate-600"
                                                }`}
                                              />
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Bộ chọn 3 trạng thái: Có mặt / Vắng có phép / Vắng không phép */}
                                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateRecord(recordKey, "status", "attended")}
                                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                                            currentRecord.status === "attended"
                                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50"
                                          }`}
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                          <span>Có mặt</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleUpdateRecord(recordKey, "status", "absent_excused")}
                                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                                            currentRecord.status === "absent_excused"
                                              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                                          }`}
                                        >
                                          <Clock className="w-3.5 h-3.5" />
                                          <span>Vắng có phép</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleUpdateRecord(recordKey, "status", "absent_unexcused")}
                                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                                            currentRecord.status === "absent_unexcused"
                                              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50"
                                          }`}
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>Không phép</span>
                                        </button>
                                      </div>

                                      {/* Tiêu đề & Nút AI Gợi Ý */}
                                      <div className="flex items-center justify-between pt-1">
                                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                          Nhận xét & Dặn dò bài tập:
                                        </span>
                                        <button
                                          type="button"
                                          disabled={loadingAiKey === recordKey}
                                          onClick={() => handleAiSuggest(recordKey, st.name, shift.subject_name)}
                                          className="flex items-center gap-1 px-2.5 py-0.5 text-[10.5px] font-bold rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 hover:from-purple-100 hover:to-indigo-100 transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                                          title="Bấm để AI tự động soạn nhận xét sư phạm và dặn dò bài tập về nhà"
                                        >
                                          <Sparkles className={`w-3 h-3 text-amber-500 ${loadingAiKey === recordKey ? "animate-spin" : ""}`} />
                                          <span>{loadingAiKey === recordKey ? "AI đang viết..." : "✨ AI Gợi ý"}</span>
                                        </button>
                                      </div>

                                      {/* Ô Nhận xét & Bài tập về nhà */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                        <div>
                                          <input
                                            type="text"
                                            value={currentRecord.teacher_notes}
                                            onChange={(e) => handleUpdateRecord(recordKey, "teacher_notes", e.target.value)}
                                            placeholder="Nhận xét buổi học (VD: Em đánh tốt bài mới, tay trái chuẩn...)"
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                                          />
                                        </div>

                                        <div>
                                          <input
                                            type="text"
                                            value={currentRecord.homework}
                                            onChange={(e) => handleUpdateRecord(recordKey, "homework", e.target.value)}
                                            placeholder="Bài tập về nhà (VD: Ôn lại trang 14, luyện ngón 15 phút...)"
                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Nút lưu điểm danh cho ca */}
                            {shiftStudents.length > 0 && (
                              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                                <div>
                                  {isSavedThisShift && (
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                      <Check className="w-4 h-4" /> Đã lưu điểm danh ca này thành công!
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={isSavingAttendance}
                                  onClick={() => handleSaveAttendance(shift.id, shift.start_time, shift.class_id, shiftStudents)}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition cursor-pointer"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>{isSavingAttendance ? "Đang lưu..." : "Lưu Điểm Danh & Nhận Xét"}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 1: THỜI KHÓA BIỂU TUẦN CỦA GIÁO VIÊN */}
            {activeTab === "schedule" && (
              <div className="space-y-4">
                {/* Bộ lọc chọn thứ */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {["ALL", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDayFilter(d)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                        selectedDayFilter === d
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-blue-400"
                      }`}
                    >
                      {d === "ALL" ? "Cả tuần" : d}
                    </button>
                  ))}
                </div>

                {/* Danh sách ngày và các ca dạy */}
                <div className="space-y-4">
                  {weeklySchedule
                    .filter((daySch) => selectedDayFilter === "ALL" || daySch.day === selectedDayFilter)
                    .map((daySch) => {
                      if (daySch.shifts.length === 0 && selectedDayFilter === "ALL") return null;

                      return (
                        <div
                          key={daySch.day}
                          className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3"
                        >
                          {/* Header Ngày */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                              <h3 className="text-base font-black text-slate-900 dark:text-white">{daySch.day}</h3>
                            </div>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {daySch.shifts.length} ca dạy • {daySch.total_students} lượt học
                            </span>
                          </div>

                          {/* Danh sách ca dạy trong ngày */}
                          {daySch.shifts.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-2">Không có ca phân công nào trong ngày này.</p>
                          ) : (
                            <div className="space-y-3">
                              {daySch.shifts.map((shift) => {
                                const maxCap = shift.max_students || 15;
                                const isFull = shift.students.length >= maxCap;
                                const percent = Math.min(
                                  100,
                                  Math.round((shift.students.length / maxCap) * 100)
                                );

                                return (
                                  <div
                                    key={shift.id}
                                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
                                  >
                                    {/* Ca header */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                                            <Clock className="w-3 h-3" />
                                            {shift.start_time} - {shift.end_time}
                                          </span>
                                          <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                                            {shift.class_name}
                                          </strong>
                                          {shift.role && (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                              {shift.role}
                                            </span>
                                          )}
                                        </div>

                                        <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                                          {shift.room && <span>📍 {shift.room}</span>}
                                          {shift.subject_name && (
                                            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                              • {shift.subject_name}
                                            </span>
                                          )}
                                        </p>
                                      </div>

                                      {/* Sĩ số ca */}
                                      <div className="text-right shrink-0">
                                        <span
                                          className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${
                                            isFull
                                              ? "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                                              : percent >= 80
                                              ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                                              : "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                                          }`}
                                        >
                                          {shift.students.length}/{shift.max_students} HS
                                        </span>
                                      </div>
                                    </div>

                                    {/* Thanh tiến độ sĩ số */}
                                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                      <div
                                        style={{ width: `${percent}%` }}
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          isFull
                                            ? "bg-rose-500"
                                            : percent >= 80
                                            ? "bg-amber-500"
                                            : percent > 0
                                            ? "bg-emerald-600"
                                            : "bg-transparent"
                                        }`}
                                      />
                                    </div>

                                    {/* Danh sách học sinh trong ca dạy này */}
                                    <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                                        Học sinh trong ca ({shift.students.length}):
                                      </p>
                                      {shift.students.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">Chưa có học sinh trong ca này</p>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {shift.students.map((st) => (
                                            <div
                                              key={st.id}
                                              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                                            >
                                              <div className="space-y-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <strong className="text-slate-900 dark:text-white font-bold">
                                                    {st.name}
                                                  </strong>
                                                  {st.student_code && (
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                                                      {st.student_code}
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                                  <span>⏰ {st.time_label}</span>
                                                  {st.level_name && (
                                                    <span className="text-purple-600 dark:text-purple-400 font-semibold">
                                                      • {st.level_name}
                                                    </span>
                                                  )}
                                                </p>
                                              </div>

                                              {st.phone ? (
                                                <a
                                                  href={`tel:${st.phone}`}
                                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                                                  title={`Gọi ${st.phone}`}
                                                >
                                                  <Phone className="w-3.5 h-3.5" />
                                                </a>
                                              ) : (
                                                <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded font-medium">
                                                  Chưa SĐT
                                                </span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {weeklySchedule.every((d) => d.shifts.length === 0) && (
                    <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm">Hiện giáo viên chưa có ca phân công nào trong tuần.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: Regular Students List */}
            {activeTab === "all" && (
              <div className="space-y-3">
                {filteredStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400/50 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{st.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {st.level_name || "Chưa phân loại"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{st.phone}</span>
                          {st.class_name && (
                            <span className="ml-1 px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                              🏫 {st.class_name} {st.class_room ? `(${st.class_room})` : ""}
                            </span>
                          )}
                          {st.available_minutes !== undefined && st.available_minutes > 0 && (
                            <span className="ml-1 px-2 py-0.2 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black">
                              ⏱️ Quỹ bù: {(st.available_minutes / 60).toFixed(1).replace(".0", "")}h
                            </span>
                          )}
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenUpgrade(st)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shrink-0"
                        title="Nâng cấp hoặc thay đổi Level/Grade"
                      >
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        <span>Đổi Level</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white">Lịch học:</span>
                        <span>
                          {st.schedule_preset_name
                            ? `${st.schedule_preset_name} • ${st.hours_per_week || 3}h/tuần`
                            : `${st.hours_per_week || 3}h/tuần (${st.registered_days || "Chưa chọn ngày"})`}
                        </span>
                      </div>

                      {st.study_time_detail && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                          {st.study_time_detail}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                      {st.zalo_link && (
                        <a
                          href={st.zalo_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 font-semibold transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chat Zalo</span>
                        </a>
                      )}
                      {st.phone ? (
                        <a
                          href={`tel:${st.phone}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Gọi Điện</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                          Chưa có SĐT
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">Chưa có học sinh nào được phân công cho giáo viên này.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: THỜI KHÓA BIỂU CÁC LỚP ĐỨNG LỚP */}
            {activeTab === "classes" && (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Lớp học và thời khóa biểu thầy/cô phụ trách:</span>
                  </div>
                  <strong className="text-emerald-700 dark:text-emerald-300 font-black">{classes.length} lớp</strong>
                </div>

                {classes.map((cls) => {
                  let scheduleItemsList: Array<{ day: string; start_time: string; end_time: string }> = [];
                  try {
                    if (cls.schedule_json) scheduleItemsList = JSON.parse(cls.schedule_json);
                  } catch {}

                  let myAssignments: Array<{ teacher_id: string; day?: string; start_time: string; end_time: string; role?: string }> = [];
                  try {
                    if (cls.teacher_assignments_json) {
                      const allAss = JSON.parse(cls.teacher_assignments_json);
                      if (Array.isArray(allAss)) {
                        myAssignments = allAss.filter((a) => a.teacher_id === activeTeacher?.id);
                      }
                    }
                  } catch {}

                  const isFull = (cls.student_count || 0) >= cls.max_students;

                  return (
                    <div
                      key={cls.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                              {cls.name}
                            </h3>
                            {cls.code && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {cls.code}
                              </span>
                            )}
                            {cls.subject_name && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                {cls.subject_name}
                              </span>
                            )}
                          </div>

                          {cls.room && (
                            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1">
                              <span>📍 Phòng:</span>
                              <strong className="text-slate-800 dark:text-slate-200">{cls.room}</strong>
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {cls.student_count || 0} học sinh
                          </span>
                        </div>
                      </div>

                      {/* ⭐ CA DẠY CỤ THỂ CỦA THẦY/CÔ NÀY TRONG LỚP (Hiển thị sĩ số ca trên /max_students) */}
                      {myAssignments.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5">
                          <div className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" /> Ca phân công của Thầy/Cô:
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">Tối đa: {cls.max_students} HS/ca</span>
                          </div>
                          <div className="flex flex-col gap-1.5 pt-0.5">
                            {myAssignments.map((ma, idx) => {
                              const [mSh] = (ma.start_time || "00:00").split(":").map(Number);
                              const [mEh] = (ma.end_time || "23:59").split(":").map(Number);
                              let caStudentsCount = 0;
                              for (const st of students) {
                                if (st.class_id === cls.id) {
                                  let match = false;
                                  if (st.schedule_details_json) {
                                    try {
                                      const p = JSON.parse(st.schedule_details_json);
                                      if (Array.isArray(p)) {
                                        match = p.some((item: any) => {
                                          const matchD = !ma.day || ma.day === "Tất cả các ngày" || ma.day.includes(item.day);
                                          if (!matchD) return false;
                                          const [sH] = (item.start_time || "18:00").split(":").map(Number);
                                          return sH >= mSh && sH < mEh;
                                        });
                                      }
                                    } catch {}
                                  } else if (st.study_time_detail) {
                                    const m = st.study_time_detail.match(/(\d{1,2})(?::(\d{2})|h)/);
                                    if (m) {
                                      const sH = parseInt(m[1], 10);
                                      match = sH >= mSh && sH < mEh;
                                    }
                                  }
                                  if (match) caStudentsCount++;
                                }
                              }

                              const caPercent = Math.min(100, Math.round((caStudentsCount / (cls.max_students || 15)) * 100));

                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-xs space-y-1.5"
                                >
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-800 dark:text-slate-200">
                                      {ma.day && ma.day !== "Tất cả các ngày" ? `${ma.day}: ` : ""}{ma.start_time} - {ma.end_time} {ma.role ? `(${ma.role})` : ""}
                                    </span>
                                    <span className="font-mono text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                      {caStudentsCount}/{cls.max_students} HS
                                    </span>
                                  </div>

                                  {/* Thanh tỷ lệ phần trăm */}
                                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${caPercent}%` }}
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        caStudentsCount >= cls.max_students
                                          ? "bg-rose-500"
                                          : caPercent >= 80
                                          ? "bg-amber-500"
                                          : caPercent > 0
                                          ? "bg-emerald-600"
                                          : "bg-transparent"
                                      }`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Khung giờ mở cửa chung của lớp (gọn gàng chuyên nghiệp) */}
                      {scheduleItemsList.length > 0 && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Giờ mở lớp chung:</span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {formatScheduleCompact(scheduleItemsList).map((txt, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {txt}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {classes.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <Layers className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">Hiện giáo viên chưa được phân công đứng lớp cố định nào.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Makeups List (ĐÁNH DẤU HỌC SINH HỌC BÙ) */}
            {activeTab === "makeups" && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Danh sách học sinh đăng ký HỌC BÙ:</p>
                    <p className="text-[11px] opacity-90">
                      Học sinh tham gia lớp học bù được đánh dấu huy hiệu nổi bật màu cam để giáo viên dễ dàng theo dõi và kèm cặp.
                    </p>
                  </div>
                </div>

                {filteredMakeups.map((mk) => (
                  <div
                    key={mk.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400/70 shadow-md shadow-amber-500/5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{mk.student_name}</h3>
                          {/* PROMINENT MAKEUP BADGE */}
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            HỌC BÙ
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
                            {mk.level_name || "Chưa phân loại"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{mk.student_phone}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenUpgrade(mk)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 shrink-0"
                        title="Thay đổi Level/Grade"
                      >
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        <span>Đổi Level</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>Ngày học bù:</span>
                        <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">
                          {mk.makeup_date} {mk.makeup_time ? `(${mk.makeup_time})` : ""}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-6 space-y-0.5">
                        <p>
                          Bù cho ngày nghỉ: <span className="font-semibold text-slate-800 dark:text-slate-200">{mk.absence_date}</span>
                        </p>
                        {mk.absence_reason && <p>Lý do nghỉ: {mk.absence_reason}</p>}
                        {mk.note && <p className="italic text-amber-700">Ghi chú: {mk.note}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                      {mk.student_phone && (
                        <a
                          href={`https://zalo.me/${mk.student_phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chat Zalo</span>
                        </a>
                      )}
                      {mk.student_phone ? (
                        <a
                          href={`tel:${mk.student_phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold transition"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>Gọi Điện</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40">
                          Chưa có SĐT
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {filteredMakeups.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">Hiện chưa có học sinh nào đăng ký học bù.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: GIÁO VIÊN BÁO NGHỈ & XEM PHẢN HỒI DUYỆT */}
            {activeTab === "leave" && (() => {
              const dayNameOfLeave = getDayNameVi(leaveDate || todayDateStr);
              const shiftsOnLeaveDay = weeklySchedule.find((d) => d.day === dayNameOfLeave)?.shifts || [];

              return (
                <div className="space-y-4">
                  {/* Form gửi đơn xin nghỉ */}
                  <form
                    onSubmit={handleSubmitLeave}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
                        <CalendarX className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          Gửi Đơn Xin Nghỉ Dạy
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Báo nghỉ ca dạy để Ban Quản Lý phê duyệt và phân công người dạy thay
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Chọn ngày xin nghỉ */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ngày xin nghỉ dạy *
                        </label>
                        <input
                          type="date"
                          required
                          value={leaveDate}
                          onChange={(e) => {
                            setLeaveDate(e.target.value);
                            setLeaveShiftDesc("Cả ngày");
                          }}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <span className="text-[11px] text-slate-400 mt-1 block">
                          Thứ: <strong>{dayNameOfLeave || "---"}</strong>
                        </span>
                      </div>

                      {/* Chọn ca xin nghỉ */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Ca dạy cần xin nghỉ *
                        </label>
                        <select
                          value={leaveShiftDesc}
                          onChange={(e) => setLeaveShiftDesc(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                        >
                          <option value="Cả ngày">Tất cả các ca trong ngày (Nghỉ cả ngày)</option>
                          {shiftsOnLeaveDay.map((sh) => (
                            <option key={sh.id} value={`${sh.start_time} - ${sh.end_time} (${sh.class_name})`}>
                              {sh.start_time} - {sh.end_time}: {sh.class_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Đề xuất người dạy thay */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Giáo viên dạy thay dự kiến (Tùy chọn)
                        </label>
                        <select
                          value={leaveSubstituteTeacherId}
                          onChange={(e) => setLeaveSubstituteTeacherId(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                        >
                          <option value="">-- Chưa có / Nhờ Ban Quản Lý sắp xếp --</option>
                          {allSchoolTeachers
                            .filter((t) => t.id !== activeTeacher?.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                Thầy/Cô {t.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Lý do xin nghỉ */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Lý do xin nghỉ *
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={leaveReason}
                          onChange={(e) => setLeaveReason(e.target.value)}
                          placeholder="Ví dụ: Bận việc gia đình đột xuất, bị ốm sốt..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingLeave}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 disabled:opacity-50 transition cursor-pointer"
                      >
                        <CalendarX className="w-4 h-4" />
                        <span>{isSubmittingLeave ? "Đang gửi đơn..." : "Gửi Đơn Xin Nghỉ"}</span>
                      </button>
                    </div>
                  </form>

                  {/* Danh sách các đơn đã gửi */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Lịch sử đơn xin nghỉ ({teacherLeaves.length})
                      </h4>
                    </div>

                    {teacherLeaves.length === 0 ? (
                      <div className="py-10 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-1">
                        <CalendarCheck className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-xs font-medium">Bạn chưa gửi đơn xin nghỉ nào.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {teacherLeaves.map((leave) => {
                          const [ly, lm, ld] = leave.leave_date.split("-");
                          const dayName = getDayNameVi(leave.leave_date);

                          return (
                            <div
                              key={leave.id}
                              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <strong className="text-sm font-black text-slate-900 dark:text-white">
                                      {dayName}, {ld}/{lm}/{ly}
                                    </strong>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {leave.shift_desc || "Cả ngày"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">
                                    Lý do: <strong>{leave.reason}</strong>
                                  </p>
                                </div>

                                <div className="text-right shrink-0">
                                  {leave.status === "approved" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                      <Check className="w-3.5 h-3.5" /> Đã duyệt
                                    </span>
                                  ) : leave.status === "rejected" ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                      <X className="w-3.5 h-3.5" /> Từ chối
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                                      <Clock className="w-3.5 h-3.5" /> Chờ duyệt
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Thông tin phản hồi & người dạy thay */}
                              {(leave.substitute_teacher_name || leave.admin_note) && (
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 text-xs space-y-1">
                                  {leave.substitute_teacher_name && (
                                    <p className="text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1.5">
                                      <span>👤 Giáo viên dạy thay:</span>
                                      <span className="underline">{leave.substitute_teacher_name}</span>
                                    </p>
                                  )}
                                  {leave.admin_note && (
                                    <p className="text-slate-600 dark:text-slate-300 italic">
                                      Phản hồi quản lý: &ldquo;{leave.admin_note}&rdquo;
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Nút hủy đơn nếu còn chờ duyệt */}
                              {leave.status === "pending" && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleCancelLeave(leave.id)}
                                    className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                                  >
                                    Hủy đơn này
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* Modal: Upgrade Level / Grade */}
      {isUpgradeModalOpen && targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Nâng Cấp Level / Trình Độ
                  </h3>
                  <p className="text-xs text-slate-500">Giáo viên cập nhật trực tiếp sau đánh giá</p>
                </div>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <p className="text-slate-500">Học sinh:</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {"student_name" in targetStudent ? targetStudent.student_name : targetStudent.name}
              </p>
              <p className="text-slate-500">
                Trình độ hiện tại:{" "}
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {targetStudent.level_name || "Chưa phân loại"}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmitLevelUpgrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn Trình Độ / Level Mới:
                </label>
                <select
                  required
                  value={newLevelId}
                  onChange={(e) => setNewLevelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.level_name} ({Number(lvl.surcharge_amount).toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLevel}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30 disabled:opacity-50"
                >
                  {isSubmittingLevel ? "Đang lưu..." : "Xác Nhận Nâng Level"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kết Nối Nhận Thông Báo Zalo */}
      {isZaloModalOpen && activeTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Kết Nối Nhận Thông Báo Zalo
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nhận lịch dạy, học sinh học bù & cập nhật mới qua Zalo
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
              {isBotConfigured && zaloBotName && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Bot Zalo của trung tâm:</span> {zaloBotName}
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Thầy/cô chỉ cần mở Zalo, tìm kiếm bot này và nhấn <strong>Bắt đầu (Start)</strong> để nhận thông báo.
                    </p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] uppercase tracking-wider">
                  Các bước kết nối (chỉ 1 lần duy nhất):
                </span>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                  <li>Mở Zalo và tìm kiếm bot của trung tâm hoặc quét mã QR.</li>
                  <li>Nhắn bất kỳ tin nhắn nào (ví dụ: &quot;Xin chào&quot;) để kích hoạt cuộc trò chuyện.</li>
                  <li>Copy mã <strong>Chat ID</strong> hoặc nhập số điện thoại Zalo của thầy/cô vào ô bên dưới.</li>
                </ol>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mã Zalo Chat ID (hoặc SĐT Zalo):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: 894726482103 hoặc số điện thoại Zalo"
                  value={zaloChatIdInput}
                  onChange={(e) => setZaloChatIdInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {activeTeacher.zalo_chat_id ? (
                  <button
                    type="button"
                    disabled={isSubmittingZalo}
                    onClick={() => handleSaveZaloChatId(null)}
                    className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                  >
                    Hủy kết nối Zalo
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
                    onClick={() => handleSaveZaloChatId(zaloChatIdInput.trim())}
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

      {/* Modal: Đổi Mật Khẩu Giáo Viên */}
      {isChangePasswordModalOpen && activeTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Đổi Mật Khẩu Tài Khoản
                  </h3>
                  <p className="text-[11px] text-slate-500">Giáo viên: {activeTeacher.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    required
                    placeholder="Nhập mật khẩu đang dùng"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu mới (Tối thiểu 6 ký tự) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    required
                    placeholder="Nhập mật khẩu mới"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingChangePass}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30 disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmittingChangePass ? "Đang lưu..." : "Lưu Mật Khẩu"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
