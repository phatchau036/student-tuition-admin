"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Student, TimeSlot, LevelSurcharge, DiscountOption, Teacher } from "@/lib/types";
import { formatVND, formatMonthDisplay, getCurrentMonthStr } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import { SettingsModal } from "@/components/SettingsModal";
import { StudentFormModal } from "@/components/StudentFormModal";
import { MonthlyTuitionModal } from "@/components/MonthlyTuitionModal";
import { TeacherManagementModal } from "@/components/TeacherManagementModal";
import { MakeUpClassesModal } from "@/components/MakeUpClassesModal";
import {
  Users,
  Search,
  Filter,
  Plus,
  Settings,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Send,
  Sparkles,
  Layers,
  Clock,
  Percent,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  Hourglass,
  Building2,
  ExternalLink,
  ShieldCheck,
  Lock,
  LogOut,
  ArrowRight,
  User,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { showToast } = useToast();

  // Selected Month State
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");

  useEffect(() => {
    setSelectedMonth(getCurrentMonthStr());
  }, []);

  // IP Restriction check state
  const [ipStatus, setIpStatus] = useState<{
    checked: boolean;
    allowed: boolean;
    client_ip?: string;
    school_name?: string;
    message?: string;
  }>({ checked: false, allowed: true });

  // Auth states for School Admin
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<{
    id: string;
    username: string;
    full_name: string;
    school_name: string;
    school_code: string;
  } | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Check IP restriction & Admin Auth on mount
  useEffect(() => {
    const initializePortal = async () => {
      try {
        // 1. Check IP restriction first
        const ipRes = await fetch("/api/admin/check-ip");
        const ipJson = await ipRes.json();
        if (ipJson.allowed === false) {
          setIpStatus({
            checked: true,
            allowed: false,
            client_ip: ipJson.client_ip,
            school_name: ipJson.school_name,
            message: ipJson.message,
          });
          setIsAuthenticated(false);
          return;
        }

        setIpStatus({ checked: true, allowed: true, client_ip: ipJson.client_ip });

        // 2. Check Admin Auth
        const token = localStorage.getItem("admin_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/admin/auth", { headers });
        const json = await res.json();
        if (json.authenticated && json.admin) {
          setIsAuthenticated(true);
          setAdminUser(json.admin);
          setCurrentSchool({
            id: json.admin.school_id,
            name: json.admin.school_name,
            code: json.admin.school_code,
          });
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIpStatus({ checked: true, allowed: true });
        setIsAuthenticated(false);
      }
    };

    initializePortal();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      showToast("Vui lòng nhập tên đăng nhập và mật khẩu!", "error");
      return;
    }

    try {
      setIsSubmittingLogin(true);
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim(),
          password: loginPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.admin) {
        showToast(data.message, "success");
        if (data.token) {
          localStorage.setItem("admin_token", data.token);
        }
        setIsAuthenticated(true);
        setAdminUser(data.admin);
        setCurrentSchool({
          id: data.admin.school_id,
          name: data.admin.school_name,
          code: data.admin.school_code,
        });
        loadSettings();
        loadTeachers();
        loadStudents(selectedMonth);
      } else {
        showToast(data.message || "Đăng nhập thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_token");
    setIsAuthenticated(false);
    setAdminUser(null);
    setLoginPassword("");
    showToast("Đã đăng xuất khỏi cổng Quản trị cơ sở", "success");
  };

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [levels, setLevels] = useState<LevelSurcharge[]>([]);
  const [discountPresets, setDiscountPresets] = useState<DiscountOption[]>([]);
  const [currentSchool, setCurrentSchool] = useState<{ id: string; name: string; code: string } | null>(null);

  // Settings
  const [baseTuition, setBaseTuition] = useState<number>(0);
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">("by_hours");
  const [defaultHours, setDefaultHours] = useState<number>(3);
  const [defaultSessions, setDefaultSessions] = useState<number>(3);
  const [defaultStudyTime, setDefaultStudyTime] = useState<string>("18:00 - 19:00");
  const [maxStudents, setMaxStudents] = useState<number>(10);
  const [crowdedThreshold, setCrowdedThreshold] = useState<number>(80);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("all");

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [selectedStudentForMakeup, setSelectedStudentForMakeup] = useState<string | undefined>(undefined);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [studentForMonthly, setStudentForMonthly] = useState<Student | null>(null);

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        setBaseTuition(json.data.base_tuition);
        setDurationMode(json.data.duration_mode || "by_hours");
        setDefaultHours(json.data.default_hours_per_week || 3);
        setDefaultSessions(json.data.default_sessions_per_week || 3);
        setDefaultStudyTime(json.data.default_study_time || "18:00 - 19:00");
        setMaxStudents(json.data.max_students_per_slot || 10);
        setCrowdedThreshold(json.data.crowded_threshold_percent || 80);
        setTimeSlots(json.data.time_slots);
        setLevels(json.data.level_surcharges);
        setDiscountPresets(json.data.discount_presets);
        if (json.data.current_school) {
          setCurrentSchool(json.data.current_school);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  // Load Teachers
  const loadTeachers = async () => {
    try {
      const res = await fetch("/api/teachers");
      const json = await res.json();
      if (json.success) {
        setTeachers(json.data);
      }
    } catch (err) {
      console.error("Failed to load teachers:", err);
    }
  };

  // Load Students for Selected Month
  const loadStudents = async (month: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/students?month=${month}`);
      const json = await res.json();
      if (json.success) {
        setStudents(json.data.students);
        setBaseTuition(json.data.base_tuition);
      } else {
        showToast("Không thể tải danh sách học sinh", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi tải học sinh", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadTeachers();
  }, []);

  useEffect(() => {
    loadStudents(selectedMonth);
  }, [selectedMonth]);

  // Refresh all
  const handleRefresh = () => {
    loadSettings();
    loadTeachers();
    loadStudents(selectedMonth);
  };

  // Delete student
  const handleDeleteStudent = async (student: Student) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh "${student.name}"?`)) {
      try {
        const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          showToast(data.message, "success");
          loadStudents(selectedMonth);
        } else {
          showToast(data.message || "Xóa thất bại", "error");
        }
      } catch {
        showToast("Lỗi kết nối máy chủ", "error");
      }
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);
      const matchLevel = selectedLevelFilter === "all" || s.level_id === selectedLevelFilter;
      const matchSlot = selectedSlotFilter === "all" || s.time_slot_id === selectedSlotFilter;
      const matchTeacher = selectedTeacherFilter === "all" || s.teacher_id === selectedTeacherFilter;
      return matchSearch && matchLevel && matchSlot && matchTeacher;
    });
  }, [students, searchQuery, selectedLevelFilter, selectedSlotFilter, selectedTeacherFilter]);

  // Statistics
  const totalRevenueThisMonth = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + (s.current_tuition || 0), 0);
  }, [filteredStudents]);

  const overriddenCount = useMemo(() => {
    return filteredStudents.filter((s) => Boolean(s.monthly_override)).length;
  }, [filteredStudents]);

  const totalPendingMakeups = useMemo(() => {
    return students.reduce((sum, s) => sum + (s.pending_makeups_count || 0), 0);
  }, [students]);

  // 0. IP Blocked: If school enabled IP restriction and client IP is not in whitelist -> Web Error
  if (ipStatus.checked && !ipStatus.allowed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans text-center">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="px-2.5 py-1 text-xs font-black uppercase rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 tracking-wider">
              Web Error • 403 Forbidden
            </span>
            <h1 className="text-xl font-extrabold text-white mt-3">Truy Cập Bị Từ Chối</h1>
            <p className="text-xs text-rose-300 font-semibold mt-1">
              Trường học đã bật tính năng Bảo Vệ Giới Hạn IP
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1.5 text-left font-mono">
            <p>
              • IP của bạn: <span className="text-rose-400 font-bold">{ipStatus.client_ip || "Không xác định"}</span>
            </p>
            <p>
              • Trường quản lý: <span className="text-white font-semibold">{ipStatus.school_name || "Trung tâm"}</span>
            </p>
            <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 font-sans">
              Địa chỉ IP này chưa được cấp phép trong danh sách IP Whitelist của trường.
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Vui lòng liên hệ <strong>Chủ Hệ Thống</strong> để thêm IP của bạn vào danh sách cho phép truy cập.
          </p>

          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Về Cổng Phụ Huynh
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Loading screen while verifying admin auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Đang kiểm tra quyền quản trị cơ sở...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: School Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 font-sans">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/10">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Đăng Nhập Quản Trị Cơ Sở</h1>
            <p className="text-xs text-slate-500">
              Nhập tài khoản quản trị viên và mật khẩu do Chủ Hệ Thống cấp để quản lý học sinh và giáo viên của trường.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Tài khoản Admin (Username):
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="VD: admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Mật khẩu:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu của bạn"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingLogin ? (
                <span>Đang xác thực...</span>
              ) : (
                <>
                  <span>Vào Bảng Quản Trị</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400">
              Nếu bạn chưa có tài khoản, vui lòng liên hệ Chủ Hệ Thống để được cấp quyền quản lý cơ sở.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col">
      {/* Top Professional Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                  Quản Trị Cơ Sở
                </h1>
                {currentSchool && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{currentSchool.name}</span>
                    <span className="opacity-70">({currentSchool.code})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hệ thống quản lý học sinh, phân công giáo viên, theo dõi học phí & lịch học bù
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Quick Switch to relevant portals */}
            <div className="hidden lg:flex items-center border-r border-slate-200 dark:border-slate-700 pr-2.5 mr-0.5 gap-1.5 text-xs">
              <Link
                href="/giao-vien"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                title="Cổng dành cho giáo viên"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                <span>Cổng GV</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
                title="Cổng dành cho phụ huynh"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cổng PH</span>
              </Link>
            </div>
            {/* Make up classes button */}
            <button
              onClick={() => {
                setSelectedStudentForMakeup(undefined);
                setIsMakeupModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 transition shadow-xs"
            >
              <CalendarCheck className="w-4 h-4 text-amber-600" />
              <span>Báo Nghỉ & Học Bù</span>
              {totalPendingMakeups > 0 && (
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {totalPendingMakeups}
                </span>
              )}
            </button>

            {/* Teachers Management Button */}
            <button
              onClick={() => setIsTeacherModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition shadow-xs"
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Đội Ngũ Giáo Viên ({teachers.length})</span>
            </button>

            {/* System Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition shadow-xs"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Cài Đặt</span>
            </button>

            {/* Add Student Button */}
            <button
              onClick={() => {
                setStudentToEdit(null);
                setIsStudentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Học Sinh</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 transition"
              title="Đăng xuất khỏi cổng quản trị cơ sở"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Control Bar: Month Selector & Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Month Selector Box */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Kỳ Báo Cáo Học Phí
              </label>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {formatMonthDisplay(selectedMonth)}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setSelectedMonth(getCurrentMonthStr())}
                title="Về tháng hiện tại"
                className="px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
              >
                Hiện tại
              </button>
            </div>
          </div>

          {/* Quick Stat 1: Total Revenue for Month */}
          <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-indigo-100 uppercase tracking-wide">
                Dự Thu {formatMonthDisplay(selectedMonth)}
              </span>
              <div className="text-2xl font-black tracking-tight mt-0.5">
                {formatVND(totalRevenueThisMonth)}
              </div>
              <span className="text-[11px] text-indigo-200 mt-1 block">
                Tổng cộng {filteredStudents.length} học sinh đang theo học
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Quick Stat 2: System Base Info & Overrides */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Học phí cơ bản (Base)
              </span>
              <div className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatVND(baseTuition)} / tháng
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1 inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {overriddenCount} học sinh có học phí tùy chỉnh tháng này
              </span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs text-slate-400 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </div>

            {/* Filter by Teacher */}
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">Tất cả Giáo viên</option>
              {teachers.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>

            {/* Filter by Level */}
            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">Tất cả Level</option>
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.level_name}
                </option>
              ))}
            </select>

            {/* Filter by Slot */}
            <select
              value={selectedSlotFilter}
              onChange={(e) => setSelectedSlotFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
            >
              <option value="all">Tất cả Khung giờ</option>
              {timeSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.name}
                </option>
              ))}
            </select>

            {(searchQuery || selectedLevelFilter !== "all" || selectedSlotFilter !== "all" || selectedTeacherFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLevelFilter("all");
                  setSelectedSlotFilter("all");
                  setSelectedTeacherFilter("all");
                }}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Student Table Listing */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Học sinh</th>
                  <th className="py-3.5 px-4">Giáo viên</th>
                  <th className="py-3.5 px-4">Level</th>
                  <th className="py-3.5 px-4">Hình thức & Lịch học</th>
                  <th className="py-3.5 px-4">Chiết khấu</th>
                  <th className="py-3.5 px-4">Học phí {formatMonthDisplay(selectedMonth)}</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Đang tải danh sách học sinh...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span className="font-medium text-sm">Chưa có học sinh nào.</span>
                        <span className="text-xs text-slate-400 max-w-sm">
                          Vào mục <strong>Cài Đặt</strong> để thiết lập Khung giờ & Level trước, sau đó bấm <strong>Thêm Học Sinh</strong> để bắt đầu quản lý.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const isCustom = Boolean(student.monthly_override);
                    const isByHours = student.duration_mode === "by_hours";
                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* Name & Phone & Zalo */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{student.name}</span>
                            {(student.pending_makeups_count || 0) > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedStudentForMakeup(student.id);
                                  setIsMakeupModalOpen(true);
                                }}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                                title="Bấm để xếp lịch học bù"
                              >
                                Nợ {student.pending_makeups_count} buổi bù
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              {student.phone}
                            </span>
                            {student.zalo_link && (
                              <a
                                href={student.zalo_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 transition"
                                title="Nhắn tin nhanh qua Zalo"
                              >
                                <Send className="w-2.5 h-2.5" /> Zalo
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Teacher */}
                        <td className="py-3.5 px-4">
                          {student.teacher_name && student.teacher_name !== "Chưa gán GV" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                              <GraduationCap className="w-3.5 h-3.5" />
                              {student.teacher_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Chưa gán GV</span>
                          )}
                        </td>

                        {/* Level */}
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {student.level_name}
                          </span>
                          {student.level_surcharge && student.level_surcharge > 0 ? (
                            <span className="block text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              +{formatVND(student.level_surcharge)}
                            </span>
                          ) : null}
                        </td>

                        {/* Weekly Schedule: Phân biệt rõ Theo Tiếng vs Theo Buổi */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {isByHours ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1">
                                <Hourglass className="w-3 h-3" />
                                {student.hours_per_week || 3} tiếng / tuần
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {student.sessions_per_week || 3} buổi / tuần
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              ({student.registered_days || "Chưa chọn ngày"})
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-medium">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-xs" title={student.study_time_detail}>
                              {student.study_time_detail || "Linh hoạt trong ca mở cửa"}
                            </span>
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-3.5 px-4">
                          {student.is_discount_enabled && student.discount_percent > 0 ? (
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              -{student.discount_percent}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">0%</span>
                          )}
                        </td>

                        {/* Tuition For Selected Month */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-extrabold ${
                                isCustom
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {formatVND(student.current_tuition)}
                            </span>

                            {isCustom ? (
                              <div className="mt-1 flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Đã chỉnh sửa riêng - {formatMonthDisplay(selectedMonth)}
                                </span>
                                {student.monthly_override?.note && (
                                  <span className="text-[11px] text-slate-500 italic">
                                    &ldquo;{student.monthly_override.note}&rdquo;
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Chuẩn mặc định</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            {/* Make up button */}
                            <button
                              onClick={() => {
                                setSelectedStudentForMakeup(student.id);
                                setIsMakeupModalOpen(true);
                              }}
                              className="px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 transition"
                              title="Báo nghỉ hoặc xếp lịch học bù"
                            >
                              Học bù
                            </button>

                            {/* Monthly Tuition Edit Override Button */}
                            <button
                              onClick={() => {
                                setStudentForMonthly(student);
                                setIsMonthlyModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition flex items-center gap-1"
                              title="Chỉnh sửa học phí riêng tháng này"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Sửa học phí</span>
                            </button>

                            {/* Edit Student Info Button */}
                            <button
                              onClick={() => {
                                setStudentToEdit(student);
                                setIsStudentModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Sửa thông tin học sinh"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete Student Button */}
                            <button
                              onClick={() => handleDeleteStudent(student)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={handleRefresh}
        initialBaseTuition={baseTuition}
        initialDurationMode={durationMode}
        initialDefaultHours={defaultHours}
        initialDefaultSessions={defaultSessions}
        initialDefaultStudyTime={defaultStudyTime}
        initialMaxStudents={maxStudents}
        initialCrowdedThreshold={crowdedThreshold}
        initialTimeSlots={timeSlots}
        initialLevelSurcharges={levels}
        initialDiscountPresets={discountPresets}
      />

      {/* Teachers Management Modal */}
      <TeacherManagementModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        teachers={teachers}
        onRefresh={handleRefresh}
      />

      {/* Make Up Classes & Absence Modal */}
      <MakeUpClassesModal
        isOpen={isMakeupModalOpen}
        onClose={() => setIsMakeupModalOpen(false)}
        students={students}
        timeSlots={timeSlots}
        initialStudentId={selectedStudentForMakeup}
        onRefresh={handleRefresh}
      />

      {/* Student Form Modal (Create / Edit) */}
      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSaved={handleRefresh}
        studentToEdit={studentToEdit}
        baseTuition={baseTuition}
        levels={levels}
        timeSlots={timeSlots}
        teachers={teachers}
        discountPresets={discountPresets}
        defaultDurationMode={durationMode}
        defaultSessions={defaultSessions}
        defaultHours={defaultHours}
        defaultStudyTime={defaultStudyTime}
      />

      {/* Monthly Tuition Override Modal */}
      <MonthlyTuitionModal
        isOpen={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        onSaved={handleRefresh}
        student={studentForMonthly}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
