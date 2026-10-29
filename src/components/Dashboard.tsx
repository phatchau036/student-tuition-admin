"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Student, TimeSlot, LevelSurcharge, DiscountOption, Teacher, MonthFormat, TuitionPackage, Subject, StudentStatus } from "@/lib/types";
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
  Globe,
  Sun,
  Moon,
  MoreVertical,
  MoreHorizontal,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckSquare,
  Square,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { MonthlySummaryModal } from "./MonthlySummaryModal";
import { AppInfoModal } from "./AppInfoModal";
import { SmartExcelImportModal } from "./SmartExcelImportModal";
import { QuickAuditModal } from "./QuickAuditModal";
import { ClassroomScheduleMatrix } from "./ClassroomScheduleMatrix";
import { HourWalletModal } from "./HourWalletModal";
import { ScheduleAvailabilityModal } from "./ScheduleAvailabilityModal";
import { exportStudentsToExcel } from "@/lib/exportExcel";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { AppLanguage } from "@/lib/types";

export default function Dashboard() {
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

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
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedStudentForWallet, setSelectedStudentForWallet] = useState<Student | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [slotPrefill, setSlotPrefill] = useState<{
    day?: string;
    time?: string;
    teacherId?: string;
  }>({});

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
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isQuickAuditModalOpen, setIsQuickAuditModalOpen] = useState(false);
  const [studentForQuickAudit, setStudentForQuickAudit] = useState<Student | null>(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [currentSchool, setCurrentSchool] = useState<{ id: string; name: string; code: string } | null>(null);

  // Settings
  const [baseTuition, setBaseTuition] = useState<number>(0);
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">("by_hours");
  const [monthFormat, setMonthFormat] = useState<MonthFormat>("vietnamese");
  const [defaultHours, setDefaultHours] = useState<number>(3);
  const [defaultSessions, setDefaultSessions] = useState<number>(3);
  const [defaultStudyTime, setDefaultStudyTime] = useState<string>("18:00 - 19:00");
  const [defaultMinutesPerSession, setDefaultMinutesPerSession] = useState<number>(90);
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
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "studying" | "reserved" | "dropped">("all");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");

  // Modern UI states: Active Row Action Menu & Quick Manage Dropdown
  const [openRowActionStudent, setOpenRowActionStudent] = useState<Student | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    right: number;
    openUpward: boolean;
  } | null>(null);
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Close action menu on scroll or resize
  useEffect(() => {
    if (!openRowActionStudent) return;
    const handleCloseMenu = () => {
      setOpenRowActionStudent(null);
      setActionMenuPosition(null);
    };
    window.addEventListener("scroll", handleCloseMenu, true);
    window.addEventListener("resize", handleCloseMenu);
    return () => {
      window.removeEventListener("scroll", handleCloseMenu, true);
      window.removeEventListener("resize", handleCloseMenu);
    };
  }, [openRowActionStudent]);

  // Main Dashboard View Mode: "table" (Bảng danh sách) | "schedule_matrix" (Sơ đồ lớp học ma trận theo Thứ & Giờ)
  const [mainViewMode, setMainViewMode] = useState<"table" | "schedule_matrix">("table");

  // Bulk Selection States (Chọn hàng loạt)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkConfirmModal, setBulkConfirmModal] = useState<{
    isOpen: boolean;
    action: "delete" | "reserve" | "drop" | "resume";
    title: string;
    description: string;
  } | null>(null);

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
          loadSettings(json.admin.school_id);
          loadTeachers(json.admin.school_id);
          loadStudents(selectedMonth, json.admin.school_id);
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
        const schoolObj = {
          id: data.admin.school_id,
          name: data.admin.school_name,
          code: data.admin.school_code,
        };
        setCurrentSchool(schoolObj);
        loadSettings(data.admin.school_id);
        loadTeachers(data.admin.school_id);
        loadStudents(selectedMonth, data.admin.school_id);
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

  // Helper lấy headers có kèm Authorization token
  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (currentSchool?.id) headers["x-school-id"] = currentSchool.id;
    return headers;
  };

  // Load Settings
  const loadSettings = async (schoolId?: string) => {
    try {
      const targetSchoolId = schoolId || currentSchool?.id || "";
      const query = targetSchoolId ? `?school_id=${targetSchoolId}` : "";
      const res = await fetch(`/api/settings${query}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setBaseTuition(json.data.base_tuition);
        setDurationMode(json.data.duration_mode || "by_hours");
        if (json.data.app_language) {
          setLanguage(json.data.app_language);
        }
        setMonthFormat(json.data.month_format || "vietnamese");
        setDefaultHours(json.data.default_hours_per_week || 3);
        setDefaultSessions(json.data.default_sessions_per_week || 3);
        setDefaultStudyTime(json.data.default_study_time || "18:00 - 19:00");
        setDefaultMinutesPerSession(Number(json.data.default_minutes_per_session) || 90);
        setMaxStudents(json.data.max_students_per_slot || 10);
        setCrowdedThreshold(json.data.crowded_threshold_percent || 80);
        setCapacityMode(json.data.capacity_mode || "by_slot");
        setTimeSlots(json.data.time_slots);
        setLevels(json.data.level_surcharges);
        setDiscountPresets(json.data.discount_presets);
        setTuitionPackages(json.data.tuition_packages || []);
        setSubjects(json.data.subjects || []);
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
  const loadTeachers = async (schoolId?: string) => {
    try {
      const targetSchoolId = schoolId || currentSchool?.id || "";
      const query = targetSchoolId ? `?school_id=${targetSchoolId}` : "";
      const res = await fetch(`/api/teachers${query}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setTeachers(json.data);
      }
    } catch (err) {
      console.error("Failed to load teachers:", err);
    }
  };

  // Load Students for Selected Month (Hỗ trợ silent refresh giữ nguyên vị trí cuộn trang)
  const loadStudents = async (month: string, schoolId?: string, silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      const targetSchoolId = schoolId || currentSchool?.id || "";
      const schoolParam = targetSchoolId ? `&school_id=${targetSchoolId}` : "";
      const res = await fetch(`/api/students?month=${month}${schoolParam}`, {
        headers: getAuthHeaders(),
      });
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
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadTeachers();
  }, []);

  useEffect(() => {
    if (currentSchool?.id) {
      loadStudents(selectedMonth, currentSchool.id);
    } else {
      loadStudents(selectedMonth);
    }
  }, [selectedMonth, currentSchool]);

  // Refresh all
  const handleRefresh = () => {
    loadSettings();
    loadTeachers();
    loadStudents(selectedMonth, currentSchool?.id);
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
        loadStudents(selectedMonth, undefined, true);
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
      const matchSubject = selectedSubjectFilter === "all" || s.subject_id === selectedSubjectFilter;
      const matchLevel = selectedLevelFilter === "all" || s.level_id === selectedLevelFilter;
      const matchSlot = selectedSlotFilter === "all" || s.time_slot_id === selectedSlotFilter;
      const matchTeacher = selectedTeacherFilter === "all" || s.teacher_id === selectedTeacherFilter;
      const matchStatus =
        selectedStatusFilter === "all" || (s.status || "studying") === selectedStatusFilter;
      const matchPayment =
        selectedPaymentFilter === "all" || (s.payment_status || "unpaid") === selectedPaymentFilter;

      return matchSearch && matchSubject && matchLevel && matchSlot && matchTeacher && matchStatus && matchPayment;
    });
  }, [
    students,
    searchQuery,
    selectedSubjectFilter,
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

  // ⭐ VÍ GIỜ HỌC: Đếm học sinh cần xử lý (số dư âm hoặc chưa có ví giờ vì chưa đóng tháng)
  const totalPendingMakeups = useMemo(() => {
    return students.filter((s) => {
      const avail = Number(s.available_minutes ?? 0);
      return avail < 0; // Số dư khả dụng âm = đã học/xếp bù quá số giờ được cấp
    }).length;
  }, [students]);

  // Bulk Selection Helpers
  const isAllFilteredSelected = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s) => selectedStudentIds.includes(s.id));
  }, [filteredStudents, selectedStudentIds]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Bỏ chọn tất cả học sinh đang hiển thị
      const filteredIdSet = new Set(filteredStudents.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      // Chọn tất cả học sinh đang hiển thị
      const allFilteredIds = filteredStudents.map((s) => s.id);
      setSelectedStudentIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const handleToggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleExecuteBulkAction = async (action: "delete" | "reserve" | "drop" | "resume") => {
    if (selectedStudentIds.length === 0) return;
    try {
      setIsBulkOperating(true);
      const res = await fetch("/api/students/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          student_ids: selectedStudentIds,
          effective_date: new Date().toISOString().slice(0, 10),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setSelectedStudentIds([]);
        setBulkConfirmModal(null);
        loadStudents(selectedMonth, undefined, true);
      } else {
        showToast(data.message || "Thao tác hàng loạt thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsBulkOperating(false);
    }
  };

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
                  {t.school_portal}
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
                {t.app_subtitle}
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
                <span>{t.teacher_portal}</span>
              </Link>
              <Link
                href="/"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-emerald-600 transition shadow-2xs"
                title="Cổng dành cho phụ huynh"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.parent_portal}</span>
              </Link>
            </div>

            {/* Nút Chuyển Đổi Theme Sáng / Tối */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs mr-1"
              title={theme === "dark" ? "Chuyển sang chế độ Sáng (Light Mode)" : "Chuyển sang chế độ Tối (Dark Mode)"}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Quick Language Switcher Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={language}
                onChange={(e) => {
                  const newL = e.target.value as AppLanguage;
                  setLanguage(newL);
                  const newMonthFmt = newL === "vi" ? "vietnamese" : newL === "zh" ? "chinese" : newL === "ja" ? "japanese" : "english";
                  setMonthFormat(newMonthFmt);
                  fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      app_language: newL,
                      month_format: newMonthFmt,
                    }),
                  });
                }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition cursor-pointer shadow-2xs mr-1"
                title="Chọn ngôn ngữ giao diện (Tiếng Việt, English, 中文, 日本語)"
              >
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇬🇧 English</option>
                <option value="zh">🇨🇳 中文</option>
                <option value="ja">🇯🇵 日本語</option>
              </select>
            </div>

            {/* Tổng Kết Tháng Quick Badge */}
            <button
              onClick={() => setIsMonthlySummaryModalOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 transition shadow-2xs shrink-0"
              title="Xem tổng kết thu chi, tình hình đóng học phí và giao dịch SePay tự động"
            >
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>{t.monthly_summary}</span>
            </button>

            {/* Menu Quản Lý Nghiệp Vụ Tập Trung (Consolidated Management Menu) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsManagementMenuOpen(!isManagementMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition shadow-2xs shrink-0"
                title={t.branch_operations}
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span>{t.branch_operations}</span>
                {totalPendingMakeups > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse ml-0.5">
                    {totalPendingMakeups}
                  </span>
                )}
                <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isManagementMenuOpen ? "rotate-90" : ""}`} />
              </button>

              {isManagementMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setIsManagementMenuOpen(false)}
                >
                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsTeacherModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                  >
                    <span className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>{t.teachers_team}</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {teachers.length}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setSelectedStudentForMakeup(undefined);
                      setIsMakeupModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarCheck className="w-4 h-4 text-amber-600" />
                      <span>{t.absence_makeup}</span>
                    </span>
                    {totalPendingMakeups > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {totalPendingMakeups}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsStatusLogModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                  >
                    <History className="w-4 h-4 text-indigo-600" />
                    <span>{t.status_log}</span>
                  </button>

                  {/* ⭐ VÍ GIỜ HỌC: Quản lý ví giờ của học sinh */}
                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      // Mở ví của học sinh đầu tiên theo filter (hoặc search trong modal bằng select)
                      const target =
                        filteredStudents.find((s) => (s.available_minutes ?? 0) !== 0) || filteredStudents[0] || students[0];
                      if (target) {
                        setSelectedStudentForWallet(target);
                        setIsWalletModalOpen(true);
                      } else {
                        showToast("Chưa có học sinh nào trong cơ sở!", "error");
                      }
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>⏱️ Ví Giờ Học</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {filteredStudents.filter((s) => Number(s.available_minutes ?? 0) > 0).length} ví
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsMonthlySummaryModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                  >
                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                    <span>{t.monthly_summary}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Smart Excel Import */}
                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsExcelImportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition text-left"
                  >
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>{t.excel_import_btn}</span>
                  </button>

                  {/* Export Excel */}
                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      exportStudentsToExcel(filteredStudents, selectedMonth, currentSchool?.name || "TrungTam");
                      showToast("Đã xuất file Excel học viên thành công!", "success");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-left"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>{t.excel_export_btn}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>{t.settings}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsAppInfoModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
                  >
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>{t.app_info_feedback}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Student Primary Action */}
            <button
              onClick={() => {
                setStudentToEdit(null);
                setIsStudentModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-md shadow-indigo-600/25 transition shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t.add_student}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleAdminLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-600 dark:text-slate-300 transition shrink-0"
              title="Đăng xuất khỏi cổng quản trị cơ sở"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.logout}</span>
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
                {t.tuition_month}
              </span>
              <button
                onClick={() => setSelectedMonth(getCurrentMonthStr())}
                title={t.current_month}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition"
              >
                {t.current_month}
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {formatMonthDisplay(selectedMonth, monthFormat)}
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">{t.app_subtitle}</p>
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
                {t.expected_revenue} {formatMonthDisplay(selectedMonth, monthFormat)}
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
                <strong>{filteredStudents.length}</strong> {t.total_active_students}
              </span>
            </div>
          </div>

          {/* KPI Stat 2: Active Packages & Overrides */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-500" />
                {t.tuition_packages_custom}
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {tuitionPackages.length} <span className="text-sm font-semibold text-slate-400">{t.packages_applied}</span>
              </div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1 inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {overriddenCount} {t.overridden_students}
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar: Modern Executive Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          {/* Top Switcher: Bảng Danh Sách vs Sơ Đồ Lớp Học với viên thuốc trượt mềm mại */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="relative p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center text-xs font-bold w-full sm:w-[480px] overflow-hidden select-none">
              {/* Sliding Pill Background Indicator */}
              <div
                className="absolute top-1 bottom-1 rounded-xl bg-indigo-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none"
                style={{
                  left: mainViewMode === "table" ? "4px" : "calc(50% + 2px)",
                  width: "calc(50% - 6px)",
                }}
              />

              <button
                type="button"
                onClick={() => setMainViewMode("table")}
                className={`relative z-10 flex-1 px-4 py-2 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  mainViewMode === "table"
                    ? "text-white font-black"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>📋 Bảng Danh Sách Học Sinh</span>
              </button>

              <button
                type="button"
                onClick={() => setMainViewMode("schedule_matrix")}
                className={`relative z-10 flex-1 px-4 py-2 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                  mainViewMode === "schedule_matrix"
                    ? "text-white font-black"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>📅 Sơ Đồ Lớp Học (Theo Thầy Cô & Giờ)</span>
              </button>
            </div>

            {mainViewMode === "schedule_matrix" && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsAvailabilityModalOpen(true)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>⚡ Tư Vấn Ca Trống</span>
                </button>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hidden sm:inline-flex items-center gap-1.5">
                  <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Lưới 7 ngày toàn tuần đồng bộ, nhấn vào ô trống để thêm nhanh</span>
                </span>
              </div>
            )}
          </div>

          {mainViewMode === "table" && (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 text-xs font-bold scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedStatusFilter("all");
                  setSelectedPaymentFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                  selectedStatusFilter === "all" && selectedPaymentFilter === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                {t.all_tab} ({students.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStatusFilter("studying");
                  setSelectedPaymentFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedStatusFilter === "studying" && selectedPaymentFilter === "all"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{t.enrolled_tab} ({students.filter((s) => (s.status || "studying") === "studying").length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentFilter("unpaid");
                  setSelectedStatusFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedPaymentFilter === "unpaid"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>{t.unpaid_tab} ({students.filter((s) => s.payment_status === "unpaid").length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedPaymentFilter("paid");
                  setSelectedStatusFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedPaymentFilter === "paid"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t.paid_tab} ({students.filter((s) => s.payment_status === "paid").length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStatusFilter("reserved");
                  setSelectedPaymentFilter("all");
                }}
                className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
                  selectedStatusFilter === "reserved"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.reserved_tab} ({students.filter((s) => s.status === "reserved").length})</span>
              </button>
            </div>

            {/* Right Side: Search & Advanced Filters Toggle */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder={t.search_input_placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition flex items-center gap-1.5 shrink-0 ${
                  showAdvancedFilters || selectedTeacherFilter !== "all" || selectedLevelFilter !== "all" || selectedSlotFilter !== "all"
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{t.advanced_filter}</span>
                {(selectedTeacherFilter !== "all" || selectedLevelFilter !== "all" || selectedSlotFilter !== "all") && (
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                )}
              </button>
            </div>
          </div>
          )}

          {/* Advanced Filters Expandable Drawer */}
          {mainViewMode === "table" && showAdvancedFilters && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2.5 animate-in fade-in duration-150">
              {/* Filter by Subject */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {t.filter_subject}
                </label>
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">{t.filter_all_subjects}</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Teacher */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {t.filter_teacher}
                </label>
                <select
                  value={selectedTeacherFilter}
                  onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">-- {t.filter_all_teachers} --</option>
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Level */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {t.filter_level}
                </label>
                <select
                  value={selectedLevelFilter}
                  onChange={(e) => setSelectedLevelFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">-- {t.filter_all_levels} --</option>
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.level_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Slot */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  {t.filter_slot}
                </label>
                <select
                  value={selectedSlotFilter}
                  onChange={(e) => setSelectedSlotFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">-- {t.filter_all_slots} --</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {formatTimeSlotLabel(slot)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Student Table Listing */}
        {mainViewMode === "table" && (
          <div key="table_view" className="animate-in fade-in duration-200 ease-out bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative">
          <div className="overflow-x-auto overflow-y-visible pb-32">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">
                  {/* Select All Checkbox Column */}
                  <th className="py-3 px-3 sm:px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title={isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả học sinh đang hiển thị"}
                    />
                  </th>
                  <th className="py-3 px-2 sm:px-3">{t.col_student}</th>
                  <th className="py-3 px-2.5">{t.col_status}</th>
                  <th className="py-3 px-2.5">{t.col_teacher}</th>
                  <th className="py-3 px-2.5">{t.col_level_surcharge}</th>
                  <th className="py-3 px-3">{t.col_package_schedule}</th>
                  <th className="py-3 px-2 text-center">{t.col_discount}</th>
                  <th className="py-3 px-3">{t.col_tuition} {formatMonthDisplay(selectedMonth, monthFormat)}</th>
                  <th className="py-3 px-3 text-center">{t.col_reconciliation}</th>
                  <th className="py-3 px-3 text-right">{t.col_actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <span className="font-semibold text-xs">{t.loading_students}</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-1">
                          <Users className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{t.no_students_found}</span>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t.no_students_hint}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const isCustom = Boolean(student.monthly_override);
                    const isByHours = student.duration_mode === "by_hours";
                    const initialChar = student.name ? student.name.trim().charAt(0).toUpperCase() : "H";
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <tr
                        key={student.id}
                        className={`transition group ${
                          isSelected
                            ? "bg-indigo-50/60 dark:bg-indigo-950/40"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Student Name, Avatar & Phone */}
                        <td className="py-3 px-2 sm:px-3">
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
                                {(() => {
                                  // ⭐ VÍ GIỜ HỌC: Hiển thị số dư ví giờ dạng "Còn 7h30"
                                  const avail = Number(student.available_minutes ?? 0);
                                  if (avail === 0) return null;
                                  const isNegative = avail < 0;
                                  const abs = Math.abs(avail);
                                  const h = Math.floor(abs / 60);
                                  const m = abs % 60;
                                  const label = h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m} phút`;
                                  return (
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForWallet(student);
                                        setIsWalletModalOpen(true);
                                      }}
                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black transition shadow-2xs whitespace-nowrap ${
                                        isNegative
                                          ? "bg-rose-600 text-white animate-pulse hover:bg-rose-700"
                                          : avail >= 180
                                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                          : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                      }`}
                                      title={`Ví giờ khả dụng: ${label} (bấm để mở Ví Giờ Học & xếp bù)`}
                                    >
                                      ⏱️ {isNegative ? `Âm ${label}` : `Còn ${label}`}
                                    </button>
                                  );
                                })()}
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
                              <span>{t.status_reserved}</span>
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
                              <span>{t.status_dropped}</span>
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
                              <span>{t.status_studying}</span>
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
                            <span className="text-xs text-slate-400 font-medium italic">{t.no_teacher_assigned}</span>
                          )}
                        </td>

                        {/* Level & Subject & Surcharge */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            {student.subject_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <BookOpen className="w-2.5 h-2.5" />
                                {student.subject_name}
                              </span>
                            )}
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {student.level_name}
                            </span>
                            {student.level_surcharge && student.level_surcharge > 0 ? (
                              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                +{formatVND(student.level_surcharge)}
                              </span>
                            ) : null}
                          </div>
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
                                {t.monthly_package}
                              </span>
                            )}

                            {isByHours ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1 whitespace-nowrap">
                                <Hourglass className="w-2.5 h-2.5" />
                                {student.hours_per_week || 3}{t.hours_per_week_unit}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 whitespace-nowrap">
                                <Calendar className="w-2.5 h-2.5" />
                                {student.sessions_per_week || 3} {t.sessions_per_week_unit}
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[200px] xl:max-w-xs font-mono" title={student.study_time_detail}>
                              {student.study_time_detail || t.flexible_hours_slot}
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
                                  {t.past_debt_label.replace("{months}", String(student.unpaid_months_count)).replace("{amount}", formatVND(student.previous_debt_amount))}
                                </span>
                                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">
                                  {t.total_due}: {formatVND(student.total_tuition_due)}
                                </span>
                              </div>
                            ) : isCustom ? (
                              <div className="mt-0.5 flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {t.custom_override}
                                </span>
                                {student.monthly_override?.note && (
                                  <span className="text-[10px] text-slate-500 italic truncate max-w-[120px]">
                                    &ldquo;{student.monthly_override.note}&rdquo;
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">{t.default_standard}</span>
                            )}
                          </div>
                        </td>

                        {/* Đối Soát Phí: Bấm để mở bảng Đối soát nhanh (Chọn Đã đóng / Chưa đóng & Tick chọn từng tháng) */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForQuickAudit(student);
                                setIsQuickAuditModalOpen(true);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold border transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer ${
                                student.payment_status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                  : student.is_overdue
                                  ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700 shadow-sm animate-pulse"
                                  : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
                              }`}
                              title="Bấm để mở bảng đối soát học phí chi tiết (chọn Đã đóng/Chưa đóng hoặc tick từng tháng)"
                            >
                              {student.payment_status === "paid" ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{t.reconciliation_paid_badge}</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className={`w-3.5 h-3.5 ${student.is_overdue ? "text-white" : "text-rose-600"}`} />
                                  <span>{student.is_overdue ? `${t.overdue_badge} ${student.unpaid_months_count}m` : t.reconciliation_unpaid_badge}</span>
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

                        {/* Consolidated Modern Action Column */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 relative">
                            {/* Primary Action: Xem Chi Tiết */}
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForDetail(student);
                                setIsDetailModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
                              title="Xem chi tiết học sinh & hồ sơ"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="hidden sm:inline">{t.action_details}</span>
                            </button>

                            {/* Dropdown Action Menu Trigger */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (openRowActionStudent?.id === student.id) {
                                  setOpenRowActionStudent(null);
                                  setActionMenuPosition(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const menuHeight = 240;
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;
                                  
                                  setActionMenuPosition({
                                    top: openUpward ? rect.top - 6 : rect.bottom + 6,
                                    right: window.innerWidth - rect.right,
                                    openUpward,
                                  });
                                  setOpenRowActionStudent(student);
                                }
                              }}
                              className={`p-1.5 rounded-xl border transition shadow-2xs ${
                                openRowActionStudent?.id === student.id
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              }`}
                              title={t.action_all}
                            >
                              <MoreHorizontal className="w-4 h-4" />
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
        )}

        {/* Global Action Menu Portal (Không bao giờ bị tràn hay che khuất bởi overflow-x-auto của table) */}
        {typeof document !== "undefined" &&
          openRowActionStudent &&
          actionMenuPosition &&
          createPortal(
            <>
              <div
                className="fixed inset-0 z-50 bg-transparent"
                onClick={() => {
                  setOpenRowActionStudent(null);
                  setActionMenuPosition(null);
                }}
              />
              <div
                style={{
                  position: "fixed",
                  top: actionMenuPosition.openUpward ? undefined : `${actionMenuPosition.top}px`,
                  bottom: actionMenuPosition.openUpward ? `${window.innerHeight - actionMenuPosition.top}px` : undefined,
                  right: `${actionMenuPosition.right}px`,
                }}
                className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-1.5 space-y-0.5 text-left animate-in fade-in zoom-in-95 duration-100 font-sans"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Nhắc học phí Zalo */}
                <button
                  type="button"
                  onClick={() => {
                    const st = openRowActionStudent;
                    setOpenRowActionStudent(null);
                    setActionMenuPosition(null);
                    setStudentForZalo(st);
                    setIsZaloModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t.action_zalo_reminder}</span>
                </button>

                {/* Sửa học phí tháng */}
                <button
                  type="button"
                  onClick={() => {
                    const st = openRowActionStudent;
                    setOpenRowActionStudent(null);
                    setActionMenuPosition(null);
                    setStudentForMonthly(st);
                    setIsMonthlyModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50 dark:hover:text-amber-300 transition cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t.action_edit_fee}</span>
                </button>

                {/* Báo nghỉ / Học bù */}
                <button
                  type="button"
                  onClick={() => {
                    const st = openRowActionStudent;
                    setOpenRowActionStudent(null);
                    setActionMenuPosition(null);
                    setSelectedStudentForMakeup(st.id);
                    setIsMakeupModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 transition cursor-pointer"
                >
                  <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t.action_makeup}</span>
                </button>

                {/* Bảo lưu / Học tiếp */}
                <button
                  type="button"
                  onClick={() => {
                    const st = openRowActionStudent;
                    setOpenRowActionStudent(null);
                    setActionMenuPosition(null);
                    setStudentForStatusChange(st);
                    setIsChangeStatusModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>{openRowActionStudent.status === "reserved" ? t.action_resume : t.action_reserve}</span>
                </button>

                {/* Chỉnh sửa thông tin */}
                <button
                  type="button"
                  onClick={() => {
                    const st = openRowActionStudent;
                    setOpenRowActionStudent(null);
                    setActionMenuPosition(null);
                    setStudentToEdit(st);
                    setIsStudentModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.action_edit_info}</span>
                </button>

                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* Xóa học sinh */}
                <button
                  type="button"
                  onClick={() => {
                    const st = openRowActionStudent;
                    setOpenRowActionStudent(null);
                    setActionMenuPosition(null);
                    setStudentToDelete(st);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.action_delete_student}</span>
                </button>
              </div>
            </>,
            document.body
          )}

        {/* Chế độ 2: Sơ Đồ Lớp Học Ma Trận (Theo Thứ, Khung Giờ & Giáo Viên) */}
        {mainViewMode === "schedule_matrix" && (
          <div key="schedule_matrix_view" className="animate-in fade-in duration-200 ease-out">
            <ClassroomScheduleMatrix
              students={students}
              teachers={teachers}
              timeSlots={timeSlots}
              subjects={subjects}
              onSelectStudent={(st) => {
                setStudentForDetail(st);
                setIsDetailModalOpen(true);
              }}
              onAddStudentToSlot={(day, time, tcId) => {
                setStudentToEdit(null);
                setSlotPrefill({ day, time, teacherId: tcId });
                setIsStudentModalOpen(true);
              }}
              onOpenConsultation={() => setIsAvailabilityModalOpen(true)}
            />
          </div>
        )}

        {/* Floating Bulk Action Bar (Thanh tác vụ nổi khi tick chọn nhiều học sinh) */}
        {selectedStudentIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md px-4 py-3 flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                {selectedStudentIds.length}
              </span>
              <span className="text-xs font-bold text-slate-200 hidden sm:inline">
                Đã chọn {selectedStudentIds.length} học sinh
              </span>
            </div>

            {/* Quick Bulk Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Bảo lưu hàng loạt */}
              <button
                type="button"
                onClick={() =>
                  setBulkConfirmModal({
                    isOpen: true,
                    action: "reserve",
                    title: "Bảo lưu hàng loạt",
                    description: `Bạn có chắc muốn chuyển ${selectedStudentIds.length} học sinh đã chọn sang trạng thái BẢO LƯU?`,
                  })
                }
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Bảo Lưu</span>
              </button>

              {/* Nghỉ học hàng loạt */}
              <button
                type="button"
                onClick={() =>
                  setBulkConfirmModal({
                    isOpen: true,
                    action: "drop",
                    title: "Nghỉ học hàng loạt",
                    description: `Bạn có chắc muốn chuyển ${selectedStudentIds.length} học sinh đã chọn sang trạng thái NGHỈ HỌC?`,
                  })
                }
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Nghỉ Học</span>
              </button>

              {/* Học tiếp hàng loạt */}
              <button
                type="button"
                onClick={() =>
                  setBulkConfirmModal({
                    isOpen: true,
                    action: "resume",
                    title: "Học tiếp hàng loạt",
                    description: `Bạn có chắc muốn kích hoạt ${selectedStudentIds.length} học sinh đã chọn trở lại trạng thái ĐANG HỌC?`,
                  })
                }
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Học Tiếp</span>
              </button>

              {/* Xóa hàng loạt */}
              <button
                type="button"
                onClick={() =>
                  setBulkConfirmModal({
                    isOpen: true,
                    action: "delete",
                    title: "Xóa học sinh hàng loạt",
                    description: `CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN ${selectedStudentIds.length} học sinh đã chọn khỏi hệ thống? Dữ liệu lịch học và học phí liên quan cũng sẽ bị xóa sạch!`,
                  })
                }
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa Hàng Loạt</span>
              </button>
            </div>

            {/* Bỏ chọn tất cả */}
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-1"
              title="Bỏ chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Modal Xác Nhận Thao Tác Hàng Loạt (Bulk Confirm Modal) */}
      {bulkConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
              bulkConfirmModal.action === "delete"
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                : bulkConfirmModal.action === "reserve"
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
            }`}>
              {bulkConfirmModal.action === "delete" ? (
                <Trash2 className="w-6 h-6" />
              ) : bulkConfirmModal.action === "reserve" ? (
                <PauseCircle className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {bulkConfirmModal.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {bulkConfirmModal.description}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => setBulkConfirmModal(null)}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={isBulkOperating}
                onClick={() => handleExecuteBulkAction(bulkConfirmModal.action)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  bulkConfirmModal.action === "delete"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                    : bulkConfirmModal.action === "reserve"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
                }`}
              >
                {isBulkOperating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>Xác Nhận Thực Hiện</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
        initialDefaultMinutesPerSession={defaultMinutesPerSession}
        initialZaloReminderMode={zaloReminderMode as any}
        initialZaloBotToken={zaloBotToken}
        initialZaloBotName={zaloBotName}
        initialTimeSlots={timeSlots}
        initialLevelSurcharges={levels}
        initialDiscountPresets={discountPresets}
        initialTuitionPackages={tuitionPackages}
        initialSubjects={subjects}
        schoolId={currentSchool?.id}
      />

      {/* Teachers Management Modal */}
      <TeacherManagementModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        teachers={teachers}
        timeSlots={timeSlots}
        schoolId={currentSchool?.id}
        onRefresh={handleRefresh}
      />

      {/* Make Up Classes & Absence Modal */}
      <MakeUpClassesModal
        isOpen={isMakeupModalOpen}
        onClose={() => setIsMakeupModalOpen(false)}
        students={students}
        timeSlots={timeSlots}
        initialStudentId={selectedStudentForMakeup}
        schoolId={currentSchool?.id}
        onRefresh={handleRefresh}
      />

      {/* ⭐ VÍ GIỜ HỌC: Modal quản lý ví giờ của học sinh */}
      <HourWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        student={selectedStudentForWallet}
        schoolId={currentSchool?.id}
        onOpenMakeup={(studentId) => {
          setIsWalletModalOpen(false);
          setSelectedStudentForMakeup(studentId);
          setIsMakeupModalOpen(true);
        }}
        onRefresh={handleRefresh}
      />

      {/* Student Form Modal (Create / Edit) */}
      <StudentFormModal
        isOpen={isStudentModalOpen}
        onClose={() => {
          setIsStudentModalOpen(false);
          setSlotPrefill({});
        }}
        onSaved={handleRefresh}
        studentToEdit={studentToEdit}
        baseTuition={baseTuition}
        levels={levels}
        timeSlots={timeSlots}
        teachers={teachers}
        discountPresets={discountPresets}
        tuitionPackages={tuitionPackages}
        subjects={subjects}
        schoolId={currentSchool?.id}
        defaultDurationMode={durationMode}
        defaultSessions={defaultSessions}
        defaultHours={defaultHours}
        defaultStudyTime={defaultStudyTime}
        initialTeacherId={slotPrefill.teacherId}
        initialDay={slotPrefill.day}
        initialStartTime={slotPrefill.time}
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
        onOpenWallet={(st) => {
          setIsDetailModalOpen(false);
          setSelectedStudentForWallet(st);
          setIsWalletModalOpen(true);
        }}
      />

      {/* Change Status Modal (Bảo lưu / Nghỉ học / Học tiếp - Silent update không bị nhảy trang) */}
      <ChangeStatusModal
        isOpen={isChangeStatusModalOpen}
        onClose={() => setIsChangeStatusModalOpen(false)}
        student={studentForStatusChange}
        schoolId={currentSchool?.id}
        onSaved={() => loadStudents(selectedMonth, undefined, true)}
      />

      {/* Quick Audit Modal (Đối soát nhanh: Chọn Đã đóng/Chưa đóng hoặc tick từng tháng) */}
      <QuickAuditModal
        isOpen={isQuickAuditModalOpen}
        onClose={() => setIsQuickAuditModalOpen(false)}
        student={studentForQuickAudit}
        selectedMonth={selectedMonth}
        monthFormat={monthFormat}
        tuitionPackages={tuitionPackages}
        onSuccess={() => loadStudents(selectedMonth, undefined, true)}
      />

      {/* Status Log Modal (Nhật ký tổng biến động học sinh) */}
      <StatusLogModal
        isOpen={isStatusLogModalOpen}
        onClose={() => setIsStatusLogModalOpen(false)}
        selectedMonth={selectedMonth}
        monthFormat={monthFormat}
        schoolId={currentSchool?.id}
        onRefreshData={() => loadStudents(selectedMonth, undefined, true)}
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

      {/* Smart Excel Import Modal */}
      <SmartExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onSuccess={handleRefresh}
        subjects={subjects}
        levels={levels}
        teachers={teachers}
        schoolId={currentSchool?.id}
      />

      {/* Schedule Availability Consultation Modal (Kết luận ca trống & Mẫu tin nhắn tư vấn Zalo phụ huynh) */}
      <ScheduleAvailabilityModal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        students={students}
        teachers={teachers}
        timeSlots={timeSlots}
        subjects={subjects}
        onSelectSlotToEnroll={(day, time, tcId, subId) => {
          setStudentToEdit(null);
          setSlotPrefill({ day, time, teacherId: tcId });
          setIsStudentModalOpen(true);
        }}
      />
    </div>
  );
}
