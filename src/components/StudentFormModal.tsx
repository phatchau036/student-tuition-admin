"use client";

import React, { useState, useEffect } from "react";
import { Student, LevelSurcharge, TimeSlot, DiscountOption, Teacher, ScheduleItem } from "@/lib/types";
import {
  calculateStandardTuition,
  formatVND,
  formatTimeSlotLabel,
  isDayInSlot,
  timeToMinutes,
  minutesToTime,
  getSlotsForDay,
  isTimeRangeWithinSlot,
  getDayStartTimes,
  getDayEndTimes,
} from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import {
  User,
  Phone,
  MessageSquare,
  Clock,
  Layers,
  Percent,
  Save,
  GraduationCap,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Hourglass,
  Tag,
  DollarSign,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  studentToEdit?: Student | null;
  baseTuition: number;
  levels: LevelSurcharge[];
  timeSlots: TimeSlot[];
  teachers: Teacher[];
  discountPresets: DiscountOption[];
  defaultDurationMode?: "by_hours" | "by_sessions";
  defaultSessions?: number;
  defaultHours?: number;
  defaultStudyTime?: string;
}

const ALL_DAYS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

// Helper to calculate hours between two times "09:00" and "10:30" => 1.5
function calculateDurationHours(start: string, end: string): number {
  if (!start || !end) return 1;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0.5, Math.round((diffMinutes / 60) * 10) / 10);
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  studentToEdit,
  baseTuition,
  levels,
  timeSlots,
  teachers,
  discountPresets,
  defaultDurationMode = "by_hours",
  defaultSessions = 3,
  defaultHours = 3,
  defaultStudyTime = "18:00 - 19:00",
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zaloLink, setZaloLink] = useState("");
  const [levelId, setLevelId] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  // Mode: "by_hours" (Theo tổng số tiếng / tuần) HOẶC "by_sessions" (Theo số buổi cố định / tuần)
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">(defaultDurationMode);

  // If by_sessions:
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(defaultSessions);
  const [fixedSessionTime, setFixedSessionTime] = useState<string>(defaultStudyTime);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Thứ 2", "Thứ 4", "Thứ 6"]);

  // If by_hours: Schedule items with flexible hours per day
  const [targetHours, setTargetHours] = useState<number>(defaultHours);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([
    { id: "1", day: "Thứ 7", start_time: "09:00", end_time: "10:30", hours: 1.5 },
    { id: "2", day: "Chủ Nhật", start_time: "09:00", end_time: "10:30", hours: 1.5 },
  ]);

  // Discount
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name || "");
      setPhone(studentToEdit.phone || "");
      setZaloLink(studentToEdit.zalo_link || "");
      setLevelId(studentToEdit.level_id || (levels[0]?.id ?? ""));
      setTimeSlotId(studentToEdit.time_slot_id || (timeSlots[0]?.id ?? ""));
      setTeacherId(studentToEdit.teacher_id || (teachers[0]?.id ?? ""));

      const mode = (studentToEdit.duration_mode as "by_hours" | "by_sessions") || "by_hours";
      setDurationMode(mode);
      setSessionsPerWeek(studentToEdit.sessions_per_week || 3);
      setTargetHours(studentToEdit.hours_per_week || 3);

      try {
        if (studentToEdit.schedule_details_json && studentToEdit.schedule_details_json !== "[]") {
          const parsed = JSON.parse(studentToEdit.schedule_details_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScheduleItems(parsed);
          }
        } else {
          const days = studentToEdit.registered_days
            ? studentToEdit.registered_days.split(",").map((d) => d.trim()).filter(Boolean)
            : ["Thứ 7", "Chủ Nhật"];
          setSelectedDays(days);
          const items: ScheduleItem[] = days.map((d, i) => ({
            id: String(i + 1),
            day: d,
            start_time: "09:00",
            end_time: "10:30",
            hours: 1.5,
          }));
          setScheduleItems(items);
        }
      } catch {
        // ignore
      }

      setFixedSessionTime(studentToEdit.study_time_detail || "18:00 - 19:00");
      setIsDiscountEnabled(Boolean(studentToEdit.is_discount_enabled));
      setDiscountPercent(studentToEdit.discount_percent || 0);
    } else {
      setName("");
      setPhone("");
      setZaloLink("");
      setLevelId(levels[0]?.id || "");
      setTimeSlotId(timeSlots[0]?.id || "");
      setTeacherId(teachers[0]?.id || "");
      setDurationMode(defaultDurationMode);
      setSessionsPerWeek(defaultSessions);
      setTargetHours(defaultHours);
      setSelectedDays(["Thứ 2", "Thứ 4", "Thứ 6"]);
      setFixedSessionTime(defaultStudyTime);
      setScheduleItems([
        { id: "1", day: "Thứ 7", start_time: "09:00", end_time: "10:30", hours: 1.5 },
        { id: "2", day: "Chủ Nhật", start_time: "09:00", end_time: "10:30", hours: 1.5 },
      ]);
      setIsDiscountEnabled(false);
      setDiscountPercent(0);
    }
  }, [
    studentToEdit,
    isOpen,
    levels,
    timeSlots,
    teachers,
    defaultDurationMode,
    defaultSessions,
    defaultHours,
    defaultStudyTime,
  ]);

  // Total hours from schedule items
  const totalAllocatedHours = scheduleItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

  // Compute live preview of tuition
  const selectedLevel = levels.find((l) => l.id === levelId);
  const selectedLevelSurcharge = selectedLevel ? selectedLevel.surcharge_amount : 0;
  const liveTuition = calculateStandardTuition(
    baseTuition,
    selectedLevelSurcharge,
    isDiscountEnabled,
    discountPercent
  );

  // Helpers for schedule items in by_hours mode
  const handleAddScheduleItem = () => {
    // Pick the first day that has open slots, or default to Thứ 2
    const firstOpenDay = ALL_DAYS.find((d) => getSlotsForDay(d, timeSlots).length > 0) || "Thứ 2";
    const availableStartTimes = getDayStartTimes(firstOpenDay, timeSlots);
    const defaultStart = availableStartTimes[0] || "17:00";
    const availableEndTimes = getDayEndTimes(firstOpenDay, defaultStart, timeSlots);
    const defaultEnd = availableEndTimes[1] || availableEndTimes[0] || "18:30";

    const newItem: ScheduleItem = {
      id: `${Date.now()}`,
      day: firstOpenDay,
      start_time: defaultStart,
      end_time: defaultEnd,
      hours: calculateDurationHours(defaultStart, defaultEnd),
    };
    setScheduleItems([...scheduleItems, newItem]);
  };

  const handleUpdateScheduleItem = (id: string, field: keyof ScheduleItem, val: any) => {
    setScheduleItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };

        // When day changes, auto update start and end times to match the operating hours of that new day
        if (field === "day") {
          const newDayStarts = getDayStartTimes(val, timeSlots);
          const newStart = newDayStarts.includes(updated.start_time)
            ? updated.start_time
            : newDayStarts[0] || "17:00";
          const newDayEnds = getDayEndTimes(val, newStart, timeSlots);
          const newEnd = newDayEnds.includes(updated.end_time)
            ? updated.end_time
            : newDayEnds[1] || newDayEnds[0] || "18:30";

          updated.start_time = newStart;
          updated.end_time = newEnd;
          updated.hours = calculateDurationHours(newStart, newEnd);
          return updated;
        }

        // When start_time changes, ensure end_time is valid within the day
        if (field === "start_time") {
          const validEnds = getDayEndTimes(updated.day, val, timeSlots);
          if (!validEnds.includes(updated.end_time)) {
            updated.end_time = validEnds[1] || validEnds[0] || "18:30";
          }
          updated.hours = calculateDurationHours(val, updated.end_time);
          return updated;
        }

        if (field === "end_time") {
          updated.hours = calculateDurationHours(updated.start_time, val);
          return updated;
        }

        return updated;
      })
    );
  };

  const handleRemoveScheduleItem = (id: string) => {
    setScheduleItems(scheduleItems.filter((i) => i.id !== id));
  };

  const toggleDayFixed = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập tên học sinh!", "error");
      return;
    }
    if (!phone.trim()) {
      showToast("Vui lòng nhập số điện thoại!", "error");
      return;
    }
    if (!levelId) {
      showToast("Vui lòng chọn Level cho học sinh!", "error");
      return;
    }

    let finalRegisteredDays = "";
    let finalStudyTimeDetail = "";
    let finalSessions = sessionsPerWeek;
    let finalHours = targetHours;

    if (durationMode === "by_hours") {
      // Validate that all scheduled items fall within the operating slots of their respective days
      for (const item of scheduleItems) {
        const slotsForDay = getSlotsForDay(item.day, timeSlots);
        if (slotsForDay.length > 0) {
          const isValid = slotsForDay.some((s) => isTimeRangeWithinSlot(item.start_time, item.end_time, s));
          if (!isValid) {
            showToast(
              `Giờ học ${item.day} (${item.start_time} - ${item.end_time}) không nằm trong khung giờ mở cửa của cơ sở!`,
              "error"
            );
            return;
          }
        }
      }

      finalHours = targetHours;
      finalSessions = scheduleItems.length;
      finalRegisteredDays = scheduleItems.map((i) => i.day).join(", ");
      finalStudyTimeDetail = scheduleItems
        .map((i) => `${i.day}: ${i.start_time}-${i.end_time} (${i.hours}h)`)
        .join(" | ");
    } else {
      finalSessions = sessionsPerWeek;
      finalHours = sessionsPerWeek * 1;
      finalRegisteredDays = selectedDays.join(", ");
      finalStudyTimeDetail = fixedSessionTime.trim() || "18:00 - 19:00";
    }

    try {
      setIsSaving(true);
      const isEdit = Boolean(studentToEdit?.id);
      const url = isEdit ? `/api/students/${studentToEdit?.id}` : "/api/students";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          zalo_link: zaloLink.trim(),
          level_id: levelId,
          time_slot_id: timeSlotId || "",
          teacher_id: teacherId || null,
          duration_mode: durationMode,
          sessions_per_week: finalSessions,
          hours_per_week: finalHours,
          registered_days: finalRegisteredDays,
          study_time_detail: finalStudyTimeDetail,
          schedule_details_json: JSON.stringify(scheduleItems),
          is_discount_enabled: isDiscountEnabled ? 1 : 0,
          discount_percent: isDiscountEnabled ? Number(discountPercent) || 0 : 0,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          isEdit ? "Cập nhật thông tin học sinh thành công!" : "Thêm học sinh mới thành công!",
          "success"
        );
        onSaved();
        onClose();
      } else {
        showToast(data.message || "Không thể lưu thông tin!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {studentToEdit ? "Chỉnh Sửa Thông Tin Học Sinh" : "Thêm Học Sinh Mới"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Điền thông tin liên lạc, xếp lớp, phân công giáo viên và thời lượng học
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

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Họ và tên học sinh <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên học sinh"
                className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Phone & Zalo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Link Zalo (Tùy chọn)
              </label>
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={zaloLink}
                  onChange={(e) => setZaloLink(e.target.value)}
                  placeholder="https://zalo.me/..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Teacher & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Giáo viên phụ trách
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
                >
                  <option value="">-- Chưa gán giáo viên --</option>
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>
                      {tc.name} {tc.specialty ? `(${tc.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Level / Trình độ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={levelId}
                  onChange={(e) => setLevelId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
                >
                  {levels.length === 0 ? (
                    <option value="">-- Chưa có Level nào (Vào Cài đặt để thêm) --</option>
                  ) : (
                    levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.level_name} (+{formatVND(lvl.surcharge_amount)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Time Slot Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Khung giờ mở cửa tham chiếu
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <select
                value={timeSlotId}
                onChange={(e) => setTimeSlotId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
              >
                <option value="">-- Linh hoạt theo lịch học bên dưới --</option>
                {timeSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {formatTimeSlotLabel(slot)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DURATION CONFIGURATION */}
          <div className="p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Cấu Hình Lịch Học & Thời Lượng (Chọn 1 trong 2 hình thức)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Linh hoạt theo <strong>Tổng số tiếng/tuần</strong> (chia nhiều ca) hoặc <strong>Số buổi cố định/tuần</strong>.
              </p>
            </div>

            {/* Switch Mode Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-200/70 dark:bg-slate-900 rounded-2xl">
              <button
                type="button"
                onClick={() => setDurationMode("by_hours")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  durationMode === "by_hours"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>Học Đủ Số Tiếng / Tuần</span>
                {durationMode === "by_hours" && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => setDurationMode("by_sessions")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  durationMode === "by_sessions"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <span>Cố Định Số Buổi / Tuần</span>
                {durationMode === "by_sessions" && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            </div>

            {/* HÌNH THỨC 1: THEO TỔNG SỐ TIẾNG / TUẦN */}
            {durationMode === "by_hours" && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mục tiêu thời lượng:
                    </span>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={targetHours}
                      onChange={(e) => setTargetHours(Number(e.target.value) || 1)}
                      className="w-16 px-2 py-1 text-xs font-black text-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs font-semibold text-slate-500">tiếng / tuần</span>
                  </div>

                  <div className="text-xs">
                    Đã xếp:{" "}
                    <span
                      className={`font-black ${
                        totalAllocatedHours >= targetHours ? "text-emerald-600" : "text-amber-600"
                      }`}
                    >
                      {totalAllocatedHours} / {targetHours} tiếng
                    </span>
                  </div>
                </div>

                {/* Schedule Items List */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Chi tiết các buổi học trong tuần để đủ {targetHours} tiếng:
                  </span>

                  {scheduleItems.map((item) => {
                    const dayOperatingSlots = getSlotsForDay(item.day, timeSlots);
                    const availableStarts = getDayStartTimes(item.day, timeSlots);
                    const availableEnds = getDayEndTimes(item.day, item.start_time, timeSlots);
                    const isWithinOperating =
                      dayOperatingSlots.length === 0 ||
                      dayOperatingSlots.some((s) => isTimeRangeWithinSlot(item.start_time, item.end_time, s));

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                          !isWithinOperating
                            ? "border-rose-300 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20"
                            : "border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap flex-1">
                            {/* Day select */}
                            <select
                              value={item.day}
                              onChange={(e) => handleUpdateScheduleItem(item.id, "day", e.target.value)}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              {ALL_DAYS.map((d) => {
                                const countForD = getSlotsForDay(d, timeSlots).length;
                                return (
                                  <option key={d} value={d}>
                                    {d} {countForD > 0 ? `(${countForD} ca mở)` : "(Không có ca mở)"}
                                  </option>
                                );
                              })}
                            </select>

                            {/* 24h Start Time Select */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500">Từ</span>
                              <select
                                value={item.start_time}
                                onChange={(e) => handleUpdateScheduleItem(item.id, "start_time", e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-black font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                              >
                                {availableStarts.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>

                              <span className="text-[11px] font-bold text-slate-500">đến</span>

                              {/* 24h End Time Select */}
                              <select
                                value={item.end_time}
                                onChange={(e) => handleUpdateScheduleItem(item.id, "end_time", e.target.value)}
                                className="px-2.5 py-1.5 text-xs font-black font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                              >
                                {availableEnds.map((t) => (
                                  <option key={t} value={t}>
                                    {t}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Duration pill */}
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {item.hours} tiếng
                            </span>
                          </div>

                          {/* Remove button */}
                          {scheduleItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveScheduleItem(item.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition shrink-0"
                              title="Xóa buổi này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Ca mở cửa có sẵn của thứ này để chọn nhanh 1 cú click */}
                        {dayOperatingSlots.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap text-[11px]">
                            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mr-1">
                              Chọn nhanh ca mở cửa {item.day}:
                            </span>
                            {dayOperatingSlots.map((slot) => {
                              const isSlotSelected =
                                item.start_time === slot.start_time && item.end_time === slot.end_time;
                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => {
                                    handleUpdateScheduleItem(item.id, "start_time", slot.start_time);
                                    handleUpdateScheduleItem(item.id, "end_time", slot.end_time);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                                    isSlotSelected
                                      ? "bg-indigo-600 border-indigo-600 text-white shadow-2xs"
                                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600"
                                  }`}
                                >
                                  {slot.name} ({slot.start_time} - {slot.end_time})
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Cảnh báo nếu chọn giờ ngoài khung mở cửa của thứ đó */}
                        {dayOperatingSlots.length > 0 && !isWithinOperating && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 pt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Giờ học ({item.start_time} - {item.end_time}) không nằm trong bất kỳ ca mở cửa nào của{" "}
                              {item.day}!
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleAddScheduleItem}
                    className="w-full py-2.5 border border-dashed border-indigo-300 dark:border-indigo-800/80 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> Thêm buổi học trong tuần
                  </button>
                </div>
              </div>
            )}

            {/* HÌNH THỨC 2: THEO SỐ BUỔI CỐ ĐỊNH / TUẦN */}
            {durationMode === "by_sessions" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Số buổi / tuần:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="7"
                      value={sessionsPerWeek}
                      onChange={(e) => setSessionsPerWeek(Number(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Giờ học mỗi buổi:
                    </label>
                    <input
                      type="text"
                      value={fixedSessionTime}
                      onChange={(e) => setFixedSessionTime(e.target.value)}
                      placeholder="18:00 - 19:00"
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                    Chọn các ngày học cố định trong tuần:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DAYS.map((day) => {
                      const isChecked = selectedDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => toggleDayFixed(day)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                            isChecked
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Discount Section */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                <Percent className="w-4 h-4 text-indigo-500" />
                Áp Dụng Chiết Khấu / Giảm Giá
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDiscountEnabled}
                  onChange={(e) => setIsDiscountEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {isDiscountEnabled && (
              <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                <div className="flex flex-wrap gap-1.5">
                  {discountPresets.map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => setDiscountPercent(preset.percentage)}
                      className={`px-3 py-1 text-xs font-bold rounded-xl border transition ${
                        discountPercent === preset.percentage
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-500">Hoặc tự nhập:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-xs font-black text-slate-900 dark:text-white rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>
              </div>
            )}
          </div>

          {/* Standard Tuition Live Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Học phí chuẩn tự tính (Mặc định):
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                ({formatVND(baseTuition)} base + {formatVND(selectedLevelSurcharge)} surcharge)
                {isDiscountEnabled && discountPercent > 0 ? ` - ${discountPercent}%` : ""}
              </span>
            </div>
            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
              {formatVND(liveTuition)}
            </span>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {isSaving ? "Đang lưu..." : studentToEdit ? "Lưu thay đổi" : "Tạo học sinh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
