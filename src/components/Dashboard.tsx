"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Student, TimeSlot, LevelSurcharge, DiscountOption, Teacher, MonthFormat, TuitionPackage, StudentStatus } from "@/lib/types";
import { formatVND, formatMonthDisplay, getCurrentMonthStr, formatTimeSlotLabel } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import { SettingsModal } from "@/components/SettingsModal";
import { StudentFormModal } from "@/components/StudentFormModal";
import { MonthlyTuitionModal } from "@/components/MonthlyTuitionModal";
import { TeacherManagementModal } from "@/components/TeacherManagementModal";
import { MakeUpClassesModal } from "@/components/MakeUpClassesModal";
import { MonthPicker } from "@/components/MonthPicker";
import { ZaloReminderModal } from "@/components/ZaloReminderModal";
import { StudentDetailModal } from "@/components/StudentDetailModal";
import { ChangeStatusModal } from "@/components/ChangeStatusModal";
import { StatusLogModal } from "@/components/StatusLogModal";
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
  ChevronRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Phone,
  Tag,
  Package,
  History,
  MessageSquare,
  PauseCircle,
  UserX,
  CreditCard,
  Eye,
  BarChart3,
  QrCode,
  Info,
} from "lucide-react";
import Link from "next/link";
import { MonthlySummaryModal } from "./MonthlySummaryModal";
import { AppInfoModal } from "./AppInfoModal";

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

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [selectedStudentForMakeup, setSelectedStudentForMakeup] = useState<string | undefined>(undefined);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
  const [studentForMonthly, setStudentForMonthly] = useState<Student | null>(null);

  // New Modals: Zalo reminder, Student detail, Change status, Status log
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);
  const [studentForZalo, setStudentForZalo] = useState<Student | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [studentForDetail, setStudentForDetail] = useState<Student | null>(null);

  const [isChangeStatusModalOpen, setIsChangeStatusModalOpen] = useState(false);
  const [studentForStatusChange, setStudentForStatusChange] = useState<Student | null>(null);

  const [isStatusLogModalOpen, setIsStatusLogModalOpen] = useState(false);
  const [isMonthlySummaryModalOpen, setIsMonthlySummaryModalOpen] = useState(false);
  const [isAppInfoModalOpen, setIsAppInfoModalOpen] = useState(false);

  // Custom Delete Confirmation Modal state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [levels, setLevels] = useState<LevelSurcharge[]>([]);
  const [discountPresets, setDiscountPresets] = useState<DiscountOption[]>([]);
  const [tuitionPackages, setTuitionPackages] = useState<TuitionPackage[]>([]);
  const [currentSchool, setCurrentSchool] = useState<{ id: string; name: string; code: string } | null>(null);

  // Settings
  const [baseTuition, setBaseTuition] = useState<number>(0);
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">("by_hours");
  const [monthFormat, setMonthFormat] = useState<MonthFormat>("vietnamese");
  const [defaultHours, setDefaultHours] = useState<number>(3);
  const [defaultSessions, setDefaultSessions] = useState<number>(3);
  const [defaultStudyTime, setDefaultStudyTime] = useState<string>("18:00 - 19:00");
  const [maxStudents, setMaxStudents] = useState<number>(10);
  const [crowdedThreshold, setCrowdedThreshold] = useState<number>(80);
  const [capacityMode, setCapacityMode] = useState<"by_slot" | "by_teacher">("by_slot");
  const [reconciliationMode, setReconciliationMode] = useState<string>("manual");
  const [zaloReminderMode, setZaloReminderMode] = useState<string>("manual");
  const [zaloBotToken, setZaloBotToken] = useState<string>("");
  const [zaloBotName, setZaloBotName] = useState<string>("");
  const [sepayApiKey, setSepayApiKey] = useState<string>("");
  const [sepayAccountNumber, setSepayAccountNumber] = useState<string>("");
  const [sepayBankName, setSepayBankName] = useState<string>("");
  const [sepayPrefix, setSepayPrefix] = useState<string>("HP");

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "studying" | "reserved" | "dropped">("all");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");

  // Check IP restriction & Admin Auth on mount
  useEffect(() => {
    const initializePortal = async () => {
      try {
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

  // Load Settings
  const loadSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) {
        setBaseTuition(json.data.base_tuition);
        setDurationMode(json.data.duration_mode || "by_hours");
        setMonthFormat(json.data.month_format || "vietnamese");
        setDefaultHours(json.data.default_hours_per_week || 3);
        setDefaultSessions(json.data.default_sessions_per_week || 3);
        setDefaultStudyTime(json.data.default_study_time || "18:00 - 19:00");
        setMaxStudents(json.data.max_students_per_slot || 10);
        setCrowdedThreshold(json.data.crowded_threshold_percent || 80);
        setCapacityMode(json.data.capacity_mode || "by_slot");
        setTimeSlots(json.data.time_slots);
        setLevels(json.data.level_surcharges);
        setDiscountPresets(json.data.discount_presets);
        setTuitionPackages(json.data.tuition_packages || []);
        setReconciliationMode(json.data.reconciliation_mode || "manual");
        setZaloReminderMode(json.data.zalo_reminder_mode || "manual");
        setZaloBotToken(json.data.zalo_bot_token || "");
        setZaloBotName(json.data.zalo_bot_name || "");
        setSepayApiKey(json.data.sepay_api_key || "");
        setSepayAccountNumber(json.data.sepay_account_number || "");
        setSepayBankName(json.data.sepay_bank_name || "");
        setSepayPrefix(json.data.sepay_prefix || "HP");
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

  // Confirm delete student
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeletingStudent(true);
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setStudentToDelete(null);
        loadStudents(selectedMonth);
      } else {
        showToast(data.message || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsDeletingStudent(false);
    }
  };

  // Quick toggle reconciliation for a student in this month
  const handleToggleStudentReconciliation = async (student: Student) => {
    const isCurrentlyPaid = student.payment_status === "paid";
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isCurrentlyPaid ? "mark_unpaid" : "mark_paid",
          student_id: student.id,
          month: selectedMonth,
          package_id: student.tuition_package_id,
          amount: student.current_tuition,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadStudents(selectedMonth);
      } else {
        showToast(data.message || "Không thể cập nhật đối soát!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
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
      const matchStatus =
        selectedStatusFilter === "all" || (s.status || "studying") === selectedStatusFilter;
      const matchPayment =
        selectedPaymentFilter === "all" || (s.payment_status || "unpaid") === selectedPaymentFilter;

      return matchSearch && matchLevel && matchSlot && matchTeacher && matchStatus && matchPayment;
    });
  }, [
    students,
    searchQuery,
    selectedLevelFilter,
    selectedSlotFilter,
    selectedTeacherFilter,
    selectedStatusFilter,
    selectedPaymentFilter,
  ]);

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
      <div className="min-h-screen bg-slate-900/5 dark:bg-slate-950 flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Đang kiểm tra quyền quản trị cơ sở...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: School Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900/5 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-6 relative z-10">
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Đăng Nhập Quản Trị Cơ Sở</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              Nhập tài khoản quản trị viên và mật khẩu do Chủ Hệ Thống cấp để quản lý học sinh và giáo viên cơ sở.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Tài khoản Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Tên tài khoản quản trị"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu của bạn"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans">
      {/* Top SaaS Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          {/* Logo & School Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  Quản Trị Cơ Sở
                </h1>
                {currentSchool && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{currentSchool.name}</span>
                    <span className="font-mono text-[10px] bg-indigo-200/60 dark:bg-indigo-900 px-1.5 py-0.2 rounded-md">
                      {currentSchool.code}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hệ thống quản lý học sinh, phân công giáo viên, theo dõi học phí & lịch học bù
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Portals Links */}
            <div className="hidden xl:flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 mr-1 gap-0.5 text-xs font-semibold">
              <Link
                href="/giao-vien"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-indigo-600 transition shadow-2xs"
                title="Cổng dành cho giáo viên"
              >
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cổng GV</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-emerald-600 transition shadow-2xs"
                title="Cổng dành cho phụ huynh"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cổng PH</span>
              </Link>
            </div>

            {/* Tổng Kết Tháng & Báo Cáo Học Phí */}
            <button
              onClick={() => setIsMonthlySummaryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 transition shadow-2xs shrink-0"
              title="Xem tổng kết thu chi, tình hình đóng học phí và giao dịch SePay tự động"
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Tổng Kết Tháng</span>
            </button>

            {/* Log tổng biến động học sinh (Bảo lưu, nghỉ, học tiếp) */}
            <button
              onClick={() => setIsStatusLogModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 hover:bg-indigo-100/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 transition shadow-2xs shrink-0"
              title="Xem nhật ký tổng học sinh nghỉ, bảo lưu và trở lại học"
            >
              <History className="w-4 h-4 text-indigo-600" />
              <span>Log Biến Động</span>
            </button>

            {/* Make up classes button */}
            <button
              onClick={() => {
                setSelectedStudentForMakeup(undefined);
                setIsMakeupModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 transition shadow-2xs shrink-0"
            >
              <CalendarCheck className="w-4 h-4 text-amber-600" />
              <span>Báo Nghỉ & Học Bù</span>
              {totalPendingMakeups > 0 && (
                <span className="w-4.5 h-4.5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {totalPendingMakeups}
                </span>
              )}
            </button>

            {/* Teachers Management Button */}
            <button
              onClick={() => setIsTeacherModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition shadow-2xs shrink-0"
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Đội Ngũ Giáo Viên ({teachers.length})</span>
            </button>

            {/* System Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition shadow-2xs shrink-0"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Cài Đặt</span>
            </button>

            {/* Giới Thiệu Phần Mềm & Changelog & Góp Ý TpTeam */}
            <button
              onClick={() => setIsAppInfoModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-300 transition shadow-2xs shrink-0"
              title="Giới thiệu phần mềm, nhật ký cập nhật changelog và góp ý cho đội ngũ phát triển"
            >
              <Info className="w-4 h-4 text-indigo-600" />
              <span>Giới Thiệu & Góp Ý</span>
            </button>

            {/* Add Student Button */}
            <button
              onClick={() => {
                setStudentToEdit(null);
                setIsStudentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-md shadow-indigo-600/25 transition shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Thêm Học Sinh</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 transition shrink-0"
              title="Đăng xuất khỏi cổng quản trị cơ sở"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Top Control Bar: Month Selector & KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Month Selector Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                Kỳ Báo Cáo Học Phí
              </span>
              <button
                onClick={() => setSelectedMonth(getCurrentMonthStr())}
                title="Về tháng hiện tại"
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition"
              >
                Hiện tại
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatMonthDisplay(selectedMonth, monthFormat)}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">Dữ liệu học phí áp dụng cho tháng này</p>
              </div>
              <MonthPicker
                value={selectedMonth}
                onChange={(newM) => setSelectedMonth(newM)}
                monthFormat={monthFormat}
              />
            </div>
          </div>

          {/* KPI Stat 1: Total Revenue for Month */}
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md shadow-indigo-600/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-300" />
                Dự Thu {formatMonthDisplay(selectedMonth, monthFormat)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black tracking-tight">
                {formatVND(totalRevenueThisMonth)}
              </div>
              <span className="text-xs text-indigo-100 font-medium mt-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 opacity-80" />
                Tổng cộng <strong>{filteredStudents.length}</strong> học sinh đang theo học
              </span>
            </div>
          </div>

          {/* KPI Stat 2: Base Tuition & Overrides */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-500" />
                Học Phí Cơ Bản (Base)
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatVND(baseTuition)} <span className="text-sm font-semibold text-slate-400">/ tháng</span>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1 inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {overriddenCount} học sinh có học phí tùy chỉnh tháng này
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, số điện thoại..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </div>

            {/* Filter by Status: Đang học / Bảo lưu / Nghỉ học */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
            >
              <option value="all">Tất cả Trạng thái</option>
              <option value="studying">🟢 Đang học</option>
              <option value="reserved">🟡 Bảo lưu</option>
              <option value="dropped">🔴 Nghỉ học</option>
            </select>

            {/* Filter by Payment: Đã đóng / Cần đóng tiền */}
            <select
              value={selectedPaymentFilter}
              onChange={(e) => setSelectedPaymentFilter(e.target.value as any)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
            >
              <option value="all">Tất cả Đối soát</option>
              <option value="paid">✅ Đã đóng học phí</option>
              <option value="unpaid">⚠️ Cần đóng tiền</option>
            </select>

            {/* Filter by Teacher */}
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
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
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
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
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
            >
              <option value="all">Tất cả Khung giờ</option>
              {timeSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {formatTimeSlotLabel(slot)}
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
                className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2 py-1 transition"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>

        {/* Student Table Listing */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  <th className="py-3 px-3 sm:px-4">Học sinh</th>
                  <th className="py-3 px-2.5">Trạng thái</th>
                  <th className="py-3 px-2.5">Giáo viên</th>
                  <th className="py-3 px-2.5">Level & Phụ thu</th>
                  <th className="py-3 px-3">Gói & Lịch học</th>
                  <th className="py-3 px-2 text-center">Chiết khấu</th>
                  <th className="py-3 px-3">Học phí {formatMonthDisplay(selectedMonth, monthFormat)}</th>
                  <th className="py-3 px-3 text-center">Đối soát phí</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-semibold text-xs">Đang tải danh sách học sinh...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
                          <Users className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Không tìm thấy học sinh nào</span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Bấm nút <strong>&quot;+ Thêm Học Sinh&quot;</strong> ở góc trên bên phải để ghi danh học sinh mới vào hệ thống.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const isCustom = Boolean(student.monthly_override);
                    const isByHours = student.duration_mode === "by_hours";
                    const initialChar = student.name ? student.name.trim().charAt(0).toUpperCase() : "H";

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                      >
                        {/* Student Name, Avatar & Phone */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {initialChar}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Mã học sinh đối soát SePay">
                                  {student.student_code || `HS${student.id.slice(-4).toUpperCase()}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentForDetail(student);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="hover:text-indigo-600 transition truncate text-left"
                                  title="Bấm để xem hồ sơ chi tiết học sinh"
                                >
                                  {student.name}
                                </button>
                                {(student.pending_makeups_count || 0) > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedStudentForMakeup(student.id);
                                      setIsMakeupModalOpen(true);
                                    }}
                                    className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 hover:bg-amber-200 transition shadow-2xs whitespace-nowrap"
                                    title="Bấm để xếp lịch học bù"
                                  >
                                    Nợ {student.pending_makeups_count} buổi bù
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {student.phone}
                                </span>
                                {student.start_date && (
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap flex items-center gap-0.5" title="Ngày bắt đầu nhập học">
                                    • Bắt đầu: {student.start_date}
                                  </span>
                                )}
                                {student.zalo_link && (
                                  <a
                                    href={student.zalo_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-400 transition whitespace-nowrap"
                                    title="Nhắn tin nhanh qua Zalo"
                                  >
                                    <Send className="w-2.5 h-2.5" /> Zalo
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status (Đang học / Bảo lưu / Nghỉ học) */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          {student.status === "reserved" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForStatusChange(student);
                                setIsChangeStatusModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 transition"
                              title={`Bảo lưu từ: ${student.status_date || ""}. Bấm để đổi trạng thái`}
                            >
                              <PauseCircle className="w-3 h-3" />
                              <span>Bảo lưu</span>
                            </button>
                          ) : student.status === "dropped" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForStatusChange(student);
                                setIsChangeStatusModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 transition"
                              title={`Nghỉ học từ: ${student.status_date || ""}. Bấm để đổi trạng thái`}
                            >
                              <UserX className="w-3 h-3" />
                              <span>Nghỉ học</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForStatusChange(student);
                                setIsChangeStatusModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 transition"
                              title="Đang học. Bấm để bảo lưu hoặc nghỉ học"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Đang học</span>
                            </button>
                          )}
                        </td>

                        {/* Teacher */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          {student.teacher_name && student.teacher_name !== "Chưa gán GV" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                              <GraduationCap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              {student.teacher_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium italic">Chưa gán GV</span>
                          )}
                        </td>

                        {/* Level & Surcharge */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {student.level_name}
                          </span>
                          {student.level_surcharge && student.level_surcharge > 0 ? (
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                              +{formatVND(student.level_surcharge)}
                            </span>
                          ) : null}
                        </td>

                        {/* Package & Weekly Schedule */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Package badge */}
                            {student.tuition_package_name ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1 whitespace-nowrap border border-purple-200 dark:border-purple-800">
                                <Package className="w-2.5 h-2.5 text-purple-600" />
                                {student.tuition_package_name}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap">
                                Gói Tháng
                              </span>
                            )}

                            {isByHours ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1 whitespace-nowrap">
                                <Hourglass className="w-2.5 h-2.5" />
                                {student.hours_per_week || 3}h/tuần
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 whitespace-nowrap">
                                <Calendar className="w-2.5 h-2.5" />
                                {student.sessions_per_week || 3} buổi/tuần
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[200px] xl:max-w-xs font-mono" title={student.study_time_detail}>
                              {student.study_time_detail || "Linh hoạt trong ca mở cửa"}
                            </span>
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          {student.is_discount_enabled && student.discount_percent > 0 ? (
                            <div className="flex flex-col items-center">
                              <span
                                className="inline-block px-2 py-0.5 text-[11px] font-black rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                                title={student.discount_reason ? `Lý do giảm: ${student.discount_reason}` : undefined}
                              >
                                -{student.discount_percent}%
                              </span>
                              {student.discount_reason && (
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate max-w-[90px] mt-0.5" title={student.discount_reason}>
                                  {student.discount_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">0%</span>
                          )}
                        </td>

                        {/* Monthly Tuition */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span
                              className={`text-sm font-black ${
                                student.is_overdue
                                  ? "text-rose-600 dark:text-rose-400"
                                  : isCustom
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {formatVND(student.current_tuition)}
                            </span>

                            {/* CỘNG DỒN NỢ CŨ VÀ ĐÁNH DẤU NỢ QUÁ 1 THÁNG */}
                            {student.is_overdue && student.previous_debt_amount ? (
                              <div className="mt-1 flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Nợ {student.unpaid_months_count} tháng (+{formatVND(student.previous_debt_amount)})
                                </span>
                                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                                  Tổng phải nộp: {formatVND(student.total_tuition_due)}
                                </span>
                              </div>
                            ) : isCustom ? (
                              <div className="mt-0.5 flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Đã sửa riêng
                                </span>
                                {student.monthly_override?.note && (
                                  <span className="text-[10px] text-slate-500 italic truncate max-w-[120px]">
                                    &ldquo;{student.monthly_override.note}&rdquo;
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">Chuẩn mặc định</span>
                            )}
                          </div>
                        </td>

                        {/* Đối Soát Phí: Checkbox / Toggle Đã đóng hoặc Cần đóng tiền */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStudentReconciliation(student)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold border transition shadow-2xs ${
                                student.payment_status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                  : student.is_overdue
                                  ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-sm animate-pulse"
                                  : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                              }`}
                              title={
                                student.payment_status === "paid"
                                  ? "Bấm để chuyển về Chưa đóng"
                                  : student.is_overdue
                                  ? `Cảnh báo: Học sinh nợ liên tiếp ${student.unpaid_months_count} tháng! Tổng cần thu: ${formatVND(student.total_tuition_due)}`
                                  : "Bấm để xác nhận Đã đóng học phí"
                              }
                            >
                              {student.payment_status === "paid" ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Đã đóng</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className={`w-3.5 h-3.5 ${student.is_overdue ? "text-white" : "text-rose-600"}`} />
                                  <span>{student.is_overdue ? `Nợ ${student.unpaid_months_count} tháng` : "Cần đóng tiền"}</span>
                                </>
                              )}
                            </button>
                            {student.payment_period_desc && (
                              <span className="text-[9px] text-slate-400 font-mono">
                                {student.payment_period_desc}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {/* Nhắc học phí Zalo */}
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForZalo(student);
                                setIsZaloModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition shrink-0"
                              title="Soạn tin nhắn nhắc học phí Zalo"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Chi tiết học sinh */}
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForDetail(student);
                                setIsDetailModalOpen(true);
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition shrink-0"
                              title="Xem chi tiết & lịch sử bảo lưu/nghỉ"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Make up button */}
                            <button
                              onClick={() => {
                                setSelectedStudentForMakeup(student.id);
                                setIsMakeupModalOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 transition shrink-0"
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
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 transition inline-flex items-center gap-1 shrink-0"
                              title="Chỉnh sửa học phí riêng tháng này"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Sửa học phí</span>
                            </button>

                            {/* Edit Student Info Button */}
                            <button
                              onClick={() => {
                                setStudentToEdit(student);
                                setIsStudentModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition shrink-0"
                              title="Sửa thông tin học sinh"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Student Button */}
                            <button
                              onClick={() => setStudentToDelete(student)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition shrink-0"
                              title="Xóa học sinh"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Custom Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xác nhận xóa học sinh?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bạn có chắc chắn muốn xóa học sinh <strong className="text-slate-800 dark:text-slate-200">{studentToDelete.name}</strong> ({studentToDelete.phone})? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingStudent}
                onClick={confirmDeleteStudent}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition disabled:opacity-50"
              >
                {isDeletingStudent ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={handleRefresh}
        initialBaseTuition={baseTuition}
        initialDurationMode={durationMode}
        initialMonthFormat={monthFormat}
        initialDefaultHours={defaultHours}
        initialDefaultSessions={defaultSessions}
        initialDefaultStudyTime={defaultStudyTime}
        initialMaxStudents={maxStudents}
        initialCrowdedThreshold={crowdedThreshold}
        initialCapacityMode={capacityMode}
        initialReconciliationMode={reconciliationMode as any}
        initialSepayApiKey={sepayApiKey}
        initialSepayAccountNumber={sepayAccountNumber}
        initialSepayBankName={sepayBankName}
        initialSepayPrefix={sepayPrefix}
        initialZaloReminderMode={zaloReminderMode as any}
        initialZaloBotToken={zaloBotToken}
        initialZaloBotName={zaloBotName}
        initialTimeSlots={timeSlots}
        initialLevelSurcharges={levels}
        initialDiscountPresets={discountPresets}
        initialTuitionPackages={tuitionPackages}
      />

      {/* Teachers Management Modal */}
      <TeacherManagementModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        teachers={teachers}
        timeSlots={timeSlots}
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
        tuitionPackages={tuitionPackages}
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
        monthFormat={monthFormat}
      />

      {/* Zalo Reminder Modal */}
      <ZaloReminderModal
        isOpen={isZaloModalOpen}
        onClose={() => setIsZaloModalOpen(false)}
        student={studentForZalo}
        selectedMonth={selectedMonth}
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={studentForDetail}
        selectedMonth={selectedMonth}
        onOpenStatusChange={(st) => {
          setStudentForStatusChange(st);
          setIsChangeStatusModalOpen(true);
        }}
        onOpenZaloReminder={(st) => {
          setStudentForZalo(st);
          setIsZaloModalOpen(true);
        }}
        onReconciliationToggle={handleToggleStudentReconciliation}
      />

      {/* Change Status Modal (Bảo lưu / Nghỉ học / Học tiếp) */}
      <ChangeStatusModal
        isOpen={isChangeStatusModalOpen}
        onClose={() => setIsChangeStatusModalOpen(false)}
        student={studentForStatusChange}
        onSaved={() => loadStudents(selectedMonth)}
      />

      {/* Status Log Modal (Nhật ký tổng biến động học sinh) */}
      <StatusLogModal
        isOpen={isStatusLogModalOpen}
        onClose={() => setIsStatusLogModalOpen(false)}
        selectedMonth={selectedMonth}
      />

      {/* Monthly Summary Modal (Tổng Kết Báo Cáo Học Phí & SePay) */}
      <MonthlySummaryModal
        isOpen={isMonthlySummaryModalOpen}
        onClose={() => setIsMonthlySummaryModalOpen(false)}
        initialMonth={selectedMonth}
        monthFormat={monthFormat}
        onRefreshData={() => loadStudents(selectedMonth)}
      />

      {/* App Info & Feedback Modal (Giới thiệu, Changelog & Góp ý) */}
      <AppInfoModal
        isOpen={isAppInfoModalOpen}
        onClose={() => setIsAppInfoModalOpen(false)}
        schoolId={currentSchool?.id || "school-default"}
        schoolName={currentSchool?.name || "Trung tâm đào tạo"}
        schoolCode={currentSchool?.code || "TT"}
      />
    </div>
  );
}
