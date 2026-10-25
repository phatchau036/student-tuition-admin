"use client";

import React, { useState, useEffect } from "react";
import { TimeSlot, LevelSurcharge, DiscountOption } from "@/lib/types";
import { formatVND, formatTimeSlotLabel } from "@/lib/tuition";
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
  Lock,
  KeyRound,
  ShieldCheck,
  Tag,
  AlertCircle,
  HelpCircle,
  X,
  Sliders,
  Sparkles,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialBaseTuition: number;
  initialDurationMode?: "by_hours" | "by_sessions";
  initialDefaultHours?: number;
  initialDefaultSessions?: number;
  initialDefaultStudyTime?: string;
  initialMaxStudents?: number;
  initialCrowdedThreshold?: number;
  initialTimeSlots: TimeSlot[];
  initialLevelSurcharges: LevelSurcharge[];
  initialDiscountPresets: DiscountOption[];
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialBaseTuition,
  initialDurationMode = "by_hours",
  initialDefaultHours = 3,
  initialDefaultSessions = 3,
  initialDefaultStudyTime = "18:00 - 19:00",
  initialMaxStudents = 10,
  initialCrowdedThreshold = 80,
  initialTimeSlots,
  initialLevelSurcharges,
  initialDiscountPresets,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "slots" | "levels" | "discounts" | "password">("general");

  // State
  const [baseTuition, setBaseTuition] = useState<number>(initialBaseTuition);
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">(initialDurationMode);
  const [defaultHours, setDefaultHours] = useState<number>(initialDefaultHours);
  const [defaultSessions, setDefaultSessions] = useState<number>(initialDefaultSessions);
  const [defaultStudyTime, setDefaultStudyTime] = useState<string>(initialDefaultStudyTime);
  const [maxStudents, setMaxStudents] = useState<number>(initialMaxStudents);
  const [crowdedThreshold, setCrowdedThreshold] = useState<number>(initialCrowdedThreshold);

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(initialTimeSlots);
  const [levels, setLevels] = useState<LevelSurcharge[]>(initialLevelSurcharges);
  const [discounts, setDiscounts] = useState<DiscountOption[]>(initialDiscountPresets);
  const [isSaving, setIsSaving] = useState(false);

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
    setDefaultHours(initialDefaultHours);
    setDefaultSessions(initialDefaultSessions);
    setDefaultStudyTime(initialDefaultStudyTime);
    setMaxStudents(initialMaxStudents);
    setCrowdedThreshold(initialCrowdedThreshold);
    setTimeSlots(initialTimeSlots);
    setLevels(initialLevelSurcharges);
    setDiscounts(initialDiscountPresets);
  }, [
    initialBaseTuition,
    initialDurationMode,
    initialDefaultHours,
    initialDefaultSessions,
    initialDefaultStudyTime,
    initialMaxStudents,
    initialCrowdedThreshold,
    initialTimeSlots,
    initialLevelSurcharges,
    initialDiscountPresets,
    isOpen,
  ]);

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

  const handleUpdateDiscount = (index: number, val: number) => {
    const updated = [...discounts];
    updated[index] = {
      ...updated[index],
      percentage: val,
      label: `Giảm ${val}%`,
    };
    setDiscounts(updated);
  };

  const handleRemoveDiscount = (index: number) => {
    setDiscounts(discounts.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_tuition: Number(baseTuition) || 0,
          duration_mode: durationMode,
          default_hours_per_week: Number(defaultHours) || 3,
          default_sessions_per_week: Number(defaultSessions) || 3,
          default_study_time: defaultStudyTime.trim() || "18:00 - 19:00",
          max_students_per_slot: Number(maxStudents) || 10,
          crowded_threshold_percent: Number(crowdedThreshold) || 80,
          time_slots: timeSlots,
          level_surcharges: levels,
          discount_presets: discounts,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Lưu cấu hình hệ thống thành công!", "success");
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

        {/* Modern Pill Navigation Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-2.5 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "general"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Học phí & Thời lượng</span>
          </button>

          <button
            onClick={() => setActiveTab("slots")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "slots"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Khung giờ ({timeSlots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("levels")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "levels"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Phụ thu Level ({levels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("discounts")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "discounts"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Percent className="w-4 h-4" />
            <span>Chiết khấu ({discounts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("password")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "password"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Đổi Mật Khẩu</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Base Tuition, Capacity & Weekly Duration Mode */}
          {activeTab === "general" && (
            <div className="space-y-6 max-w-3xl">
              {/* Base Price Card */}
              <div className="bg-gradient-to-tr from-indigo-50/70 to-purple-50/50 dark:from-indigo-950/30 dark:to-purple-950/20 p-5 rounded-2xl border border-indigo-100/80 dark:border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-indigo-600" />
                    Mức Học Phí Cơ Bản Tiêu Chuẩn (Base Price)
                  </label>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                    Áp dụng toàn cơ sở
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={baseTuition}
                    onChange={(e) => setBaseTuition(Number(e.target.value) || 0)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-black text-indigo-600 dark:text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    VNĐ / Tháng
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Số tiền hiển thị:</span>
                  <span className="font-black text-slate-900 dark:text-white text-sm">{formatVND(baseTuition)}</span>
                </div>
              </div>

              {/* DURATION MODE: CHỌN HOẶC THEO TIẾNG HOẶC THEO BUỔI */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Chế Độ Quản Lý Thời Lượng Học (Chọn 1 trong 2 hình thức)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Cấu hình quy chuẩn học tập mặc định khi đăng ký học sinh mới.
                  </p>
                </div>

                {/* Two Option Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Option 1: Theo số tiếng */}
                  <div
                    onClick={() => setDurationMode("by_hours")}
                    className={`p-4.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      durationMode === "by_hours"
                        ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs"
                        : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                          Hình Thức 1
                        </span>
                        {durationMode === "by_hours" && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Theo Tổng Số Tiếng / Tuần
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Linh hoạt số buổi trong tuần (ví dụ: học dồn 3 tiếng Thứ 7 hoặc chia 1.5h Thứ 7 + 1.5h Chủ Nhật).
                      </p>
                    </div>

                    {durationMode === "by_hours" && (
                      <div className="mt-3.5 pt-3 border-t border-indigo-100 dark:border-indigo-900/60">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Số tiếng mặc định mỗi tuần:
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={defaultHours}
                            onChange={(e) => setDefaultHours(Number(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">tiếng/tuần</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option 2: Theo số buổi */}
                  <div
                    onClick={() => setDurationMode("by_sessions")}
                    className={`p-4.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      durationMode === "by_sessions"
                        ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs"
                        : "border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600">
                          Hình Thức 2
                        </span>
                        {durationMode === "by_sessions" && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        Theo Số Buổi Cố Định / Tuần
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Cố định các ca học theo lịch (ví dụ: Thứ 2, Thứ 4, Thứ 6 mỗi ca 1 tiếng).
                      </p>
                    </div>

                    {durationMode === "by_sessions" && (
                      <div className="mt-3.5 pt-3 border-t border-indigo-100 dark:border-indigo-900/60">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          Số buổi mặc định mỗi tuần:
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="7"
                            value={defaultSessions}
                            onChange={(e) => setDefaultSessions(Number(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-3 top-1.5 text-xs font-bold text-slate-400">buổi/tuần</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Class Capacity & Crowded Threshold Card */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    Cấu Hình Sĩ Số Ca & Cảnh Báo Lớp Đông Khi Học Bù
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                    Bảo vệ lớp học
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Sĩ số tối đa trong một ca / lớp
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
                      <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">học sinh / ca</span>
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
              </div>
            </div>
          )}

          {/* TAB 2: Time Slots WITH DROPDOWN FROM DAY TO DAY */}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {discounts.map((disc, index) => (
                  <div
                    key={disc.id || index}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0">
                        <Percent className="w-4 h-4" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={disc.percentage}
                        onChange={(e) => handleUpdateDiscount(index, Number(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-sm font-black text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>

                    <button
                      onClick={() => handleRemoveDiscount(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                      title="Xóa mức chiết khấu"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
