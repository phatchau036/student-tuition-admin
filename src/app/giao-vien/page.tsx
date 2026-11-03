"use client";

import React, { useState, useEffect } from "react";
import { formatTimeSlotLabel } from "@/lib/tuition";
import { formatScheduleCompact } from "@/lib/shiftDetection";
import { TimeSlot } from "@/lib/types";
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
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [makeups, setMakeups] = useState<MakeupClass[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "classes" | "makeups">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Level Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | MakeupClass | null>(null);
  const [newLevelId, setNewLevelId] = useState("");
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false);

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
      if (typeof window !== "undefined") {
        const savedPhone = localStorage.getItem("teacher_phone");
        if (savedPhone) {
          setInputPhone(savedPhone);
          handleLoginWithPhone(savedPhone);
        }
      }
    } catch {}
  }, []);

  // Login with phone number
  const handleLoginWithPhone = async (phoneToAuth: string) => {
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
        showToast(data.message || "Không tìm thấy giáo viên với số điện thoại này!", "error");
        setIsLoggedIn(false);
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
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
        setClasses(json.data.classes || []);
        setMakeups(json.data.makeups || []);
        setLevels(json.data.levels || []);
        setTimeSlots(json.data.time_slots || []);
        setZaloBotName(json.data.zalo_bot_name || "");
        setIsBotConfigured(Boolean(json.data.is_bot_configured));
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
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Thoát</span>
              </button>
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
                handleLoginWithPhone(inputPhone);
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
                    className="w-full pl-10 pr-4 py-3 text-base font-semibold tracking-wider rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
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

            {/* Navigation Tabs (Mobile Optimized: 3 Tabs) */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 text-xs font-bold">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Học Sinh ({students.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("classes")}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "classes"
                    ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-500" />
                <span>Lớp Đứng ({classes.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("makeups")}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "makeups"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-amber-500" />
                <span>Lịch Bù ({makeups.length})</span>
              </button>
            </div>

            {/* Search Bar with Counter & Quick Clear */}
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
    </div>
  );
}
