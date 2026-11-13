"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Student, TimeSlot, LevelSurcharge, DiscountOption, Teacher, MonthFormat, TuitionPackage, Subject, StudentStatus, SchedulePreset } from "@/lib/types";
import { formatVND, formatMonthDisplay, getCurrentMonthStr, formatTimeSlotLabel, detectStudentPresetName } from "@/lib/tuition";
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
  ChevronDown,
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { MonthlySummaryModal } from "./MonthlySummaryModal";
import { AppInfoModal } from "./AppInfoModal";
import { SmartExcelImportModal } from "./SmartExcelImportModal";
import { QuickAuditModal } from "./QuickAuditModal";
import { ClassroomScheduleMatrix } from "./ClassroomScheduleMatrix";
import { ClassManagementModal } from "./ClassManagementModal";
import { ScheduleAvailabilityModal } from "./ScheduleAvailabilityModal";
import { StaffManagementModal } from "./StaffManagementModal";
import { DailyAttendanceModal } from "./DailyAttendanceModal";
import { TuitionReminderQueueModal } from "./TuitionReminderQueueModal";
import { AdminAiAssistantModal } from "./AdminAiAssistantModal";
import { CreateBranchModal } from "./CreateBranchModal";
import { exportStudentsToExcel } from "@/lib/exportExcel";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/ThemeContext";
import { AppLanguage, ClassRoom, SchoolAdmin } from "@/lib/types";

