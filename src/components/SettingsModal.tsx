"use client";

import React, { useState, useEffect } from "react";
import {
  TimeSlot,
  LevelSurcharge,
  DiscountOption,
  MonthFormat,
  TuitionPackage,
  Subject,
  ReconciliationMode,
  ZaloReminderMode,
  CapacityMode,
  AppLanguage,
  SchedulePreset,
} from "@/lib/types";
import { formatVND, formatTimeSlotLabel, formatMonthDisplay, getCurrentMonthStr } from "@/lib/tuition";
import { useLanguage } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import {
  Clock,
  Layers,
  Percent,
  Coins,
  Plus,
  Trash2,
  Save,
  Calendar,
  Users,
  CheckCircle2,
  Check,
  GraduationCap,
  Lock,
  KeyRound,
  ShieldCheck,
  Tag,
  AlertCircle,
  HelpCircle,
  X,
  Sliders,
  Sparkles,
  Package,
  CreditCard,
  MessageSquare,
  Bot,
  Edit2,
  Power,
  RefreshCw,
  QrCode,
  Copy,
  ExternalLink,
  Globe,
  BookOpen,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialBaseTuition: number;
  initialDurationMode?: "by_hours" | "by_sessions";
  initialAppLanguage?: AppLanguage;
  initialMonthFormat?: MonthFormat;
  initialDefaultHours?: number;
  initialDefaultSessions?: number;
  initialDefaultStudyTime?: string;
  initialMaxStudents?: number;
  initialCrowdedThreshold?: number;
  initialCapacityMode?: CapacityMode;
  initialReconciliationMode?: ReconciliationMode;
  initialSepayApiKey?: string;
  initialSepayAccountNumber?: string;
  initialSepayBankName?: string;
  initialSepayPrefix?: string;
  initialDefaultMinutesPerSession?: number;
  initialZaloReminderMode?: ZaloReminderMode;
  initialZaloBotToken?: string;
  initialZaloBotName?: string;
  initialZaloOaSecretKey?: string;
  initialZaloAccessToken?: string;
  initialZaloTemplateId?: string;
  initialTimeSlots: TimeSlot[];
  initialLevelSurcharges: LevelSurcharge[];
  initialDiscountPresets: DiscountOption[];
  initialTuitionPackages?: TuitionPackage[];
  initialSubjects?: Subject[];
  initialSchedulePresets?: SchedulePreset[];
  schoolId?: string;
}

const WEEKDAYS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

const DEFAULT_SCHEDULE_PRESETS: SchedulePreset[] = [
  { id: "preset-even", name: "Thứ chẵn (2-4-6)", days: ["Thứ 2", "Thứ 4", "Thứ 6"], hours_per_session: 1.5, default_start_time: "18:00", is_default: true },
  { id: "preset-odd", name: "Thứ lẻ (3-5-7)", days: ["Thứ 3", "Thứ 5", "Thứ 7"], hours_per_session: 1.5, default_start_time: "18:00", is_default: false },
  { id: "preset-weekend", name: "Cuối tuần (T7-CN)", days: ["Thứ 7", "Chủ Nhật"], hours_per_session: 2.0, default_start_time: "09:00", is_default: false },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialBaseTuition,
  initialDurationMode = "by_hours",
  initialAppLanguage = "vi",
  initialMonthFormat = "vietnamese",
  initialDefaultHours = 3,
  initialDefaultSessions = 3,
  initialDefaultStudyTime = "18:00 - 19:00",
  initialMaxStudents = 10,
  initialCrowdedThreshold = 80,
  initialCapacityMode = "by_slot",
  initialReconciliationMode = "manual",
  initialSepayApiKey = "",
  initialSepayAccountNumber = "",
  initialSepayBankName = "",
  initialSepayPrefix = "HP",
  initialDefaultMinutesPerSession = 90,
  initialZaloReminderMode = "manual",
  initialZaloBotToken = "",
  initialZaloBotName = "",
  initialZaloOaSecretKey = "",
  initialZaloAccessToken = "",
  initialZaloTemplateId = "",
  initialTimeSlots,
  initialLevelSurcharges,
  initialDiscountPresets,
  initialTuitionPackages = [],
  initialSubjects = [],
  initialSchedulePresets,
  schoolId,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "general" | "packages" | "reconciliation" | "zalo" | "subjects" | "slots" | "levels" | "discounts" | "password"
  >("general");

  const { setLanguage: setGlobalLanguage } = useLanguage();

  // Subjects State
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState("indigo");
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  // State
  const [baseTuition, setBaseTuition] = useState<number>(initialBaseTuition);
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">("by_sessions");
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(initialAppLanguage);
  const [monthFormat, setMonthFormat] = useState<MonthFormat>(initialMonthFormat);
  const [defaultHours, setDefaultHours] = useState<number>(initialDefaultHours);
  const [defaultSessions, setDefaultSessions] = useState<number>(initialDefaultSessions);
  const [defaultStudyTime, setDefaultStudyTime] = useState<string>(initialDefaultStudyTime);
  const [maxStudents, setMaxStudents] = useState<number>(initialMaxStudents);
  const [crowdedThreshold, setCrowdedThreshold] = useState<number>(initialCrowdedThreshold);
  const [capacityMode, setCapacityMode] = useState<CapacityMode>(initialCapacityMode);

  // Reconciliation settings
  const [reconciliationMode, setReconciliationMode] = useState<ReconciliationMode>(initialReconciliationMode);
  const [sepayApiKey, setSepayApiKey] = useState<string>(initialSepayApiKey);
  const [sepayAccountNumber, setSepayAccountNumber] = useState<string>(initialSepayAccountNumber);
  const [sepayBankName, setSepayBankName] = useState<string>(initialSepayBankName);
  const [sepayPrefix, setSepayPrefix] = useState<string>(initialSepayPrefix);
  const [defaultMinutesPerSession, setDefaultMinutesPerSession] = useState<number>(initialDefaultMinutesPerSession);
  const [isSimulatingSepay, setIsSimulatingSepay] = useState(false);
  const [testTransferAmount, setTestTransferAmount] = useState<number>(1000000);
  const [testContent, setTestContent] = useState<string>("");

  // Zalo Reminder settings
  const [zaloReminderMode, setZaloReminderMode] = useState<ZaloReminderMode>(initialZaloReminderMode);
  const [zaloBotToken, setZaloBotToken] = useState<string>(initialZaloBotToken);
  const [zaloBotName, setZaloBotName] = useState<string>(initialZaloBotName);
  const [isTestingBot, setIsTestingBot] = useState(false);
  const [zaloOaSecretKey, setZaloOaSecretKey] = useState<string>(initialZaloOaSecretKey);
  const [zaloAccessToken, setZaloAccessToken] = useState<string>(initialZaloAccessToken);
  const [zaloTemplateId, setZaloTemplateId] = useState<string>(initialZaloTemplateId);

  // Tuition Packages state
  const [packages, setPackages] = useState<TuitionPackage[]>(initialTuitionPackages);
  const [newPkgName, setNewPkgName] = useState("");
  const [newPkgAmount, setNewPkgAmount] = useState<number>(1000000);
  const [newPkgOriginalAmount, setNewPkgOriginalAmount] = useState<number>(1000000);
  const [newPkgCycleUnit, setNewPkgCycleUnit] = useState<"month" | "week">("month");
  const [newPkgCycleValue, setNewPkgCycleValue] = useState<number>(1);
  const [newPkgDiscountType, setNewPkgDiscountType] = useState<"none" | "percent" | "amount">("none");
  const [newPkgDiscountValue, setNewPkgDiscountValue] = useState<number>(0);
  const [newPkgBenefits, setNewPkgBenefits] = useState<string>("");
  const [isEditingPkgId, setIsEditingPkgId] = useState<string | null>(null);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [levels, setLevels] = useState<LevelSurcharge[]>(initialLevelSurcharges);
  const [discounts, setDiscounts] = useState<DiscountOption[]>(initialDiscountPresets);
  const [isSaving, setIsSaving] = useState(false);

  // Schedule Presets State (Kiểu lịch học cơ sở)
  const [schedulePresets, setSchedulePresets] = useState<SchedulePreset[]>(
    initialSchedulePresets && initialSchedulePresets.length > 0
      ? initialSchedulePresets
      : DEFAULT_SCHEDULE_PRESETS
  );
  const [isEditingPreset, setIsEditingPreset] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetFormName, setPresetFormName] = useState("");
  const [presetFormDays, setPresetFormDays] = useState<string[]>(["Thứ 2", "Thứ 4", "Thứ 6"]);
  const [presetFormHours, setPresetFormHours] = useState<number>(1.5);
  const [presetFormStartTime, setPresetFormStartTime] = useState("18:00");

  const handleOpenAddPreset = () => {
    setEditingPresetId(null);
    setPresetFormName("");
    setPresetFormDays(["Thứ 2", "Thứ 4", "Thứ 6"]);
    setPresetFormHours(1.5);
    setPresetFormStartTime("18:00");
    setIsEditingPreset(true);
  };

  const handleOpenEditPreset = (p: SchedulePreset) => {
    setEditingPresetId(p.id);
    setPresetFormName(p.name);
    setPresetFormDays(p.days && p.days.length > 0 ? p.days : ["Thứ 2"]);
    setPresetFormHours(p.hours_per_session || 1.5);
    setPresetFormStartTime(p.default_start_time || "18:00");
    setIsEditingPreset(true);
  };

  const handleTogglePresetDay = (day: string) => {
    if (presetFormDays.includes(day)) {
      if (presetFormDays.length === 1) {
        showToast("Kiểu lịch phải có ít nhất 1 ngày học trong tuần!", "error");
        return;
      }
      setPresetFormDays(presetFormDays.filter((d) => d !== day));
    } else {
      const next = [...presetFormDays, day].sort(
        (a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b)
      );
      setPresetFormDays(next);
    }
  };

  const handleSavePresetForm = () => {
    if (!presetFormName.trim()) {
      showToast("Vui lòng nhập tên kiểu lịch học!", "error");
      return;
    }
    if (presetFormDays.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 ngày học trong tuần!", "error");
      return;
    }
    if (presetFormHours <= 0) {
      showToast("Thời lượng mỗi buổi phải lớn hơn 0!", "error");
      return;
    }

    if (editingPresetId) {
      setSchedulePresets((prev) =>
        prev.map((p) =>
          p.id === editingPresetId
            ? {
                ...p,
                name: presetFormName.trim(),
                days: presetFormDays,
                hours_per_session: presetFormHours,
                default_start_time: presetFormStartTime.trim() || "18:00",
              }
            : p
        )
      );
      showToast("Cập nhật kiểu lịch học thành công!", "success");
    } else {
      const newPreset: SchedulePreset = {
        id: `preset-${Date.now()}`,
        name: presetFormName.trim(),
        days: presetFormDays,
        hours_per_session: presetFormHours,
        default_start_time: presetFormStartTime.trim() || "18:00",
        is_default: schedulePresets.length === 0,
      };
      setSchedulePresets((prev) => [...prev, newPreset]);
      showToast("Thêm kiểu lịch học mới thành công!", "success");
    }

    setIsEditingPreset(false);
    setEditingPresetId(null);
  };

  const handleSetDefaultPreset = (id: string) => {
    setSchedulePresets((prev) =>
      prev.map((p) => ({
        ...p,
        is_default: p.id === id,
      }))
    );
    const target = schedulePresets.find((p) => p.id === id);
    if (target) {
      const calcHours = Math.round(target.days.length * target.hours_per_session * 10) / 10;
      setDefaultSessions(target.days.length);
      setDefaultHours(calcHours);
      showToast(
        `Đã chọn "${target.name}" làm kiểu lịch mặc định (${target.days.length} buổi × ${target.hours_per_session}h = ${calcHours}h/tuần)`,
        "success"
      );
    }
  };

  const handleDeletePreset = (id: string) => {
    if (schedulePresets.length <= 1) {
      showToast("Cần giữ lại ít nhất 1 kiểu lịch học!", "error");
      return;
    }
    setSchedulePresets((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      const hasDefault = filtered.some((p) => p.is_default);
      if (!hasDefault && filtered.length > 0) {
        filtered[0].is_default = true;
      }
      return filtered;
    });
    showToast("Đã xóa kiểu lịch học!", "success");
  };

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Vui lòng điền đầy đủ thông tin mật khẩu!", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Mật khẩu mới và xác nhận mật khẩu không trùng khớp!", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Mật khẩu mới phải có ít nhất 6 ký tự!", "error");
      return;
    }

    try {
      setIsChangingPassword(true);
      const token = localStorage.getItem("admin_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        showToast(data.message || "Đổi mật khẩu thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    setBaseTuition(initialBaseTuition);
    setDurationMode(initialDurationMode);
    setAppLanguage(initialAppLanguage);
    setMonthFormat(initialMonthFormat);
    setDefaultHours(initialDefaultHours);
    setDefaultSessions(initialDefaultSessions);
    setDefaultStudyTime(initialDefaultStudyTime);
    setMaxStudents(initialMaxStudents);
    setCrowdedThreshold(initialCrowdedThreshold);
    setCapacityMode(initialCapacityMode || "by_slot");
    setReconciliationMode(initialReconciliationMode || "manual");
    setSepayApiKey(initialSepayApiKey || "");
    setSepayAccountNumber(initialSepayAccountNumber || "");
    setSepayBankName(initialSepayBankName || "");
    setSepayPrefix(initialSepayPrefix || "HP");
    setDefaultMinutesPerSession(initialDefaultMinutesPerSession || 90);
    setZaloReminderMode(initialZaloReminderMode || "manual");
    setZaloBotToken(initialZaloBotToken || "");
    setZaloBotName(initialZaloBotName || "");
    setZaloOaSecretKey(initialZaloOaSecretKey || "");
    setZaloAccessToken(initialZaloAccessToken || "");
    setZaloTemplateId(initialZaloTemplateId || "");
    setTimeSlots(initialTimeSlots);
    setLevels(initialLevelSurcharges);
    setDiscounts(initialDiscountPresets);
    setPackages(initialTuitionPackages);
    if (initialSchedulePresets && initialSchedulePresets.length > 0) {
      setSchedulePresets(initialSchedulePresets);
    }
  }, [
    initialBaseTuition,
    initialDurationMode,
    initialMonthFormat,
    initialDefaultHours,
    initialDefaultSessions,
    initialDefaultStudyTime,
    initialMaxStudents,
    initialCrowdedThreshold,
    initialCapacityMode,
    initialReconciliationMode,
    initialZaloReminderMode,
    initialZaloBotToken,
    initialZaloBotName,
    initialZaloOaSecretKey,
    initialZaloAccessToken,
    initialZaloTemplateId,
    initialTimeSlots,
    initialLevelSurcharges,
    initialDiscountPresets,
    initialTuitionPackages,
    initialSchedulePresets,
    isOpen,
  ]);

  // Test Zalo Bot Connection
  const handleTestBotConnection = async () => {
    if (!zaloBotToken.trim()) {
      showToast("Vui lòng nhập Zalo Bot Token trước khi kiểm tra!", "error");
      return;
    }
    try {
      setIsTestingBot(true);
      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_connection",
          bot_token: zaloBotToken.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        if (data.data?.first_name || data.data?.username) {
          setZaloBotName(data.data.first_name || data.data.username);
        }
      } else {
        showToast(data.message || "Không thể kết nối tới Zalo Bot!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ API!", "error");
    } finally {
      setIsTestingBot(false);
    }
  };

  // Helper lấy headers có kèm Authorization token & schoolId
  const getRequestHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (schoolId) headers["x-school-id"] = schoolId;
    return headers;
  };

  // Tuition Packages helpers
  const handleCreateOrUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkgName.trim()) {
      showToast("Vui lòng nhập tên gói học phí!", "error");
      return;
    }

    try {
      const isEdit = Boolean(isEditingPkgId);
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({
          action: isEdit ? "update" : "create",
          id: isEditingPkgId,
          school_id: schoolId || undefined,
          name: newPkgName.trim(),
          amount: Number(newPkgAmount) || 0,
          original_amount: Number(newPkgOriginalAmount || newPkgAmount) || 0,
          cycle_unit: newPkgCycleUnit,
          cycle_value: Number(newPkgCycleValue) || 1,
          discount_type: newPkgDiscountType,
          discount_value: Number(newPkgDiscountValue) || 0,
          benefits: newPkgBenefits.trim(),
          is_active: 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        // Reload packages list
        const query = schoolId ? `?school_id=${schoolId}` : "";
        const pkgRes = await fetch(`/api/packages${query}`, {
          headers: getRequestHeaders(),
        });
        const pkgData = await pkgRes.json();
        if (pkgData.success) {
          setPackages(pkgData.data);
        }
        setNewPkgName("");
        setNewPkgAmount(1000000);
        setNewPkgOriginalAmount(1000000);
        setNewPkgCycleUnit("month");
        setNewPkgCycleValue(1);
        setNewPkgDiscountType("none");
        setNewPkgDiscountValue(0);
        setNewPkgBenefits("");
        setIsEditingPkgId(null);
        onSaved(); // Cập nhật ngay lên Dashboard để các modal khác và thẻ KPI nhận được gói mới
      } else {
        showToast(data.message || "Lỗi khi lưu gói học phí!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleTogglePackageActive = async (pkgId: string) => {
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ action: "toggle_active", id: pkgId, school_id: schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        setPackages((prev) =>
          prev.map((p) => (p.id === pkgId ? { ...p, is_active: p.is_active === 1 ? 0 : 1 } : p))
        );
        showToast(data.message, "success");
        onSaved();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({ action: "delete", id: pkgId, school_id: schoolId }),
      });
      const data = await res.json();
      if (data.success) {
        setPackages((prev) => prev.filter((p) => p.id !== pkgId));
        showToast(data.message, "success");
        onSaved();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  // Time slot form helpers
  const handleAddTimeSlot = () => {
    const slotCount = timeSlots.length + 1;
    const defaultFrom = "Thứ 2";
    const defaultTo = "Thứ 7";
    const defaultStart = "17:00";
    const defaultEnd = "20:00";
    const newSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      name: `Ca ${slotCount} (${defaultStart} - ${defaultEnd})`,
      from_day: defaultFrom,
      to_day: defaultTo,
      days: `${defaultFrom} – ${defaultTo}`,
      start_time: defaultStart,
      end_time: defaultEnd,
      max_students: maxStudents || 10,
      is_active: 1,
    };
    setTimeSlots([...timeSlots, newSlot]);
  };

  const handleUpdateTimeSlot = (index: number, field: keyof TimeSlot, value: any) => {
    const updated = [...timeSlots];
    const current = { ...updated[index], [field]: value };

    // Auto compute days display string from from_day & to_day
    if (field === "from_day" || field === "to_day") {
      const from = field === "from_day" ? value : current.from_day || "Thứ 2";
      const to = field === "to_day" ? value : current.to_day || "Thứ 7";
      current.days = from === to ? from : `${from} – ${to}`;
    }

    // Auto smart name if name is empty or starts with "Ca " or "Khung giờ"
    if (field === "start_time" || field === "end_time" || field === "from_day" || field === "to_day") {
      const prevName = current.name || "";
      if (!prevName || prevName.startsWith("Ca ") || prevName.includes("Khung giờ")) {
        const start = field === "start_time" ? value : current.start_time;
        const end = field === "end_time" ? value : current.end_time;
        if (start && end) {
          current.name = `Ca ${index + 1} (${start} - ${end})`;
        }
      }
    }

    updated[index] = current;
    setTimeSlots(updated);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  // Level surcharge helpers
  const handleAddLevel = () => {
    const newLvl: LevelSurcharge = {
      id: `lvl-${Date.now()}`,
      level_name: "Level mới",
      surcharge_amount: 100000,
      sort_order: levels.length + 1,
    };
    setLevels([...levels, newLvl]);
  };

  const handleUpdateLevel = (index: number, field: keyof LevelSurcharge, value: any) => {
    const updated = [...levels];
    updated[index] = { ...updated[index], [field]: value };
    setLevels(updated);
  };

  const handleRemoveLevel = (index: number) => {
    setLevels(levels.filter((_, i) => i !== index));
  };

  // Discount presets helpers
  const handleAddDiscount = () => {
    const nextVal = 10;
    const newDisc: DiscountOption = {
      id: `disc-${Date.now()}`,
      percentage: nextVal,
      label: `Giảm ${nextVal}%`,
    };
    setDiscounts([...discounts, newDisc]);
  };

  const handleUpdateDiscount = (index: number, field: "percentage" | "label", val: any) => {
    const updated = [...discounts];
    if (field === "percentage") {
      const numVal = Number(val) || 0;
      const prevLabel = updated[index].label;
      const isAutoLabel = !prevLabel || prevLabel.startsWith("Giảm ");
      updated[index] = {
        ...updated[index],
        percentage: numVal,
        label: isAutoLabel ? `Giảm ${numVal}%` : prevLabel,
      };
    } else {
      updated[index] = {
        ...updated[index],
        label: String(val),
      };
    }
    setDiscounts(updated);
  };

  const handleRemoveDiscount = (index: number) => {
    setDiscounts(discounts.filter((_, i) => i !== index));
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      showToast("Vui lòng nhập tên môn học!", "error");
      return;
    }

    try {
      setIsAddingSubject(true);
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newSubjectName.trim(),
          description: newSubjectDesc.trim(),
          color: newSubjectColor,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setSubjects([...subjects, {
          id: data.subject_id,
          name: newSubjectName.trim(),
          description: newSubjectDesc.trim(),
          color: newSubjectColor,
          is_active: 1,
        }]);
        setNewSubjectName("");
        setNewSubjectDesc("");
      } else {
        showToast(data.message || "Thêm thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsAddingSubject(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã xóa môn học!", "success");
        setSubjects(subjects.filter((s) => s.id !== id));
      } else {
        showToast(data.message || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({
          school_id: schoolId || undefined,
          base_tuition: Number(baseTuition) || 0,
          duration_mode: "by_sessions",
          app_language: appLanguage,
          month_format: monthFormat,
          default_hours_per_week: Number(defaultHours) || 3,
          default_sessions_per_week: Number(defaultSessions) || 3,
          default_study_time: defaultStudyTime.trim() || "18:00 - 19:00",
          max_students_per_slot: Number(maxStudents) || 10,
          crowded_threshold_percent: Number(crowdedThreshold) || 80,
          capacity_mode: capacityMode,
          reconciliation_mode: reconciliationMode,
          default_minutes_per_session: Number(defaultMinutesPerSession) || 90,
          sepay_api_key: sepayApiKey.trim(),
          sepay_account_number: sepayAccountNumber.trim(),
          sepay_bank_name: sepayBankName.trim(),
          sepay_prefix: sepayPrefix.trim().toUpperCase() || "HP",
          zalo_reminder_mode: zaloReminderMode,
          zalo_bot_token: zaloBotToken.trim(),
          zalo_bot_name: zaloBotName.trim(),
          zalo_oa_secret_key: zaloOaSecretKey,
          zalo_access_token: zaloAccessToken,
          zalo_template_id: zaloTemplateId,
          time_slots: timeSlots,
          level_surcharges: levels,
          discount_presets: discounts,
          schedule_presets: schedulePresets,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Lưu cấu hình hệ thống thành công!", "success");
        setGlobalLanguage(appLanguage);
        onSaved();
        onClose();
      } else {
        showToast(data.message || "Có lỗi xảy ra khi lưu!", "error");
      }
    } catch {
      showToast("Không thể kết nối đến máy chủ", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Cài Đặt Hệ Thống Cơ Sở
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cấu hình học phí cơ bản, hình thức học, khung giờ, level và kiểm soát sĩ số
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

        {/* Modern 2-Column Layout Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar Navigation Tabs */}
          <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-none">
            <button
              onClick={() => setActiveTab("general")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "general"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Thời lượng & Sĩ số</span>
              </div>
            </button>

            {/* TAB MỚI 1: GÓI HỌC PHÍ */}
            <button
              onClick={() => setActiveTab("packages")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "packages"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 shrink-0" />
                <span>Gói Học Phí</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold hidden md:inline ${activeTab === "packages" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {packages.length}
              </span>
            </button>

            {/* TAB MỚI 2: ĐỐI SOÁT HỌC PHÍ */}
            <button
              onClick={() => setActiveTab("reconciliation")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "reconciliation"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Đối Soát SePay</span>
              </div>
            </button>

            {/* TAB MỚI 3: NHẮC HỌC PHÍ QUA ZALO */}
            <button
              onClick={() => setActiveTab("zalo")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "zalo"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Nhắc Zalo Bot</span>
              </div>
            </button>

            {/* TAB MỚI 4: QUẢN LÝ BỘ MÔN / CHƯƠNG TRÌNH HỌC */}
            <button
              onClick={() => setActiveTab("subjects")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "subjects"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Môn học ({subjects.length})</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold hidden md:inline ${activeTab === "subjects" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {subjects.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("slots")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "slots"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Khung giờ ca</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold hidden md:inline ${activeTab === "slots" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {timeSlots.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("levels")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "levels"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 shrink-0" />
                <span>Phụ thu Level</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold hidden md:inline ${activeTab === "levels" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {levels.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("discounts")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "discounts"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Percent className="w-4 h-4 shrink-0" />
                <span>Mức chiết khấu</span>
              </div>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold hidden md:inline ${activeTab === "discounts" ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"}`}>
                {discounts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("password")}
              className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition shrink-0 md:w-full ${
                activeTab === "password"
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Đổi Mật Khẩu</span>
              </div>
            </button>
          </div>

          {/* Right Panel: Scrollable Tab Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Capacity & Weekly Duration Mode */}
          {activeTab === "general" && (
            <div className="space-y-6 w-full">
              {/* QUẢN LÝ THỜI LƯỢNG & KIỂU LỊCH HỌC CƠ SỞ (MA TRẬN TÍNH TOÁN TỰ ĐỘNG) */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        Chế Độ Quản Lý Thời Lượng & Kiểu Lịch Học Cơ Sở
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                        {schedulePresets.length} kiểu lịch
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Cố định các ca học theo lịch chuẩn (tên kiểu, các ngày trong tuần và số tiếng/buổi) để hệ thống tự động tính ma trận thời lượng tuần.
                    </p>
                  </div>

                  {!isEditingPreset && (
                    <button
                      type="button"
                      onClick={handleOpenAddPreset}
                      className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm kiểu lịch mới</span>
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {/* FORM THÊM / SỬA KIỂU LỊCH */}
                  {isEditingPreset && (
                    <div className="p-4 rounded-2xl border-2 border-indigo-500/80 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          {editingPresetId ? "Chỉnh sửa kiểu lịch học" : "Tạo kiểu lịch học mới"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPreset(false);
                            setEditingPresetId(null);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white dark:hover:bg-slate-800 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Tên kiểu lịch */}
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Tên kiểu lịch:
                          </label>
                          <input
                            type="text"
                            value={presetFormName}
                            onChange={(e) => setPresetFormName(e.target.value)}
                            placeholder="Ví dụ: Thứ chẵn (2-4-6), Thứ lẻ (3-5-7), Lớp cuối tuần..."
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>

                        {/* Giờ vào lớp mặc định */}
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Giờ vào lớp gợi ý:
                          </label>
                          <input
                            type="text"
                            value={presetFormStartTime}
                            onChange={(e) => setPresetFormStartTime(e.target.value)}
                            placeholder="18:00"
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                          />
                        </div>
                      </div>

                      {/* Chọn các ngày trong tuần */}
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                          Chọn các ngày học trong tuần ({presetFormDays.length} ngày đã chọn):
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {WEEKDAYS.map((day) => {
                            const isChecked = presetFormDays.includes(day);
                            return (
                              <button
                                type="button"
                                key={day}
                                onClick={() => handleTogglePresetDay(day)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                  isChecked
                                    ? "bg-indigo-600 text-white shadow-xs"
                                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3" />}
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Thời lượng 1 buổi & Ma trận tính toán xem trước */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                            Thời lượng 1 buổi học:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0.5"
                              max="8"
                              step="0.5"
                              value={presetFormHours}
                              onChange={(e) => setPresetFormHours(Number(e.target.value) || 1)}
                              className="w-24 px-3 py-2 text-xs font-black text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-xs font-bold text-slate-500">tiếng / buổi</span>
                            <div className="flex gap-1">
                              {[1, 1.5, 2].map((quickH) => (
                                <button
                                  type="button"
                                  key={quickH}
                                  onClick={() => setPresetFormHours(quickH)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                    presetFormHours === quickH
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                                  }`}
                                >
                                  {quickH}h
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Card Ma trận tính toán xem trước */}
                        <div className="p-2.5 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                              Ma trận tính toán tự động
                            </span>
                            <div className="text-xs font-black text-indigo-950 dark:text-indigo-100 mt-0.5">
                              {presetFormDays.length} buổi × {presetFormHours}h ={" "}
                              <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                                {Math.round(presetFormDays.length * presetFormHours * 10) / 10} tiếng/tuần
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-2xs">
                            {Math.round(presetFormDays.length * presetFormHours * 60)} phút/tuần
                          </span>
                        </div>
                      </div>

                      {/* Nút hành động của form */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/60">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPreset(false);
                            setEditingPresetId(null);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePresetForm}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{editingPresetId ? "Lưu thay đổi kiểu" : "Tạo kiểu này"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DANH SÁCH THẺ CÁC KIỂU LỊCH HỌC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {schedulePresets.map((preset) => {
                      const totalHours = Math.round((preset.days?.length || 0) * (preset.hours_per_session || 1.5) * 10) / 10;
                      const totalMinutes = Math.round(totalHours * 60);

                      return (
                        <div
                          key={preset.id}
                          className={`p-3.5 rounded-2xl border transition relative flex flex-col justify-between ${
                            preset.is_default
                              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500/40"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300"
                          }`}
                        >
                          <div>
                            {/* Header thẻ: Tên + Badge mặc định */}
                            <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                  {preset.name}
                                </span>
                              </div>
                              {preset.is_default ? (
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shrink-0">
                                  Mặc định
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSetDefaultPreset(preset.id)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 hover:underline shrink-0"
                                >
                                  Đặt mặc định
                                </button>
                              )}
                            </div>

                            {/* Badges các ngày trong tuần */}
                            <div className="flex flex-wrap gap-1 my-2">
                              {(preset.days || []).map((d) => (
                                <span
                                  key={d}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>

                            {/* Ma trận tính toán: số buổi × thời lượng = tổng tiếng */}
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] space-y-0.5">
                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>Thời lượng:</span>
                                <strong className="text-slate-900 dark:text-white font-mono">
                                  {preset.hours_per_session}h / buổi
                                </strong>
                              </div>
                              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                <span>Ma trận tuần:</span>
                                <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-black">
                                  {preset.days?.length || 0} buổi × {preset.hours_per_session}h = {totalHours}h
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Footer: Thao tác sửa / xóa */}
                          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-[10px] font-mono text-slate-400">
                              {totalMinutes} phút/tuần
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPreset(preset)}
                                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Chỉnh sửa kiểu lịch"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {schedulePresets.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePreset(preset.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                  title="Xóa kiểu lịch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Class Capacity & Crowded Threshold Card */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-600" />
                      Cấu Hình Sĩ Số Ca & Cảnh Báo Lớp Đông Khi Học Bù
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lựa chọn cơ chế kiểm soát giới hạn học sinh để bảo vệ chất lượng giảng dạy
                    </p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                    Bảo vệ lớp học
                  </span>
                </div>

                {/* 2 LỰA CHỌN CƠ CHẾ: THEO LỚP/GIỜ MỞ CỬA vs THEO GIÁO VIÊN */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Cơ chế tính sĩ số & kiểm soát hết suất:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: Theo Lớp / Giờ Mở Cửa */}
                    <div
                      onClick={() => setCapacityMode("by_slot")}
                      className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        capacityMode === "by_slot"
                          ? "border-amber-500 bg-white dark:bg-slate-900 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            1. Theo Lớp / Giờ Mở Cửa
                          </span>
                        </div>
                        {capacityMode === "by_slot" && (
                          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Sĩ số tính chung theo khung giờ mở cửa của cơ sở. Khi ca đạt giới hạn tối đa sẽ tự động khóa và hiển thị &quot;Hết suất&quot;.
                      </p>
                    </div>

                    {/* Option 2: Theo Giáo Viên Đứng Lớp */}
                    <div
                      onClick={() => setCapacityMode("by_teacher")}
                      className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        capacityMode === "by_teacher"
                          ? "border-indigo-600 bg-white dark:bg-slate-900 shadow-xs"
                          : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            2. Theo Giáo Viên Đứng Lớp
                          </span>
                        </div>
                        {capacityMode === "by_teacher" && (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Sĩ số tính riêng theo từng giáo viên (cấu hình trong mục Giáo viên: GV nhận tối đa bao nhiêu học sinh, làm ca nào, tuần làm mấy buổi...).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      {capacityMode === "by_teacher"
                        ? "Sĩ số chuẩn tối đa mặc định của Giáo viên"
                        : "Sĩ số tối đa trong một ca / lớp"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(Number(e.target.value) || 10)}
                        className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">
                        {capacityMode === "by_teacher" ? "học sinh / GV" : "học sinh / ca"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Ngưỡng cảnh báo Lớp Đông (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="99"
                        value={crowdedThreshold}
                        onChange={(e) => setCrowdedThreshold(Number(e.target.value) || 80)}
                        className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>

                {/* ⭐ VÍ GIỜ HỌC: Thời lượng 1 buổi học mặc định */}
                <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                  <label className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                    ⏱️ Ví Giờ Học — Thời lượng 1 buổi mặc định
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Số phút được cấp vào ví khi học sinh đóng tiền 1 buổi học. Giờ trừ theo phút học thật (điểm danh).
                  </p>
                  <div className="relative max-w-xs">
                    <input
                      type="number"
                      min="15"
                      max="480"
                      step="5"
                      value={defaultMinutesPerSession}
                      onChange={(e) => setDefaultMinutesPerSession(Number(e.target.value) || 90)}
                      className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/40 dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-indigo-400 font-bold">phút / buổi</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[45, 60, 90, 120].map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setDefaultMinutesPerSession(min)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                          defaultMinutesPerSession === min
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400"
                        }`}
                      >
                        {min} phút
                      </button>
                    ))}
                    <span className="text-[10px] text-slate-400 ml-1">
                      = {(defaultMinutesPerSession / 60).toFixed(defaultMinutesPerSession % 60 === 0 ? 0 : 1)} tiếng/buổi
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

              {/* TAB 1.1: GÓI HỌC PHÍ (TUITION PACKAGES) */}
              {activeTab === "packages" && (
                <div className="space-y-6 w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-indigo-600" />
                        <span>Danh Mục Gói Học Phí Cơ Sở</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tạo gói theo tháng (1 tháng, 3 tháng...) hoặc theo tuần (24 tuần...) để gán cho học sinh
                      </p>
                    </div>
                  </div>

                  {/* Form Tạo / Sửa gói */}
                  <form
                    onSubmit={handleCreateOrUpdatePackage}
                    className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                        {isEditingPkgId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isEditingPkgId ? "Chỉnh Sửa Gói Học Phí" : "Thêm Gói Học Phí Mới"}
                      </span>
                      {isEditingPkgId && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPkgId(null);
                            setNewPkgName("");
                            setNewPkgAmount(1000000);
                            setNewPkgCycleUnit("month");
                            setNewPkgCycleValue(1);
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          Hủy sửa
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Tên gói học phí *
                        </label>
                        <input
                          type="text"
                          required
                          value={newPkgName}
                          onChange={(e) => setNewPkgName(e.target.value)}
                          placeholder="VD: Theo quý - 3 tháng, Khóa 6 tháng..."
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Đơn vị chu kỳ *
                        </label>
                        <select
                          value={newPkgCycleUnit}
                          onChange={(e) => setNewPkgCycleUnit(e.target.value as "month" | "week")}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="month">Tháng (Khóa theo tháng/quý)</option>
                          <option value="week">Tuần (Khóa theo tuần)</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Số {newPkgCycleUnit === "month" ? "Tháng" : "Tuần"} *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          required
                          value={newPkgCycleValue}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 1;
                            setNewPkgCycleValue(val);
                            // Auto estimate original amount based on base tuition
                            if (baseTuition > 0 && newPkgCycleUnit === "month") {
                              const autoOrig = baseTuition * val;
                              setNewPkgOriginalAmount(autoOrig);
                              if (newPkgDiscountType === "percent" && newPkgDiscountValue > 0) {
                                setNewPkgAmount(Math.round(autoOrig * (1 - newPkgDiscountValue / 100)));
                              } else if (newPkgDiscountType === "amount" && newPkgDiscountValue > 0) {
                                setNewPkgAmount(Math.max(0, autoOrig - newPkgDiscountValue));
                              } else {
                                setNewPkgAmount(autoOrig);
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Giá gốc ban đầu */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Giá gốc ban đầu (VNĐ)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50000"
                            value={newPkgOriginalAmount}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setNewPkgOriginalAmount(val);
                              if (newPkgDiscountType === "percent" && newPkgDiscountValue > 0) {
                                setNewPkgAmount(Math.round(val * (1 - newPkgDiscountValue / 100)));
                              } else if (newPkgDiscountType === "amount" && newPkgDiscountValue > 0) {
                                setNewPkgAmount(Math.max(0, val - newPkgDiscountValue));
                              } else if (newPkgDiscountType === "none") {
                                setNewPkgAmount(val);
                              }
                            }}
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">
                            {formatVND(newPkgOriginalAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Loại ưu đãi */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Ưu đãi / Giảm giá
                        </label>
                        <select
                          value={newPkgDiscountType}
                          onChange={(e) => {
                            const dt = e.target.value as "none" | "percent" | "amount";
                            setNewPkgDiscountType(dt);
                            if (dt === "none") {
                              setNewPkgDiscountValue(0);
                              setNewPkgAmount(newPkgOriginalAmount);
                            } else if (dt === "percent") {
                              const disc = 10;
                              setNewPkgDiscountValue(disc);
                              setNewPkgAmount(Math.round(newPkgOriginalAmount * (1 - disc / 100)));
                            } else if (dt === "amount") {
                              const disc = 200000;
                              setNewPkgDiscountValue(disc);
                              setNewPkgAmount(Math.max(0, newPkgOriginalAmount - disc));
                            }
                          }}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="none">Không giảm</option>
                          <option value="percent">Giảm theo %</option>
                          <option value="amount">Giảm tiền mặt (VNĐ)</option>
                        </select>
                      </div>

                      {/* Giá trị giảm */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Mức giảm {newPkgDiscountType === "percent" ? "(%)" : "(VNĐ)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          disabled={newPkgDiscountType === "none"}
                          value={newPkgDiscountValue}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setNewPkgDiscountValue(val);
                            if (newPkgDiscountType === "percent") {
                              setNewPkgAmount(Math.round(newPkgOriginalAmount * (1 - val / 100)));
                            } else if (newPkgDiscountType === "amount") {
                              setNewPkgAmount(Math.max(0, newPkgOriginalAmount - val));
                            }
                          }}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                        />
                      </div>

                      {/* Số tiền thực thu (Sau ưu đãi) */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block mb-1 flex items-center justify-between">
                          <span>Số tiền thực thu (Sau ưu đãi) *</span>
                          {newPkgOriginalAmount > newPkgAmount && (
                            <span className="text-rose-500 font-bold">
                              Tiết kiệm: {formatVND(newPkgOriginalAmount - newPkgAmount)}
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="50000"
                            required
                            value={newPkgAmount}
                            onChange={(e) => setNewPkgAmount(Number(e.target.value) || 0)}
                            className="w-full px-3 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">
                            {formatVND(newPkgAmount)}
                          </span>
                        </div>
                      </div>

                      {/* Quyền lợi / Ưu đãi tặng kèm */}
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                          Ưu đãi & Quà tặng kèm (Tùy chọn)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newPkgBenefits}
                            onChange={(e) => setNewPkgBenefits(e.target.value)}
                            placeholder="VD: Tặng 1 buổi học bù + Bộ giáo trình chuyên sâu"
                            className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/25 transition shrink-0"
                          >
                            {isEditingPkgId ? "Cập Nhật" : "Thêm Gói"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>

                  {/* Danh sách các gói hiện có */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                          pkg.is_active === 1
                            ? "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs"
                            : "bg-slate-100/60 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 opacity-60"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug">
                              {pkg.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                                pkg.is_active === 1
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                            >
                              {pkg.is_active === 1 ? "Hoạt động" : "Tạm tắt"}
                            </span>
                          </div>

                          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                              {formatVND(pkg.amount)}
                            </span>
                            {pkg.original_amount && pkg.original_amount > pkg.amount && (
                              <span className="text-xs font-semibold text-slate-400 line-through">
                                {formatVND(pkg.original_amount)}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-slate-500 font-medium">
                              Chu kỳ: <strong>{pkg.cycle_value} {pkg.cycle_unit === "month" ? "Tháng" : "Tuần"}</strong>
                            </span>
                            {pkg.discount_type === "percent" && pkg.discount_value && pkg.discount_value > 0 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                -{pkg.discount_value}%
                              </span>
                            ) : pkg.discount_type === "amount" && pkg.discount_value && pkg.discount_value > 0 ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                -{formatVND(pkg.discount_value)}
                              </span>
                            ) : null}
                          </div>

                          {pkg.benefits && (
                            <div className="mt-2 p-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300">
                              <span className="font-bold block text-[10px] uppercase text-indigo-500">Ưu đãi tặng kèm:</span>
                              <p className="mt-0.5 leading-relaxed">{pkg.benefits}</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => handleTogglePackageActive(pkg.id)}
                            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{pkg.is_active === 1 ? "Tắt gói" : "Bật lại"}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingPkgId(pkg.id);
                                setNewPkgName(pkg.name);
                                setNewPkgAmount(pkg.amount);
                                setNewPkgOriginalAmount(pkg.original_amount || pkg.amount);
                                setNewPkgCycleUnit(pkg.cycle_unit);
                                setNewPkgCycleValue(pkg.cycle_value);
                                setNewPkgDiscountType(pkg.discount_type || "none");
                                setNewPkgDiscountValue(pkg.discount_value || 0);
                                setNewPkgBenefits(pkg.benefits || "");
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Sửa thông tin gói"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePackage(pkg.id)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title="Xóa gói này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {packages.length === 0 && (
                      <div className="col-span-full py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        Chưa có gói học phí nào. Vui lòng thêm gói học phí ở form trên.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1.2: CÀI ĐẶT ĐỐI SOÁT (RECONCILIATION SETTINGS) */}
              {activeTab === "reconciliation" && (
                <div className="space-y-6 w-full">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                      <span>Cài Đặt Chế Độ Đối Soát Học Phí</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Chọn phương thức đối soát học phí đã đóng hoặc cần đóng tiền
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: Thủ công */}
                    <div
                      onClick={() => setReconciliationMode("manual")}
                      className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        reconciliationMode === "manual"
                          ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs"
                          : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                            Chế Độ 1
                          </span>
                          {reconciliationMode === "manual" && (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Đối Soát Thủ Công (Manual)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Admin tự bấm tích chọn học sinh đã đóng theo gói 1 tháng hoặc gói khóa nhiều tháng. Hệ thống tự động duy trì trạng thái &quot;Đã đóng&quot; suốt thời hạn gói và chỉ chuyển sang &quot;Cần đóng tiền&quot; khi hết chu kỳ.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs font-bold text-indigo-600">
                        <span>{reconciliationMode === "manual" ? "Đang được chọn" : "Bấm để chọn"}</span>
                      </div>
                    </div>

                    {/* Option 2: Tự động SePay Webhook */}
                    <div
                      onClick={() => setReconciliationMode("auto")}
                      className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        reconciliationMode === "auto"
                          ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-xs"
                          : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">
                            Chế Độ 2 (Tự Động)
                          </span>
                          {reconciliationMode === "auto" && (
                            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>Đối Soát Tự Động SePay</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                            Khuyên dùng
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Tự động nhận thông báo biến động số dư ngân hàng (Vietcombank, MB, ACB, Techcombank...) qua <strong>SePay Webhook</strong>. Khớp mã học sinh hoặc SĐT để tự gạch nợ và đổi trạng thái Đã đóng ngay lập tức.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs font-bold text-emerald-600">
                        <span>{reconciliationMode === "auto" ? "Đang được chọn" : "Bấm để chọn"}</span>
                      </div>
                    </div>
                  </div>

                  {/* CẤU HÌNH CHI TIẾT SEPAY */}
                  <div className="p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                          <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            Cấu Hình Tích Hợp SePay Webhook
                          </h4>
                          <p className="text-xs text-slate-500">
                            Xem hướng dẫn tạo Webhook tại{" "}
                            <a
                              href="https://docs.sepay.vn/tich-hop-webhooks.html"
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 font-bold underline inline-flex items-center gap-0.5"
                            >
                              docs.sepay.vn <ExternalLink className="w-3 h-3" />
                            </a>
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-bold">
                        docs.sepay.vn
                      </span>
                    </div>

                    {/* Webhook URL Display */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Webhook URL cần dán vào SePay Platform:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
                            const fullUrl = `${origin}/api/sepay/webhook`;
                            navigator.clipboard.writeText(fullUrl);
                            showToast("Đã copy Webhook URL vào bộ nhớ tạm!", "success");
                          }}
                          className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy URL
                        </button>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-xs text-indigo-600 dark:text-indigo-400 break-all select-all">
                        {typeof window !== "undefined" ? `${window.location.origin}/api/sepay/webhook` : "https://your-domain.com/api/sepay/webhook"}
                      </div>
                    </div>

                    {/* Inputs Form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          API Key SePay (Authentication Header)
                        </label>
                        <input
                          type="password"
                          value={sepayApiKey}
                          onChange={(e) => setSepayApiKey(e.target.value)}
                          placeholder="Ví dụ: SEPAY_API_KEY_abc123"
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Nhập nếu bạn thiết lập kiểu xác thực API Key trên SePay
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Cú Pháp / Tiền Tố Nhận Diện (Prefix)
                        </label>
                        <input
                          type="text"
                          value={sepayPrefix}
                          onChange={(e) => setSepayPrefix(e.target.value.toUpperCase())}
                          placeholder="Mặc định: HP"
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Cú pháp khuyên dùng khi phụ huynh chuyển: <strong>{sepayPrefix || "HP"} [MãHS hoặc SĐT]</strong>
                        </span>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Số Tài Khoản Ngân Hàng Nhận Tiền
                        </label>
                        <input
                          type="text"
                          value={sepayAccountNumber}
                          onChange={(e) => setSepayAccountNumber(e.target.value)}
                          placeholder="Ví dụ: 09012345678"
                          className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                          Tên Ngân Hàng
                        </label>
                        <input
                          type="text"
                          value={sepayBankName}
                          onChange={(e) => setSepayBankName(e.target.value)}
                          placeholder="Ví dụ: Vietcombank, MBBank, ACB, ..."
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Test Webhook Tool */}
                    <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Công cụ kiểm thử đối soát:</span> Bấm giả lập một biến động số dư SePay gửi đến Webhook để xác minh quy trình tự động.
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsSimulatingSepay(true);
                            const res = await fetch("/api/sepay/webhook", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": sepayApiKey ? `Apikey ${sepayApiKey}` : "",
                              },
                              body: JSON.stringify({
                                id: Math.floor(100000 + Math.random() * 900000),
                                gateway: sepayBankName || "Vietcombank",
                                transactionDate: new Date().toISOString().slice(0, 19).replace("T", " "),
                                accountNumber: sepayAccountNumber || "1017588888",
                                code: "TESTSEPAY",
                                content: `SEVN HP HS ${new Date().toISOString().slice(5, 7)} test chuyen hoc phi`,
                                transferType: "in",
                                transferAmount: 1000000,
                                referenceCode: `REF${Date.now().toString().slice(-6)}`,
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              showToast(`Kiểm thử Webhook SePay thành công: ${data.message}`, "success");
                            } else {
                              showToast(data.message || "Kiểm thử Webhook thất bại", "error");
                            }
                          } catch {
                            showToast("Lỗi khi gửi yêu cầu kiểm thử webhook!", "error");
                          } finally {
                            setIsSimulatingSepay(false);
                          }
                        }}
                        disabled={isSimulatingSepay}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSimulatingSepay ? "animate-spin" : ""}`} />
                        <span>{isSimulatingSepay ? "Đang gửi..." : "Thử Nghiệm Gửi Webhook"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 1.3: NHẮC HỌC PHÍ QUA ZALO */}
              {activeTab === "zalo" && (
                <div className="space-y-6 w-full">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <span>Cấu Hình Phương Thức Nhắc Học Phí Qua Zalo</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Lựa chọn hình thức gửi thông báo học phí đến phụ huynh và học sinh
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option B: Nhắc học phí thủ công (Active) */}
                    <div
                      onClick={() => setZaloReminderMode("manual")}
                      className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        zaloReminderMode === "manual"
                          ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs"
                          : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                            Phương Thức B (Khuyên dùng)
                          </span>
                          {zaloReminderMode === "manual" && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          Nhắc Học Phí Thủ Công (Manual Assist)
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Khi bấm vào học sinh, hệ thống mở cửa sổ mẫu tin nhắn nhắc học phí chuẩn soạn sẵn. Có sẵn <strong>Nút Copy</strong> và <strong>Nút Mở Zalo</strong> chuyển thẳng vào phòng chat với phụ huynh.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs font-bold text-blue-600">
                        <span>Đang kích hoạt</span>
                      </div>
                    </div>

                    {/* Option A: Tích hợp Bot Zalo Platform (Hoạt động) */}
                    <div
                      onClick={() => setZaloReminderMode("bot")}
                      className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        zaloReminderMode === "bot"
                          ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs"
                          : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-blue-600">
                            Phương Thức A (Zalo Bot API)
                          </span>
                          {zaloReminderMode === "bot" && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-blue-600" />
                          <span>Tích Hợp Zalo Bot Tự Động</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          Sử dụng nền tảng <strong>Zalo Bot Platform</strong> (bot-api.zapps.me). Tự động gửi tin nhắn nhắc nợ học phí vào Zalo của phụ huynh khi đến hạn qua lệnh sendMessage.
                        </p>

                        {/* Form cấu hình Zalo Bot */}
                        <div className="space-y-3 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-left">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Zalo Bot Token *
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="Nhập Bot Token từ Zalo Bot Creator..."
                                value={zaloBotToken}
                                onChange={(e) => setZaloBotToken(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                disabled={isTestingBot}
                                onClick={handleTestBotConnection}
                                className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition disabled:opacity-50"
                              >
                                {isTestingBot ? "Đang thử..." : "Test Bot"}
                              </button>
                            </div>
                          </div>

                          {zaloBotName && (
                            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã kết nối: {zaloBotName}</span>
                            </div>
                          )}

                          {/* Hướng dẫn tạo bot theo chuẩn tài liệu zaloplatforms */}
                          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                            <span className="font-bold text-slate-700 dark:text-slate-200 block text-[10px] uppercase">
                              Hướng dẫn lấy Bot Token (1 phút):
                            </span>
                            <p>1. Mở app Zalo, tìm kiếm <strong>&quot;Zalo Bot Manager&quot;</strong>.</p>
                            <p>2. Chọn <strong>&quot;Tạo bot&quot;</strong>, đặt tên bot có tiền tố <em>Bot</em> (VD: <em>BotTrungTamHongAn</em>).</p>
                            <p>3. Copy mã <strong>Bot Token</strong> nhận được dán vào ô trên và bấm <strong>&quot;Test Bot&quot;</strong>.</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 flex items-center gap-1.5 text-xs font-bold text-blue-600">
                        <span>Hỗ trợ gửi tin nhắn tự động 1-click qua Bot</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* TAB MỚI: QUẢN LÝ BỘ MÔN / CHƯƠNG TRÌNH HỌC */}
              {activeTab === "subjects" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <span>Danh Mục Bộ Môn / Chương Trình Học</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tự do thiết lập các môn học phù hợp với ngành đào tạo của trung tâm (Âm nhạc, Ngoại ngữ, Dạy thêm, Năng khiếu...)
                      </p>
                    </div>
                  </div>

                  {/* Form thêm môn học mới */}
                  <form onSubmit={handleAddSubject} className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
                      Thêm Môn Học Mới:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Tên môn (VD: Piano, IELTS, Toán 10, Vẽ...)"
                          value={newSubjectName}
                          onChange={(e) => setNewSubjectName(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <select
                          value={newSubjectColor}
                          onChange={(e) => setNewSubjectColor(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                        >
                          <option value="indigo">Màu Xanh Indigo</option>
                          <option value="purple">Màu Tím Purple</option>
                          <option value="emerald">Màu Xanh Lá Emerald</option>
                          <option value="amber">Màu Cam Amber</option>
                          <option value="rose">Màu Đỏ Rose</option>
                          <option value="sky">Màu Xanh Biển Sky</option>
                        </select>
                      </div>
                      <div>
                        <button
                          type="submit"
                          disabled={isAddingSubject}
                          className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isAddingSubject ? "Đang thêm..." : "Thêm Môn"}</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Danh sách các môn hiện có */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {subjects.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                            sub.color === "purple" ? "bg-purple-600 shadow-purple-600/30" :
                            sub.color === "emerald" ? "bg-emerald-600 shadow-emerald-600/30" :
                            sub.color === "amber" ? "bg-amber-600 shadow-amber-600/30" :
                            sub.color === "rose" ? "bg-rose-600 shadow-rose-600/30" :
                            sub.color === "sky" ? "bg-sky-600 shadow-sky-600/30" :
                            "bg-indigo-600 shadow-indigo-600/30"
                          } shadow-sm`}>
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                              {sub.name}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {sub.description || "Môn học cơ sở"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Xóa môn học này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {subjects.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>Chưa có môn học nào. Hãy thêm các môn đào tạo ở form trên!</p>
                    </div>
                  )}
                </div>
              )}
          {activeTab === "slots" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Danh Sách Khung Giờ Mở Cửa Của Cơ Sở
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chọn nhanh từ Thứ mấy tới Thứ mấy bằng menu chọn gọn gàng
                  </p>
                </div>
                <button
                  onClick={handleAddTimeSlot}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Thêm khung giờ
                </button>
              </div>

              <div className="space-y-3">
                {timeSlots.map((slot, index) => (
                  <div
                    key={slot.id || index}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center gap-3 shadow-xs hover:border-slate-300 transition"
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                      {/* Name */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Tên khung giờ
                        </label>
                        <input
                          type="text"
                          value={slot.name}
                          onChange={(e) => handleUpdateTimeSlot(index, "name", e.target.value)}
                          placeholder="Ca Sáng T7"
                          className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Dropdown: Từ thứ mấy */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Từ thứ
                        </label>
                        <select
                          value={slot.from_day || "Thứ 2"}
                          onChange={(e) => handleUpdateTimeSlot(index, "from_day", e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dropdown: Tới thứ mấy */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Đến thứ
                        </label>
                        <select
                          value={slot.to_day || "Thứ 7"}
                          onChange={(e) => handleUpdateTimeSlot(index, "to_day", e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Giờ mở */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Mở cửa
                        </label>
                        <input
                          type="time"
                          value={slot.start_time}
                          onChange={(e) => handleUpdateTimeSlot(index, "start_time", e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                        />
                      </div>

                      {/* Giờ đóng */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Đóng cửa
                        </label>
                        <input
                          type="time"
                          value={slot.end_time}
                          onChange={(e) => handleUpdateTimeSlot(index, "end_time", e.target.value)}
                          className="w-full mt-1 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                        />
                      </div>

                      {/* Sĩ số max */}
                      <div className="sm:col-span-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Sĩ số max
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={slot.max_students || maxStudents || 10}
                          onChange={(e) => handleUpdateTimeSlot(index, "max_students", Number(e.target.value) || 10)}
                          className="w-full mt-1 px-2.5 py-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={Boolean(slot.is_active)}
                          onChange={(e) => handleUpdateTimeSlot(index, "is_active", e.target.checked ? 1 : 0)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Hoạt động
                      </label>

                      <button
                        onClick={() => handleRemoveTimeSlot(index)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        title="Xóa khung giờ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {timeSlots.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Chưa có khung giờ nào. Bấm <strong>&quot;+ Thêm khung giờ&quot;</strong> để thiết lập ca học.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Level Surcharges */}
          {activeTab === "levels" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Bảng Phụ Thu Theo Level & Trình Độ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Số tiền cộng thêm vào học phí cơ bản theo cấp độ của học sinh
                  </p>
                </div>
                <button
                  onClick={handleAddLevel}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Thêm Level
                </button>
              </div>

              <div className="space-y-2.5">
                {levels.map((lvl, index) => (
                  <div
                    key={lvl.id || index}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center gap-3.5 shadow-xs hover:border-slate-300 transition"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Tên Level
                        </label>
                        <input
                          type="text"
                          value={lvl.level_name}
                          onChange={(e) => handleUpdateLevel(index, "level_name", e.target.value)}
                          placeholder="Tên Level (Grade 1, Nâng Cao...)"
                          className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Mức phụ thu (+ VNĐ)
                        </label>
                        <div className="relative mt-1">
                          <input
                            type="number"
                            min="0"
                            step="50000"
                            value={lvl.surcharge_amount}
                            onChange={(e) =>
                              handleUpdateLevel(index, "surcharge_amount", Number(e.target.value) || 0)
                            }
                            className="w-full px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">
                            {formatVND(lvl.surcharge_amount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveLevel(index)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition shrink-0"
                      title="Xóa Level"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {levels.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Chưa có Level nào. Bấm <strong>&quot;+ Thêm Level&quot;</strong> để thiết lập.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Discounts */}
          {activeTab === "discounts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cấu Hình Các Mốc Chiết Khấu (Discount Presets)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Các mốc phần trăm giảm giá nhanh khi thêm/sửa học sinh
                  </p>
                </div>
                <button
                  onClick={handleAddDiscount}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition"
                >
                  <Plus className="w-4 h-4" /> Thêm mốc chiết khấu
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {discounts.map((disc, index) => (
                  <div
                    key={disc.id || index}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                          <Percent className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={disc.percentage}
                            onChange={(e) => handleUpdateDiscount(index, "percentage", e.target.value)}
                            className="w-16 px-2 py-1 text-sm font-black text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          <span className="text-xs font-black text-slate-500">%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveDiscount(index)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        title="Xóa mức chiết khấu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                        Lý do được giảm / Tên mức giảm
                      </label>
                      <input
                        type="text"
                        value={disc.label || ""}
                        onChange={(e) => handleUpdateDiscount(index, "label", e.target.value)}
                        placeholder="VD: Anh em ruột, Đăng ký sớm, Hộ nghèo..."
                        className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      />
                    </div>
                  </div>
                ))}

                {discounts.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400 text-xs">
                    Chưa có mức chiết khấu nào. Bấm <strong>&quot;+ Thêm mốc chiết khấu&quot;</strong> để tạo nhanh các mốc 10%, 20%...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Change Password for Admin */}
          {activeTab === "password" && (
            <div className="space-y-5 max-w-md mx-auto py-4">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center shadow-xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Đổi Mật Khẩu Quản Trị Viên
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cập nhật mật khẩu đăng nhập vào cổng Quản trị cơ sở này
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu hiện tại *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu đang sử dụng"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Mật khẩu mới (Tối thiểu 6 ký tự) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Nhập mật khẩu mới"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Xác nhận mật khẩu mới *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isChangingPassword ? "Đang cập nhật..." : "Cập Nhật Mật Khẩu Mới"}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/70 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Đóng
          </button>
          {activeTab !== "password" && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Đang lưu..." : "Lưu tất cả thay đổi"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