// Hiển thị ngày ISO (YYYY-MM-DD) theo định dạng Việt Nam (DD/MM/YYYY)
function formatIsoDateVN(iso?: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

// Lấy ngày đầu & ngày cuối của một tháng "YYYY-MM"
function getMonthDateBounds(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split("-").map(Number);
  if (!year || !monthNum) return { from: "", to: "" };
  const lastDay = new Date(year, monthNum, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function Dashboard() {
  const { showToast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  // Selected Month State (tháng neo để tính học phí/đối soát)
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");

  // Kỳ học phí tùy chỉnh: Từ ngày - Đến ngày (ví dụ 15/11 - 15/12)
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);
  const [periodFrom, setPeriodFrom] = useState<string>("");
  const [periodTo, setPeriodTo] = useState<string>("");
  const [periodRevenue, setPeriodRevenue] = useState<{
    total: number;
    paid_students: number;
    from: string;
    to: string;
  } | null>(null);

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
  const [adminUser, setAdminUser] = useState<SchoolAdmin | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Helper kiểm tra quyền hạn (Role-Based Access Control)
  const hasPerm = (permKey: string): boolean => {
    if (!adminUser) return false;
    // Chủ cơ sở (is_owner = 1) hoặc có quyền wildcard "*" luôn có toàn quyền
    if (adminUser.is_owner === 1 || adminUser.permissions?.includes("*")) return true;
    return Boolean(adminUser.permissions?.includes(permKey));
  };

  const canViewTuition = hasPerm("tuition.view");
  const canViewRevenue = hasPerm("revenue.reports");

  // Modals state
  const [isDailyAttendanceModalOpen, setIsDailyAttendanceModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffModalInitialTab, setStaffModalInitialTab] = useState<"teachers" | "staff" | "roles">("teachers");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [selectedStudentForMakeup, setSelectedStudentForMakeup] = useState<string | undefined>(undefined);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [slotPrefill, setSlotPrefill] = useState<{
    day?: string;
    time?: string;
    teacherId?: string;
    classId?: string;
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
  const [isTuitionQueueModalOpen, setIsTuitionQueueModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
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
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [levels, setLevels] = useState<LevelSurcharge[]>([]);
  const [discountPresets, setDiscountPresets] = useState<DiscountOption[]>([]);
  const [tuitionPackages, setTuitionPackages] = useState<TuitionPackage[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedulePresets, setSchedulePresets] = useState<SchedulePreset[]>([]);
  const [currentSchool, setCurrentSchool] = useState<{
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    active_student_count?: number;
  } | null>(null);
  const [availableSchools, setAvailableSchools] = useState<Array<{
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    active_student_count?: number;
    teacher_count?: number;
  }>>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState(false);

  // Settings
  const [baseTuition, setBaseTuition] = useState<number>(0);
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">("by_sessions");
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
  const [zaloAdminChatId, setZaloAdminChatId] = useState<string>("");
  const [zaloNotifyPayment, setZaloNotifyPayment] = useState<number>(1);
  const [zaloNotifyStudentAbsence, setZaloNotifyStudentAbsence] = useState<number>(1);
  const [zaloNotifyTeacherLeave, setZaloNotifyTeacherLeave] = useState<number>(1);
  const [zaloNotifyParentFeedback, setZaloNotifyParentFeedback] = useState<number>(1);
  const [sepayApiKey, setSepayApiKey] = useState<string>("");
  const [sepayAccountNumber, setSepayAccountNumber] = useState<string>("");
  const [sepayBankName, setSepayBankName] = useState<string>("");
  const [sepayPrefix, setSepayPrefix] = useState<string>("HP");

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState("all");
  const [selectedSlotFilter, setSelectedSlotFilter] = useState("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "studying" | "reserved" | "dropped">("all");
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");

  // Sorting state (Giống Google Sheets: Hỗ trợ Sort theo Level, Tên, Trạng thái, Học phí, GV)
  const [sortField, setSortField] = useState<"default" | "name" | "level" | "status" | "teacher" | "tuition">("level");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleHeaderSort = (field: "name" | "level" | "status" | "teacher" | "tuition") => {
    if (sortField === field) {
      if (sortOrder === "asc") setSortOrder("desc");
      else {
        // Toggle về default
        setSortField("default");
        setSortOrder("asc");
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Modern UI states: Active Row Action Menu & Quick Manage Dropdown
  const [openRowActionStudent, setOpenRowActionStudent] = useState<Student | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    right: number;
    openUpward: boolean;
  } | null>(null);
  const [isManagementMenuOpen, setIsManagementMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
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
        if (!token) {
          setIsAuthenticated(false);
          return;
        }

        const headers: Record<string, string> = {
          "Authorization": `Bearer ${token}`,
        };

        const res = await fetch("/api/admin/auth", { headers });
        const json = await res.json();
        if (json.authenticated && json.admin) {
          setIsAuthenticated(true);
          setAdminUser(json.admin);

          let initialSchool = {
            id: json.admin.school_id,
            name: json.admin.school_name,
            code: json.admin.school_code,
          };

          try {
            const bRes = await fetch("/api/admin/branches", { headers });
            const bJson = await bRes.json();
            if (bJson.success && Array.isArray(bJson.data) && bJson.data.length > 0) {
              setAvailableSchools(bJson.data);
              const lastSchoolId = localStorage.getItem("admin_last_school_id");
              if (lastSchoolId) {
                const matched = bJson.data.find((s: any) => s.id === lastSchoolId);
                if (matched) {
                  initialSchool = {
                    id: matched.id,
                    name: matched.name,
                    code: matched.code,
                  };
                }
              } else {
                const matchedCurrent = bJson.data.find((s: any) => s.id === json.admin.school_id);
                if (matchedCurrent) {
                  initialSchool = {
                    id: matchedCurrent.id,
                    name: matchedCurrent.name,
                    code: matchedCurrent.code,
                  };
                }
              }
            }
          } catch {}

          setCurrentSchool(initialSchool);
          loadSettings(initialSchool.id);
          loadTeachers(initialSchool.id);
          loadClasses(initialSchool.id);
          loadStudents(selectedMonth, initialSchool.id);
        } else {
          localStorage.removeItem("admin_token");
          setIsAuthenticated(false);
        }
      } catch {
        setIpStatus({ checked: true, allowed: true });
        setIsAuthenticated(false);
      }
    };

    initializePortal();
  }, []);

  // Tự động làm mới quyền hạn: áp dụng ngay khi Chủ cơ sở đổi phân quyền mà nhân viên không cần đăng xuất
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const refreshAdminPermissions = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) return;
      try {
        const res = await fetch("/api/admin/auth", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (cancelled) return;

        if (json.authenticated && json.admin) {
          setAdminUser(json.admin);
          const perms: string[] = Array.isArray(json.admin.permissions) ? json.admin.permissions : [];
          const isOwnerOrWildcard = json.admin.is_owner === 1 || perms.includes("*");
          if (!isOwnerOrWildcard && !perms.includes("tuition.view")) {
            setSelectedPaymentFilter("all");
          }
        } else if (res.status === 401 || res.status === 403) {
          // Tài khoản bị khóa / xóa / phiên hết hạn -> đăng xuất ngay
          localStorage.removeItem("admin_token");
          setIsAuthenticated(false);
          setAdminUser(null);
        }
      } catch {}
    };

    const interval = setInterval(refreshAdminPermissions, 30000);
    const handleFocus = () => refreshAdminPermissions();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshAdminPermissions();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated]);

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
        
        let schoolObj = {
          id: data.admin.school_id,
          name: data.admin.school_name,
          code: data.admin.school_code,
        };

        const loginHeaders = {
          "Authorization": `Bearer ${data.token}`,
        };

        try {
          const bRes = await fetch("/api/admin/branches", { headers: loginHeaders });
          const bJson = await bRes.json();
          if (bJson.success && Array.isArray(bJson.data) && bJson.data.length > 0) {
            setAvailableSchools(bJson.data);
            const lastSchoolId = localStorage.getItem("admin_last_school_id");
            if (lastSchoolId) {
              const matched = bJson.data.find((s: any) => s.id === lastSchoolId);
              if (matched) {
                schoolObj = {
                  id: matched.id,
                  name: matched.name,
                  code: matched.code,
                };
              }
            }
          }
        } catch {}

        setCurrentSchool(schoolObj);
        loadSettings(schoolObj.id);
        loadTeachers(schoolObj.id);
        loadClasses(schoolObj.id);
        loadStudents(selectedMonth, schoolObj.id);
      } else {
        showToast(data.message || "Đăng nhập thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleSwitchBranch = (school: { id: string; name: string; code: string }) => {
    setIsBranchDropdownOpen(false);
    if (currentSchool?.id === school.id) return;
    setCurrentSchool(school);
    if (typeof window !== "undefined") {
      localStorage.setItem("admin_last_school_id", school.id);
    }
    loadSettings(school.id);
    loadTeachers(school.id);
    loadClasses(school.id);
    loadStudents(selectedMonth, school.id);
    showToast(`Đã chuyển sang chi nhánh "${school.name}" (${school.code})`, "success");
  };

  const handleBranchCreated = (newBranch: { id: string; name: string; code: string; address?: string; phone?: string }) => {
    setAvailableSchools((prev) => {
      const exists = prev.some((s) => s.id === newBranch.id);
      if (exists) return prev;
      return [...prev, newBranch];
    });
    handleSwitchBranch(newBranch);
  };

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}

    localStorage.removeItem("admin_token");
    if (typeof document !== "undefined") {
      document.cookie = "admin_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0";
    }
    setIsAuthenticated(false);
    setAdminUser(null);
    setLoginUsername("");
    setLoginPassword("");
    showToast("Đã đăng xuất khỏi cổng Quản trị cơ sở", "success");
  };

  // Đổi ngôn ngữ giao diện & lưu vào cài đặt cơ sở
  const handleLanguageChange = (newL: AppLanguage) => {
    setLanguage(newL);
    const newMonthFmt =
      newL === "vi" ? "vietnamese" : newL === "zh" ? "chinese" : newL === "ja" ? "japanese" : "english";
    setMonthFormat(newMonthFmt);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        app_language: newL,
        month_format: newMonthFmt,
      }),
    });
  };

  // Helper lấy headers có kèm Authorization token
  const getAuthHeaders = (overrideSchoolId?: string): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const sid = overrideSchoolId || currentSchool?.id;
    if (sid) headers["x-school-id"] = sid;
    return headers;
  };

  // Load Settings
  const loadSettings = async (schoolId?: string) => {
    try {
      const targetSchoolId = schoolId || currentSchool?.id || "";
      const query = targetSchoolId ? `?school_id=${targetSchoolId}` : "";
      const res = await fetch(`/api/settings${query}`, {
        headers: getAuthHeaders(targetSchoolId),
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
        setSchedulePresets(json.data.schedule_presets || []);
        setReconciliationMode(json.data.reconciliation_mode || "manual");
        setZaloReminderMode(json.data.zalo_reminder_mode || "manual");
        setZaloBotToken(json.data.zalo_bot_token || "");
        setZaloBotName(json.data.zalo_bot_name || "");
        setZaloAdminChatId(json.data.zalo_admin_chat_id || "");
        setZaloNotifyPayment(json.data.zalo_notify_payment !== undefined ? json.data.zalo_notify_payment : 1);
        setZaloNotifyStudentAbsence(json.data.zalo_notify_student_absence !== undefined ? json.data.zalo_notify_student_absence : 1);
        setZaloNotifyTeacherLeave(json.data.zalo_notify_teacher_leave !== undefined ? json.data.zalo_notify_teacher_leave : 1);
        setZaloNotifyParentFeedback(json.data.zalo_notify_parent_feedback !== undefined ? json.data.zalo_notify_parent_feedback : 1);
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
        headers: getAuthHeaders(targetSchoolId),
      });
      const json = await res.json();
      if (json.success) {
        setTeachers(json.data);
      }
    } catch (err) {
      console.error("Failed to load teachers:", err);
    }
  };

  // Load Classes
  const loadClasses = async (schoolId?: string) => {
    try {
      const targetSchoolId = schoolId || currentSchool?.id || "";
      const query = targetSchoolId ? `?school_id=${targetSchoolId}` : "";
      const res = await fetch(`/api/classes${query}`, {
        headers: getAuthHeaders(targetSchoolId),
      });
      const json = await res.json();
      if (json.success) {
        setClasses(json.data);
      }
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  // Load Students for Selected Month (Hỗ trợ silent refresh giữ nguyên vị trí cuộn trang)
  const loadStudents = async (month: string, schoolId?: string, silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      const targetSchoolId = schoolId || currentSchool?.id || "";
      const schoolParam = targetSchoolId ? `&school_id=${targetSchoolId}` : "";
      const rangeActive = isRangeMode && Boolean(periodFrom) && Boolean(periodTo) && periodFrom <= periodTo;
      const rangeParam = rangeActive
        ? `&period_from=${encodeURIComponent(periodFrom)}&period_to=${encodeURIComponent(periodTo)}`
        : "";
      const res = await fetch(`/api/students?month=${month}${schoolParam}${rangeParam}`, {
        headers: getAuthHeaders(targetSchoolId),
      });
      const json = await res.json();
      if (json.success) {
        setStudents(json.data.students);
        setBaseTuition(json.data.base_tuition);
        setPeriodRevenue(json.data.period_revenue || null);
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
    if (!isAuthenticated) return;
    loadSettings();
    loadTeachers();
    loadClasses();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isRangeMode && (!periodFrom || !periodTo || periodFrom > periodTo)) return;
    if (currentSchool?.id) {
      loadStudents(selectedMonth, currentSchool.id);
    } else {
      loadStudents(selectedMonth);
    }
  }, [selectedMonth, currentSchool, isRangeMode, periodFrom, periodTo, isAuthenticated]);

  // Refresh all
  const handleRefresh = () => {
    loadSettings();
    loadTeachers();
    loadClasses();
    loadStudents(selectedMonth, currentSchool?.id);
  };

  // Confirm delete student
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeletingStudent(true);
      const res = await fetch(`/api/students/${studentToDelete.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

  // Filtered & Sorted Students (Sort thông minh theo Level, Thứ tự cài đặt, Tên, Học phí...)
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);
      const matchSubject = selectedSubjectFilter === "all" || s.subject_id === selectedSubjectFilter;
      const matchClass = selectedClassFilter === "all" || s.class_id === selectedClassFilter;
      const matchLevel = selectedLevelFilter === "all" || s.level_id === selectedLevelFilter;
      const matchSlot = selectedSlotFilter === "all" || s.time_slot_id === selectedSlotFilter;
      const matchTeacher = selectedTeacherFilter === "all" || s.teacher_id === selectedTeacherFilter;
      const matchStatus =
        selectedStatusFilter === "all" || (s.status || "studying") === selectedStatusFilter;
      const matchPayment =
        !canViewTuition ||
        selectedPaymentFilter === "all" ||
        (s.payment_status || "unpaid") === selectedPaymentFilter;

      return matchSearch && matchSubject && matchClass && matchLevel && matchSlot && matchTeacher && matchStatus && matchPayment;
    });

    if (sortField === "default") {
      return list;
    }

    // Tạo bản sao để sort
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "level") {
        // Ưu tiên 1: level_sort_order do người dùng kéo thả sắp xếp trong Cài Đặt
        const orderA = a.level_sort_order ?? 999;
        const orderB = b.level_sort_order ?? 999;
        if (orderA !== orderB) {
          cmp = orderA - orderB;
        } else {
          // Dự phòng so sánh tên level dạng text
          cmp = (a.level_name || "").localeCompare(b.level_name || "", "vi", { sensitivity: "base", numeric: true });
        }
      } else if (sortField === "name") {
        cmp = (a.name || "").localeCompare(b.name || "", "vi", { sensitivity: "base" });
      } else if (sortField === "tuition" && canViewTuition) {
        cmp = (a.current_tuition || 0) - (b.current_tuition || 0);
      } else if (sortField === "status") {
        cmp = (a.status || "studying").localeCompare(b.status || "studying");
      } else if (sortField === "teacher") {
        cmp = (a.teacher_name || "").localeCompare(b.teacher_name || "", "vi");
      }
      return sortOrder === "asc" ? cmp : -cmp;
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
    sortField,
    sortOrder,
    canViewTuition,
  ]);

  // Statistics
  const totalRevenueThisMonth = useMemo(() => {
    return filteredStudents.reduce((sum, s) => sum + (s.current_tuition || 0), 0);
  }, [filteredStudents]);

  // Kỳ học phí hiển thị: theo tháng hoặc khoảng ngày tùy chỉnh
  const isRangeValid =
    isRangeMode && Boolean(periodFrom) && Boolean(periodTo) && periodFrom <= periodTo;
  const periodDisplayLabel = isRangeValid
    ? `${formatIsoDateVN(periodFrom)} - ${formatIsoDateVN(periodTo)}`
    : formatMonthDisplay(selectedMonth, monthFormat);
  const periodShortLabel = isRangeValid
    ? `${formatIsoDateVN(periodFrom).slice(0, 5)} - ${formatIsoDateVN(periodTo).slice(0, 5)}`
    : "";

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
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & School Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="hidden sm:block text-base font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  {t.school_portal}
                </h1>
                {currentSchool && (
                  <div className="relative min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBranchDropdownOpen(!isBranchDropdownOpen);
                        setIsManagementMenuOpen(false);
                        setIsAccountMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 transition cursor-pointer shadow-2xs group max-w-[190px] sm:max-w-none"
                      title="Bấm để chuyển đổi chi nhánh hoặc tạo thêm chi nhánh mới"
                    >
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="max-w-[90px] sm:max-w-[170px] truncate">{currentSchool.name}</span>
                      <span className="hidden sm:inline font-mono text-[10px] bg-indigo-200/60 dark:bg-indigo-900 px-1.5 py-0.2 rounded-md font-bold shrink-0">
                        {currentSchool.code}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-indigo-400 group-hover:text-indigo-600 transition-transform shrink-0 ${isBranchDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Branch Switcher Dropdown Menu */}
                    {isBranchDropdownOpen && (
                      <div
                        className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95"
                        onMouseLeave={() => setIsBranchDropdownOpen(false)}
                      >
                        <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                            Mạng Lưới Chi Nhánh ({availableSchools.length || 1})
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md">
                            Dùng chung tài khoản
                          </span>
                        </div>

                        {/* List of branches */}
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-0.5">
                          {(availableSchools.length > 0 ? availableSchools : (currentSchool ? [currentSchool] : [])).map((school) => {
                            const isCurrent = currentSchool.id === school.id;
                            return (
                              <button
                                key={school.id}
                                type="button"
                                onClick={() => handleSwitchBranch(school)}
                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition cursor-pointer ${
                                  isCurrent
                                    ? "bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 font-black shadow-2xs"
                                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold"
                                }`}
                              >
                                <div className="space-y-0.5 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs truncate">{school.name}</span>
                                    <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold shrink-0">
                                      {school.code}
                                    </span>
                                  </div>
                                  {school.address && (
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {school.address}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {school.active_student_count !== undefined && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                      {school.active_student_count} HS
                                    </span>
                                  )}
                                  {isCurrent && (
                                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                                      ✓
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Create new branch button */}
                        {(adminUser?.is_owner === 1 || hasPerm("settings.manage")) && (
                          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                setIsBranchDropdownOpen(false);
                                setIsCreateBranchModalOpen(true);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer active:scale-98"
                            >
                              <Plus className="w-4 h-4" />
                              <span>+ Thêm Chi Nhánh / Cơ Sở Mới</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">
                {t.app_subtitle}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Menu Quản Lý Nghiệp Vụ Tập Trung (Consolidated Management Menu) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsManagementMenuOpen(!isManagementMenuOpen);
                  setIsAccountMenuOpen(false);
                  setIsBranchDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition shadow-2xs shrink-0 cursor-pointer"
                title={t.branch_operations}
              >
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                <span className="hidden sm:inline">{t.branch_operations}</span>
                {totalPendingMakeups > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse ml-0.5">
                    {totalPendingMakeups}
                  </span>
                )}
                <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isManagementMenuOpen ? "rotate-90" : ""}`} />
              </button>

              {isManagementMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 max-h-[calc(100vh-90px)] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setIsManagementMenuOpen(false)}
                >
                  {/* Trợ lý AI - gom từ thanh công cụ vào menu nghiệp vụ */}
                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsAiModalOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition text-left cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Trợ Lý AI</span>
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      Hỏi đáp
                    </span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Quản lý Nhân sự: Giáo viên, Nhân viên & Phân quyền */}
                  {(hasPerm("staff.manage") || hasPerm("teachers.manage")) && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setStaffModalInitialTab("teachers");
                        setIsStaffModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Tài Khoản & Phân Quyền</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        Nhân sự
                      </span>
                    </button>
                  )}

                  {/* Quản lý Lớp học & Sĩ số */}
                  {hasPerm("classes.manage") && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setIsClassModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>Quản Lý Lớp Học</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {classes.length} lớp
                      </span>
                    </button>
                  )}

                  {/* Điểm danh & Sổ bài học (Cả Admin hoặc Giáo viên đều điểm danh được) */}
                  {(hasPerm("attendance.manage") || hasPerm("makeups.manage")) && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setIsDailyAttendanceModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Điểm Danh & Sổ Bài Học</span>
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Hôm nay
                      </span>
                    </button>
                  )}

                  {hasPerm("makeups.manage") && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setSelectedStudentForMakeup(undefined);
                        setIsMakeupModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarCheck className="w-4 h-4 text-amber-600" />
                        <span>Báo Nghỉ & Quỹ Giờ Bù</span>
                      </span>
                      {totalPendingMakeups > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {totalPendingMakeups} ca chờ
                        </span>
                      )}
                    </button>
                  )}

                  {hasPerm("students.status") && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setIsStatusLogModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <History className="w-4 h-4 text-indigo-600" />
                      <span>{t.status_log}</span>
                    </button>
                  )}

                  {hasPerm("revenue.reports") && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setIsMonthlySummaryModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <span>{t.monthly_summary}</span>
                    </button>
                  )}

                  {(hasPerm("tuition.remind") || hasPerm("tuition.view")) && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setIsTuitionQueueModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition text-left cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span>Hàng Đợi Nhắc Học Phí</span>
                      </span>
                      {students.filter((s) => s.payment_status === "unpaid").length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {students.filter((s) => s.payment_status === "unpaid").length}
                        </span>
                      )}
                    </button>
                  )}

                  {hasPerm("students.excel") && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                      {/* Smart Excel Import */}
                      <button
                        onClick={() => {
                          setIsManagementMenuOpen(false);
                          setIsExcelImportModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition text-left cursor-pointer"
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
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition text-left cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-indigo-600" />
                        <span>{t.excel_export_btn}</span>
                      </button>
                    </>
                  )}

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {hasPerm("settings.manage") && (
                    <button
                      onClick={() => {
                        setIsManagementMenuOpen(false);
                        setIsSettingsOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>{t.settings}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsManagementMenuOpen(false);
                      setIsAppInfoModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>{t.app_info_feedback}</span>
                  </button>

                  {/* Cổng truy cập nhanh: gom Cổng GV & Cổng PH vào cùng một nhánh */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                  <div className="px-3 pt-1 pb-0.5 text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                    Cổng truy cập nhanh
                  </div>
                  <Link
                    href="/giao-vien"
                    onClick={() => setIsManagementMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition text-left cursor-pointer"
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>{t.teacher_portal}</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setIsManagementMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition text-left cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>{t.parent_portal}</span>
                    <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                  </Link>
                </div>
              )}
            </div>

            {/* Add Student Primary Action */}
            {hasPerm("students.create") && (
              <button
                onClick={() => {
                  setStudentToEdit(null);
                  setIsStudentModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-md shadow-indigo-600/25 transition shrink-0 cursor-pointer"
                title={t.add_student}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">{t.add_student}</span>
              </button>
            )}

            {/* Menu Tài Khoản & Tùy Chọn: gom thông tin, giao diện, ngôn ngữ, đăng xuất */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen(!isAccountMenuOpen);
                  setIsManagementMenuOpen(false);
                  setIsBranchDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 pl-1.5 pr-1.5 sm:pr-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-2xs shrink-0 cursor-pointer"
                title={`Tài khoản & tùy chọn • ${
                  adminUser ? `${adminUser.full_name || adminUser.username} (${adminUser.username})` : "Quản trị viên"
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-[11px] shadow-2xs shrink-0">
                  {(adminUser?.full_name || adminUser?.username || "Q").trim().charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-tight max-w-[120px]">
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px] truncate">
                    {adminUser?.full_name || adminUser?.username || "Quản trị viên"}
                  </span>
                  <span
                    className={`text-[9.5px] font-bold truncate ${
                      adminUser?.is_owner === 1
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-indigo-600 dark:text-indigo-400"
                    }`}
                  >
                    {adminUser?.is_owner === 1 ? "👑 Chủ Cơ Sở" : adminUser?.role_name || "Nhân viên"}
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    isAccountMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isAccountMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setIsAccountMenuOpen(false)}
                >
                  {/* Thông tin tài khoản */}
                  <div className="px-3 py-3 bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                        {(adminUser?.full_name || adminUser?.username || "Q").trim().charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {adminUser?.full_name || adminUser?.username || "Quản trị viên"}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          @{adminUser?.username || "admin"} ·{" "}
                          <span
                            className={
                              adminUser?.is_owner === 1
                                ? "text-amber-600 dark:text-amber-400 font-bold"
                                : "text-indigo-600 dark:text-indigo-400 font-bold"
                            }
                          >
                            {adminUser?.is_owner === 1 ? "Chủ Cơ Sở (Toàn quyền)" : adminUser?.role_name || "Nhân viên"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chuyển giao diện Sáng / Tối */}
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Sun className="w-3 h-3" />
                      Giao diện
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (theme === "dark") toggleTheme();
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10.5px] font-bold transition cursor-pointer ${
                          theme === "light"
                            ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        Sáng
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (theme === "light") toggleTheme();
                        }}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-[10.5px] font-bold transition cursor-pointer ${
                          theme === "dark"
                            ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        Tối
                      </button>
                    </div>
                  </div>

                  {/* Chọn ngôn ngữ giao diện */}
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="text-[9.5px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Ngôn ngữ
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { code: "vi" as AppLanguage, flag: "🇻🇳", label: "VI" },
                        { code: "en" as AppLanguage, flag: "🇬🇧", label: "EN" },
                        { code: "zh" as AppLanguage, flag: "🇨🇳", label: "ZH" },
                        { code: "ja" as AppLanguage, flag: "🇯🇵", label: "JA" },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border text-[9.5px] font-bold transition cursor-pointer ${
                            language === lang.code
                              ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                          }`}
                          title={`Chuyển sang ${lang.label}`}
                        >
                          <span className="text-sm leading-none">{lang.flag}</span>
                          <span>{lang.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Đăng xuất */}
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        handleAdminLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Top Control Bar: Month Selector & KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Period Selector Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                {t.tuition_month}
              </span>
              <button
                onClick={() => {
                  setIsRangeMode(false);
                  setPeriodFrom("");
                  setPeriodTo("");
                  setPeriodRevenue(null);
                  setSelectedMonth(getCurrentMonthStr());
                }}
                title={t.current_month}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              >
                {t.current_month}
              </button>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span
                  className={`block font-black text-slate-900 dark:text-white tracking-tight leading-tight ${
                    isRangeValid ? "text-lg sm:text-xl" : "text-2xl"
                  }`}
                >
                  {isRangeValid ? (
                    <>
                      {formatIsoDateVN(periodFrom)}
                      <span className="text-slate-400 mx-1 font-bold">→</span>
                      {formatIsoDateVN(periodTo)}
                    </>
                  ) : (
                    formatMonthDisplay(selectedMonth, monthFormat)
                  )}
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {isRangeValid
                    ? `Kỳ tùy chỉnh · Đối soát theo tháng ${formatMonthDisplay(selectedMonth, monthFormat)}`
                    : t.app_subtitle}
                </p>
                {isRangeMode && periodFrom && periodTo && periodFrom > periodTo && (
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-1">
                    Từ ngày phải trước hoặc bằng đến ngày.
                  </p>
                )}
              </div>
              {!isRangeMode && (
                <MonthPicker
                  value={selectedMonth}
                  onChange={(newM) => setSelectedMonth(newM)}
                  monthFormat={monthFormat}
                />
              )}
            </div>

            {isRangeMode && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={periodFrom}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPeriodFrom(value);
                      if (value && (!periodTo || value <= periodTo)) {
                        setSelectedMonth(value.slice(0, 7));
                      }
                    }}
                    className="w-full px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                    className="w-full px-2 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 dark:[color-scheme:dark]"
                  />
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isRangeMode) {
                    setIsRangeMode(false);
                    setPeriodFrom("");
                    setPeriodTo("");
                    setPeriodRevenue(null);
                  } else {
                    const bounds = getMonthDateBounds(selectedMonth);
                    setPeriodFrom(bounds.from);
                    setPeriodTo(bounds.to);
                    setIsRangeMode(true);
                  }
                }}
                className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Calendar className="w-3 h-3" />
                {isRangeMode ? "Chọn theo tháng" : "Tùy chọn từ ngày - đến ngày"}
              </button>
              {isRangeValid && (
                <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-semibold">
                  Tự động áp dụng
                </span>
              )}
            </div>
          </div>

          {/* KPI Stat 1: Total Revenue for Month */}
          <div className="bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white p-5 rounded-3xl shadow-md shadow-indigo-600/20 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-300" />
                {t.expected_revenue}{" "}
                {isRangeValid ? `KỲ ${periodShortLabel}` : formatMonthDisplay(selectedMonth, monthFormat)}
              </span>
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-black tracking-tight">
                {canViewRevenue ? (
                  formatVND(totalRevenueThisMonth)
                ) : (
                  <span className="text-2xl font-bold tracking-widest text-indigo-200 select-none" title="Tài khoản không có quyền xem tổng doanh thu cơ sở">
                    •••••••• đ
                  </span>
                )}
              </div>
              <span className="text-xs text-indigo-100 font-medium mt-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 opacity-80" />
                <strong>{filteredStudents.length}</strong> {t.total_active_students}
              </span>
              {isRangeValid && periodRevenue && canViewRevenue && (
                <span
                  className="text-[10.5px] text-indigo-100 font-semibold mt-1 flex items-center gap-1 flex-wrap"
                  title="Tổng tiền các kỳ thanh toán (student_payments) bao phủ tháng neo — tháng của ngày bắt đầu kỳ học phí"
                >
                  <CheckCircle2 className="w-3 h-3 opacity-90 shrink-0" />
                  Đã thu theo kỳ:
                  <strong className="text-white">{formatVND(periodRevenue.total)}</strong>
                  <span className="opacity-80">({periodRevenue.paid_students} HS)</span>
                </span>
              )}
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
              {canViewTuition ? (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-1 inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {overriddenCount} {t.overridden_students}
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-semibold mt-1 inline-flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Không có quyền xem học phí
                </span>
              )}
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
                {hasPerm("schedule.consult") && (
                  <button
                    type="button"
                    onClick={() => setIsAvailabilityModalOpen(true)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>⚡ Tư Vấn Ca Trống</span>
                  </button>
                )}
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

              {canViewTuition && (
                <>
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
                </>
              )}

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

              {/* Filter by Class */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Lớp học
                </label>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                >
                  <option value="all">-- Tất cả lớp ({classes.length}) --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.room ? `(${c.room})` : ""}
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
          <div className="overflow-x-auto overflow-y-visible pb-6">
            <table className="w-full min-w-[1240px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  {/* Select All Checkbox Column */}
                  <th className="py-3 px-3 sm:px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title={isAllFilteredSelected ? "Bỏ chọn tất cả" : "Chọn tất cả học sinh đang hiển thị"}
                    />
                  </th>
                  <th className="py-3 px-3 min-w-[240px]">
                    <button
                      type="button"
                      onClick={() => handleHeaderSort("name")}
                      className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-black transition"
                      title="Sắp xếp theo Tên học sinh"
                    >
                      <span>{t.col_student}</span>
                      {sortField === "name" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-3 min-w-[110px] whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleHeaderSort("status")}
                      className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-black transition"
                      title="Sắp xếp theo Trạng thái học sinh"
                    >
                      <span>{t.col_status}</span>
                      {sortField === "status" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  {/* Class Column */}
                  <th className="py-3 px-3 hidden lg:table-cell min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => handleHeaderSort("teacher")}
                      className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-black transition"
                      title="Sắp xếp theo Lớp học & Giáo viên phụ trách"
                    >
                      <span>Lớp học</span>
                      {sortField === "teacher" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-3 hidden xl:table-cell min-w-[120px] whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleHeaderSort("level")}
                      className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-black transition group"
                      title="Sắp xếp theo Thứ Tự Cài Đặt Level (Grade 1 trước Grade 7...)"
                    >
                      <span className={sortField === "level" ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : ""}>
                        {t.col_level_surcharge}
                      </span>
                      {sortField === "level" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-3 min-w-[210px]">{t.col_package_schedule}</th>
                  <th className="py-3 px-3 text-center hidden xl:table-cell min-w-[130px] whitespace-nowrap">{t.col_discount}</th>

                  <th className="py-3 px-3 min-w-[175px]">
                    <button
                      type="button"
                      onClick={() => handleHeaderSort("tuition")}
                      className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer font-black transition"
                      title="Sắp xếp theo Mức học phí"
                    >
                      <span title={isRangeValid ? periodDisplayLabel : undefined}>
                        {t.col_tuition} {isRangeValid ? `KỲ ${periodShortLabel}` : formatMonthDisplay(selectedMonth, monthFormat)}
                      </span>
                      {sortField === "tuition" ? (
                        sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-2.5 h-2.5 opacity-40 hover:opacity-100" />
                      )}
                    </button>
                  </th>

                  <th className="py-3 px-3 text-center hidden md:table-cell min-w-[145px] whitespace-nowrap">{t.col_reconciliation}</th>
                  <th className="py-3 px-3 text-center w-16 whitespace-nowrap">{t.col_actions}</th>
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
                    const presetLabel = detectStudentPresetName(student, schedulePresets);
                    const initialChar = student.name ? student.name.trim().charAt(0).toUpperCase() : "H";
                    const isSelected = selectedStudentIds.includes(student.id);

                    return (
                      <tr
                        key={student.id}
                        onClick={(e) => {
                          // Bấm vào hàng để mở hồ sơ chi tiết; bỏ qua khi bấm vào nút/link/checkbox có tác vụ riêng
                          if ((e.target as HTMLElement).closest("button, a, input")) return;
                          setStudentForDetail(student);
                          setIsDetailModalOpen(true);
                        }}
                        className={`transition cursor-pointer group ${
                          isSelected
                            ? "bg-indigo-50/60 dark:bg-indigo-950/40"
                            : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td className="py-2 px-3 sm:px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(student.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Student Name, Avatar & Phone */}
                        <td className="py-2 px-2 sm:px-3 overflow-hidden">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {initialChar}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title="Mã học sinh đối soát SePay">
                                  {student.student_code || `HS${student.id.slice(-4).toUpperCase()}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStudentForDetail(student);
                                    setIsDetailModalOpen(true);
                                  }}
                                  className="font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition whitespace-nowrap text-left"
                                  title="Bấm để xem hồ sơ chi tiết học sinh"
                                >
                                  {student.name}
                                </button>
                                {(() => {
                                  // Hiển thị Quỹ Giờ Học Bù dạng "Quỹ bù: 3.5h" hoặc "1h30"
                                  const avail = Number(student.available_minutes ?? 0);
                                  if (avail === 0) return null;
                                  const isNegative = avail < 0;
                                  const abs = Math.abs(avail);
                                  const h = Math.floor(abs / 60);
                                  const m = abs % 60;
                                  const label = h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m}p`;
                                  return (
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForMakeup(student.id);
                                        setIsMakeupModalOpen(true);
                                      }}
                                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-black transition shadow-2xs whitespace-nowrap ${
                                        isNegative
                                          ? "bg-rose-600 text-white animate-pulse hover:bg-rose-700"
                                          : avail >= 180
                                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                                          : "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300"
                                      }`}
                                      title={`Quỹ giờ học bù: ${label} (bấm để mở Quản lý Báo Nghỉ & Quỹ Giờ Bù)`}
                                    >
                                      ⏱️ {isNegative ? `Thiếu ${label}` : `Quỹ bù: ${label}`}
                                    </button>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {student.phone ? (
                                  <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 whitespace-nowrap">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    {student.phone}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                    ⚠️ Chưa có SĐT
                                  </span>
                                )}
                                {student.start_date && (
                                  <span className="hidden xl:flex text-[10px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap items-center gap-0.5" title="Ngày bắt đầu nhập học">
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
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {student.status === "reserved" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForStatusChange(student);
                                setIsChangeStatusModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-300 transition shadow-2xs cursor-pointer"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 transition shadow-2xs cursor-pointer"
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 transition shadow-2xs cursor-pointer"
                              title="Đang học. Bấm để bảo lưu hoặc nghỉ học"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{t.status_studying}</span>
                            </button>
                          )}
                        </td>

                        {/* Class & Assigned Teachers Note */}
                        <td className="py-2.5 px-3 hidden lg:table-cell">
                          <div className="flex flex-col items-start gap-1">
                            {student.class_name ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black uppercase rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs whitespace-nowrap">
                                <Layers className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>{student.class_name} {student.class_room ? `(${student.class_room})` : ""}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 font-medium italic">Chưa gán lớp</span>
                            )}

                            {/* Ghi chú giáo viên tương ứng đứng lớp */}
                            {student.teacher_name && student.teacher_name !== "Chưa gán GV" && (
                              <div className="flex items-center gap-1 flex-wrap">
                                {student.teacher_name.includes(" & ") ? (
                                  student.teacher_name.split(" & ").map((tName, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 whitespace-nowrap"
                                      title="Giáo viên phụ trách theo ca"
                                    >
                                      <GraduationCap className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                      <span>{tName.trim()}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[10px] font-bold rounded-md bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 whitespace-nowrap"
                                    title="Giáo viên phụ trách theo ca"
                                  >
                                    <GraduationCap className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                    <span>{student.teacher_name}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Level & Subject & Surcharge */}
                        <td className="py-2.5 px-3 hidden xl:table-cell whitespace-nowrap">
                          <div className="flex flex-col items-start gap-1">
                            {student.subject_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">
                                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                <span>{student.subject_name}</span>
                              </span>
                            )}
                            <span className="inline-block px-2 py-0.5 text-xs font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {student.level_name}
                            </span>
                            {student.level_surcharge && student.level_surcharge > 0 ? (
                              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                                +{formatVND(student.level_surcharge)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Package & Weekly Schedule */}
                        <td className="py-2.5 px-3">
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

                            {/* Tên Kiểu Lịch Học (Thứ chẵn, Thứ lẻ, Cuối tuần...) */}
                            {presetLabel && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 flex items-center gap-1 whitespace-nowrap border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
                                <Calendar className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                {presetLabel}
                              </span>
                            )}

                            {/* Số tiếng / tuần */}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1 whitespace-nowrap">
                              <Hourglass className="w-2.5 h-2.5 text-slate-500" />
                              {student.hours_per_week || 3}{t.hours_per_week_unit}
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-medium whitespace-nowrap">
                            <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="font-mono" title={student.study_time_detail}>
                              {student.study_time_detail || t.flexible_hours_slot}
                            </span>
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="py-2.5 px-3 text-center hidden xl:table-cell whitespace-nowrap">
                          {!canViewTuition ? (
                            <span className="text-xs font-medium text-slate-400">—</span>
                          ) : student.is_discount_enabled && student.discount_percent > 0 ? (
                            <div className="flex flex-col items-center">
                              <span
                                className="inline-block px-2 py-0.5 text-[11px] font-black rounded bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 whitespace-nowrap"
                                title={student.discount_reason ? `Lý do giảm: ${student.discount_reason}` : undefined}
                              >
                                -{student.discount_percent}%
                              </span>
                              {student.discount_reason && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap block mt-0.5" title={student.discount_reason}>
                                  {student.discount_reason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-slate-400">0%</span>
                          )}
                        </td>

                        {/* Monthly Tuition */}
                        <td className="py-2.5 px-3">
                          {!hasPerm("tuition.view") ? (
                            <span className="text-sm font-black text-slate-400 dark:text-slate-500 font-mono tracking-widest select-none" title="Bạn không có quyền xem thông tin học phí">
                              ••••••
                            </span>
                          ) : (
                          <div className="flex flex-col min-w-0">
                            <button
                              type="button"
                              onClick={() => {
                                setStudentForDetail(student);
                                setIsDetailModalOpen(true);
                              }}
                              className={`text-sm font-black text-left hover:underline cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                                student.is_overdue
                                  ? "text-rose-600 dark:text-rose-400"
                                  : isCustom
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-slate-900 dark:text-slate-100"
                              }`}
                              title="Bấm để xem bảng kê chi tiết các khoản cộng/trừ ra số tiền này"
                            >
                              <span>{formatVND(student.current_tuition)}</span>
                            </button>

                            {/* DÒNG DIỄN GIẢI CÔNG THỨC CỘNG TRỪ PHÍ TRỰC QUAN */}
                            {student.tuition_formula_text ? (
                              <span
                                onClick={() => {
                                  setStudentForDetail(student);
                                  setIsDetailModalOpen(true);
                                }}
                                className="text-[10px] text-slate-500 dark:text-slate-400 font-mono whitespace-nowrap hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer block mt-0.5"
                                title={`Công thức tính: ${student.tuition_formula_text}. Bấm để xem chi tiết`}
                              >
                                {student.level_surcharge && student.level_surcharge > 0 ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    + {formatVND(student.level_surcharge)} level
                                  </span>
                                ) : isCustom ? (
                                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                                    Tùy chỉnh tháng
                                  </span>
                                ) : (
                                  <span className="text-slate-400">
                                    {t.default_standard}
                                  </span>
                                )}
                              </span>
                            ) : null}

                            {/* CỘNG DỒN NỢ CŨ VÀ ĐÁNH DẤU NỢ QUÁ 1 THÁNG */}
                            {student.is_overdue && student.previous_debt_amount ? (
                              <div className="mt-1 flex flex-col items-start gap-0.5 min-w-0 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse" title={t.past_debt_label.replace("{months}", String(student.unpaid_months_count)).replace("{amount}", formatVND(student.previous_debt_amount))}>
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                  <span>{t.past_debt_label.replace("{months}", String(student.unpaid_months_count)).replace("{amount}", formatVND(student.previous_debt_amount))}</span>
                                </span>
                                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400" title={`${t.total_due}: ${formatVND(student.total_tuition_due)}`}>
                                  {t.total_due}: {formatVND(student.total_tuition_due)}
                                </span>
                              </div>
                            ) : isCustom ? (
                              <div className="mt-0.5 flex flex-col items-start gap-0.5 whitespace-nowrap">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {t.custom_override}
                                </span>
                                {student.monthly_override?.note && (
                                  <span className="text-[10px] text-slate-500 italic truncate max-w-[160px]" title={student.monthly_override.note}>
                                    &ldquo;{student.monthly_override.note}&rdquo;
                                  </span>
                                )}
                              </div>
                            ) : !student.tuition_formula_text ? (
                              <span className="text-[10px] font-medium text-slate-400">{t.default_standard}</span>
                            ) : null}
                          </div>
                          )}
                        </td>

                        {/* Đối Soát Phí: Bấm để mở bảng Đối soát nhanh (Chọn Đã đóng / Chưa đóng & Tick chọn từng tháng) */}
                        <td className="py-2.5 px-3 text-center hidden md:table-cell whitespace-nowrap">
                          {!canViewTuition ? (
                            <span className="text-xs font-medium text-slate-400" title="Bạn không có quyền xem công nợ học phí">
                              —
                            </span>
                          ) : (
                          <div className="inline-flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (!hasPerm("tuition.audit")) {
                                  showToast("Bạn không có quyền thu học phí / đối soát công nợ!", "error");
                                  return;
                                }
                                setStudentForQuickAudit(student);
                                setIsQuickAuditModalOpen(true);
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold border transition shadow-2xs hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap ${
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
                                  <span>
                                    {student.is_overdue
                                      ? `${t.overdue_badge} ${student.unpaid_months_count} ${language === "vi" ? "tháng" : "mos"}`
                                      : t.reconciliation_unpaid_badge}
                                  </span>
                                </>
                              )}
                            </button>
                            {student.payment_period_desc && (
                              <span className="text-[9px] text-slate-400 font-mono whitespace-nowrap" title={student.payment_period_desc}>
                                {student.payment_period_desc}
                              </span>
                            )}
                          </div>
                          )}
                        </td>

                        {/* Consolidated Modern Action Column */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center relative">
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
                {(hasPerm("tuition.remind") || hasPerm("tuition.view")) && (
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
                )}

                {/* Sửa học phí tháng */}
                {hasPerm("tuition.override") && (
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
                )}

                {/* Báo nghỉ / Học bù */}
                {hasPerm("makeups.manage") && (
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
                )}

                {/* Bảo lưu / Học tiếp */}
                {hasPerm("students.status") && (
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
                )}

                {/* Chỉnh sửa thông tin */}
                {hasPerm("students.edit") && (
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
                )}

                {/* Xóa học sinh */}
                {hasPerm("students.delete") && (
                  <>
                    <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
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
                  </>
                )}
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
              classes={classes}
              onSelectStudent={(st) => {
                setStudentForDetail(st);
                setIsDetailModalOpen(true);
              }}
              onAddStudentToSlot={(day, time, tcId, _subjectId, classId) => {
                setStudentToEdit(null);
                setSlotPrefill({ day, time, teacherId: tcId, classId });
                setIsStudentModalOpen(true);
              }}
              onRemoveStudentFromSlot={async ({ student, day, slotHour, startTime, endTime }) => {
                try {
                  const res = await fetch(`/api/students/${student.id}`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                      ...getAuthHeaders(),
                    },
                    body: JSON.stringify({
                      action: "remove_slot",
                      day,
                      slot_hour: slotHour,
                      start_time: startTime,
                      end_time: endTime,
                    }),
                  });
                  const json = await res.json();
                  if (json.success) {
                    showToast(json.message || "Đã gỡ học viên khỏi ca học", "success");
                    loadStudents(selectedMonth, currentSchool?.id, true);
                    return true;
                  }
                  showToast(json.message || "Không thể gỡ học viên khỏi ca học", "error");
                  return false;
                } catch {
                  showToast("Lỗi kết nối máy chủ", "error");
                  return false;
                }
              }}
              canEditSchedule={hasPerm("students.edit")}
              canViewTuition={hasPerm("tuition.view")}
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
              {hasPerm("students.status") && (
                <>
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
                </>
              )}

              {/* Xóa hàng loạt */}
              {hasPerm("students.delete") && (
                <button
                  type="button"
                  onClick={() =>
                    setBulkConfirmModal({
                      isOpen: true,
                      action: "delete",
                      title: "Xóa học sinh hàng loạt",
                      description: `CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn ${selectedStudentIds.length} học sinh và toàn bộ lịch sử học phí! Bạn có chắc chắn muốn xóa?`,
                    })
                  }
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Hàng Loạt</span>
                </button>
              )}
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
        initialZaloAdminChatId={zaloAdminChatId}
        initialZaloNotifyPayment={zaloNotifyPayment}
        initialZaloNotifyStudentAbsence={zaloNotifyStudentAbsence}
        initialZaloNotifyTeacherLeave={zaloNotifyTeacherLeave}
        initialZaloNotifyParentFeedback={zaloNotifyParentFeedback}
        initialTimeSlots={timeSlots}
        initialLevelSurcharges={levels}
        initialDiscountPresets={discountPresets}
        initialTuitionPackages={tuitionPackages}
        initialSubjects={subjects}
        initialSchedulePresets={schedulePresets}
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

      {/* Class Management Modal */}
      <ClassManagementModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        classes={classes}
        teachers={teachers}
        subjects={subjects}
        students={students}
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
        classes={classes}
        students={students}
        schedulePresets={schedulePresets}
        schoolId={currentSchool?.id}
        defaultDurationMode={durationMode}
        defaultSessions={defaultSessions}
        defaultHours={defaultHours}
        defaultStudyTime={defaultStudyTime}
        initialTeacherId={slotPrefill.teacherId}
        initialClassId={slotPrefill.classId}
        initialDay={slotPrefill.day}
        initialStartTime={slotPrefill.time}
        canManageTuition={hasPerm("tuition.view") || hasPerm("tuition.override")}
        canViewTuition={hasPerm("tuition.view")}
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
        hasPerm={hasPerm}
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
          setSelectedStudentForMakeup(st.id);
          setIsMakeupModalOpen(true);
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

      {/* Tuition Reminder Queue Modal (Hàng Đợi Nhắc Học Phí Nhanh Qua Zalo Cho Danh Sách Nợ) */}
      <TuitionReminderQueueModal
        isOpen={isTuitionQueueModalOpen}
        onClose={() => setIsTuitionQueueModalOpen(false)}
        students={students}
        initialMonth={selectedMonth}
        monthFormat={monthFormat}
        schoolId={currentSchool?.id}
        schoolName={currentSchool?.name}
        sepayBankName={sepayBankName}
        sepayAccountNumber={sepayAccountNumber}
        sepayPrefix={sepayPrefix}
        currentAdminName={adminUser?.full_name || adminUser?.username || "Lễ tân"}
        onRefreshData={() => loadStudents(selectedMonth, undefined, true)}
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
        classes={classes}
        timeSlots={timeSlots}
        subjects={subjects}
        onSelectSlotToEnroll={(day, time, tcId, subId, clsId) => {
          setStudentToEdit(null);
          setSlotPrefill({ day, time, teacherId: tcId, classId: clsId });
          setIsStudentModalOpen(true);
        }}
      />

      {/* Staff & Role-Based Permissions Management Modal (Trung Tâm Quản Lý Nhân Sự & Phân Quyền) */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        schoolId={currentSchool?.id}
        schoolName={currentSchool?.name}
        teachers={teachers}
        timeSlots={timeSlots}
        onRefresh={handleRefresh}
        initialTab={staffModalInitialTab}
        hasPerm={hasPerm}
        isOwner={adminUser?.is_owner === 1}
      />

      {/* Daily Attendance & Lesson Log Modal for Admin */}
      <DailyAttendanceModal
        isOpen={isDailyAttendanceModalOpen}
        onClose={() => setIsDailyAttendanceModalOpen(false)}
        classes={classes}
        teachers={teachers}
        students={students}
        schoolId={currentSchool?.id}
        onRefresh={handleRefresh}
      />

      {/* Admin AI Assistant Modal (Cửa Sổ Trợ Lý AI Đa Năng Cho Quản Lý) */}
      <AdminAiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        schoolName={currentSchool?.name}
        adminName={adminUser?.full_name || adminUser?.username || "Quản lý"}
      />

      {/* Create New Branch Modal (Admin tự tạo chi nhánh mới & dùng chung tài khoản) */}
      <CreateBranchModal
        isOpen={isCreateBranchModalOpen}
        onClose={() => setIsCreateBranchModalOpen(false)}
        onCreated={handleBranchCreated}
      />
    </div>
  );
}
