"use client";

import React, { useState, useEffect } from "react";
import { Student, LevelSurcharge, TimeSlot, DiscountOption, Teacher, ScheduleItem, TuitionPackage, Subject, SchedulePreset } from "@/lib/types";
import {
  calculateStandardTuition,
  applyDiscount,
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
  Package,
  CalendarDays,
  Sparkles,
  BookOpen,
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
  tuitionPackages?: TuitionPackage[];
  subjects?: Subject[];
  schedulePresets?: SchedulePreset[];
  schoolId?: string;
  defaultDurationMode?: "by_hours" | "by_sessions";
  defaultSessions?: number;
  defaultHours?: number;
  defaultStudyTime?: string;
  initialTeacherId?: string;
  initialDay?: string;
  initialStartTime?: string;
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
  tuitionPackages = [],
  subjects = [],
  schedulePresets = [],
  schoolId,
  defaultDurationMode = "by_hours",
  defaultSessions = 3,
  defaultHours = 3,
  defaultStudyTime = "18:00 - 19:00",
  initialTeacherId,
  initialDay,
  initialStartTime,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zaloLink, setZaloLink] = useState("");
  const [zaloChatId, setZaloChatId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [tuitionPackageId, setTuitionPackageId] = useState("");
  const [startDate, setStartDate] = useState("");

  // Mode: "by_hours" (Theo tổng số tiếng / tuần) HOẶC "by_sessions" (Theo số buổi cố định / tuần)
  const [durationMode, setDurationMode] = useState<"by_hours" | "by_sessions">(defaultDurationMode);

  // If by_sessions:
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(defaultSessions);
  const [fixedSessionTime, setFixedSessionTime] = useState<string>(defaultStudyTime);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Thứ 2", "Thứ 4", "Thứ 6"]);
  const [sessionHours, setSessionHours] = useState<number>(1.5); // Thời lượng mỗi buổi theo kiểu lịch
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // If by_hours: Schedule items with flexible hours per day
  const [targetHours, setTargetHours] = useState<number>(defaultHours);
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([
    { id: "1", day: "Thứ 7", start_time: "09:00", end_time: "10:30", hours: 1.5 },
    { id: "2", day: "Chủ Nhật", start_time: "09:00", end_time: "10:30", hours: 1.5 },
  ]);

  // Discount
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (studentToEdit) {
      setName(studentToEdit.name || "");
      setPhone(studentToEdit.phone || "");
      setZaloLink(studentToEdit.zalo_link || "");
      setZaloChatId(studentToEdit.zalo_chat_id || "");
      setLevelId(studentToEdit.level_id || (levels[0]?.id ?? ""));
      setSubjectId(studentToEdit.subject_id || (subjects[0]?.id ?? ""));
      setTimeSlotId(studentToEdit.time_slot_id || (timeSlots[0]?.id ?? ""));
      setTeacherId(studentToEdit.teacher_id || (teachers[0]?.id ?? ""));
      setTuitionPackageId(studentToEdit.tuition_package_id || "");
      setStartDate(studentToEdit.start_date || "");

      const mode = (studentToEdit.duration_mode as "by_hours" | "by_sessions") || "by_hours";
      setDurationMode(mode);
      setSessionsPerWeek(studentToEdit.sessions_per_week || 3);
      setTargetHours(studentToEdit.hours_per_week || 3);

      const regDays = studentToEdit.registered_days
        ? studentToEdit.registered_days.split(",").map((d) => d.trim()).filter(Boolean)
        : ["Thứ 2", "Thứ 4", "Thứ 6"];
      setSelectedDays(regDays);

      const computedSessionH = regDays.length > 0 && studentToEdit.hours_per_week
        ? Math.round((Number(studentToEdit.hours_per_week) / regDays.length) * 10) / 10
        : 1.5;
      setSessionHours(computedSessionH);

      const matchedPreset = schedulePresets.find(
        (p) => p.days.length === regDays.length && p.days.every((d) => regDays.includes(d))
      );
      setSelectedPresetId(matchedPreset?.id || null);

      try {
        if (studentToEdit.schedule_details_json && studentToEdit.schedule_details_json !== "[]") {
          const parsed = JSON.parse(studentToEdit.schedule_details_json);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScheduleItems(parsed);
          }
        } else {
          const items: ScheduleItem[] = regDays.map((d, i) => ({
            id: String(i + 1),
            day: d,
            start_time: "09:00",
            end_time: "10:30",
            hours: computedSessionH,
          }));
          setScheduleItems(items);
        }
      } catch {
        // ignore
      }

      setFixedSessionTime(studentToEdit.study_time_detail || "18:00 - 19:00");
      setIsDiscountEnabled(Boolean(studentToEdit.is_discount_enabled));
      setDiscountPercent(studentToEdit.discount_percent || 0);
      setDiscountReason(studentToEdit.discount_reason || "");
    } else {
      setName("");
      setPhone("");
      setZaloLink("");
      setZaloChatId("");
      setLevelId(levels[0]?.id || "");
      setSubjectId(subjects[0]?.id || "");
      setTimeSlotId(timeSlots[0]?.id || "");
      setTeacherId(initialTeacherId || teachers[0]?.id || "");
      setTuitionPackageId(tuitionPackages[0]?.id || "");
      setStartDate(new Date().toISOString().slice(0, 10)); // Mặc định vào ngày hiện tại
      setDurationMode(defaultDurationMode);

      const defaultPreset = schedulePresets.find((p) => p.is_default) || schedulePresets[0];

      if (defaultPreset && !initialDay) {
        setSelectedPresetId(defaultPreset.id);
        const days = defaultPreset.days && defaultPreset.days.length > 0 ? defaultPreset.days : ["Thứ 2", "Thứ 4", "Thứ 6"];
        setSelectedDays(days);
        setSessionsPerWeek(days.length);
        const hPerSession = defaultPreset.hours_per_session || 1.5;
        setSessionHours(hPerSession);
        const calcHours = Math.round(days.length * hPerSession * 10) / 10;
        setTargetHours(calcHours);

        const startH = defaultPreset.default_start_time || "18:00";
        const [sH, sM] = startH.split(":").map(Number);
        const endMinutesTotal = (sH || 18) * 60 + (sM || 0) + Math.round(hPerSession * 60);
        const eH = Math.floor(endMinutesTotal / 60);
        const eM = endMinutesTotal % 60;
        const endH = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;
        const timeStr = `${startH} - ${endH}`;
        setFixedSessionTime(timeStr);

        const items: ScheduleItem[] = days.map((d, i) => ({
          id: String(i + 1),
          day: d,
          start_time: startH,
          end_time: endH,
          hours: hPerSession,
        }));
        setScheduleItems(items);
      } else {
        setSessionsPerWeek(defaultSessions);
        setTargetHours(defaultHours);

        const targetDay = initialDay || "Thứ 2";
        setSelectedDays([targetDay]);

        const startH = initialStartTime || "18:00";
        const startParts = startH.split(":").map(Number);
        const endHNum = (startParts[0] || 18) + 1;
        const endH = `${String(endHNum).padStart(2, "0")}:${String(startParts[1] || 0).padStart(2, "0")}`;
        const defaultTimeStr = `${startH} - ${endH}`;
        setFixedSessionTime(initialStartTime ? defaultTimeStr : defaultStudyTime);

        setScheduleItems([
          { id: "1", day: targetDay, start_time: startH, end_time: endH, hours: 1 },
        ]);
      }
      setIsDiscountEnabled(false);
      setDiscountPercent(0);
      setDiscountReason("");
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
    initialTeacherId,
    initialDay,
    initialStartTime,
    schedulePresets,
  ]);

  // Total hours from schedule items
  const totalAllocatedHours = scheduleItems.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);

  // Compute live preview of tuition
  const selectedLevel = levels.find((l) => l.id === levelId);
  const selectedLevelSurcharge = selectedLevel ? selectedLevel.surcharge_amount : 0;
  const selectedPkg = tuitionPackages.find((p) => p.id === tuitionPackageId);
  const liveTuition = selectedPkg
    ? applyDiscount(selectedPkg.amount, isDiscountEnabled, discountPercent)
    : calculateStandardTuition(
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

  const handleApplyPreset = (preset: SchedulePreset) => {
    setSelectedPresetId(preset.id);
    const days = preset.days && preset.days.length > 0 ? preset.days : ["Thứ 2"];
    setSelectedDays(days);
    setSessionsPerWeek(days.length);
    const hPerSession = preset.hours_per_session || 1.5;
    setSessionHours(hPerSession);

    const startH = preset.default_start_time || "18:00";
    const [sH, sM] = startH.split(":").map(Number);
    const endMinutesTotal = (sH || 18) * 60 + (sM || 0) + Math.round(hPerSession * 60);
    const eH = Math.floor(endMinutesTotal / 60);
    const eM = endMinutesTotal % 60;
    const endH = `${String(eH).padStart(2, "0")}:${String(eM).padStart(2, "0")}`;
    setFixedSessionTime(`${startH} - ${endH}`);

    // Tự động sinh scheduleItems tương ứng
    const newItems: ScheduleItem[] = days.map((day, idx) => ({
      id: String(idx + 1),
      day,
      start_time: startH,
      end_time: endH,
      hours: hPerSession,
    }));
    setScheduleItems(newItems);
  };

  const toggleDayFixed = (day: string) => {
    setSelectedPresetId(null);
    let newDays: string[];
    if (selectedDays.includes(day)) {
      newDays = selectedDays.filter((d) => d !== day);
    } else {
      newDays = [...selectedDays, day].sort(
        (a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b)
      );
    }
    setSelectedDays(newDays);
    setSessionsPerWeek(newDays.length);
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

    if (selectedDays.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 ngày học trong tuần!", "error");
      return;
    }

    const finalSessions = selectedDays.length;
    const finalHours = Math.round(selectedDays.length * sessionHours * 10) / 10;
    const finalRegisteredDays = selectedDays.join(", ");
    const finalStudyTimeDetail = fixedSessionTime.trim() || "18:00 - 19:00";

    // Tự động đồng bộ schedule_details_json để ma trận xếp lớp nhận diện chính xác
    const [startPart, endPart] = (finalStudyTimeDetail.includes("-")
      ? finalStudyTimeDetail.split("-")
      : ["18:00", "19:30"]
    ).map((s) => s.trim());

    const autoItems: ScheduleItem[] = selectedDays.map((d, idx) => ({
      id: String(idx + 1),
      day: d,
      start_time: startPart || "18:00",
      end_time: endPart || "19:30",
      hours: sessionHours,
    }));
    setScheduleItems(autoItems);

    try {
      setIsSaving(true);
      const isEdit = Boolean(studentToEdit?.id);
      const url = isEdit ? `/api/students/${studentToEdit?.id}` : "/api/students";
      const method = isEdit ? "PUT" : "POST";

      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (schoolId) headers["x-school-id"] = schoolId;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          school_id: schoolId || undefined,
          name: name.trim(),
          phone: phone.trim(),
          zalo_link: zaloLink.trim(),
          zalo_chat_id: zaloChatId.trim(),
          level_id: levelId,
          subject_id: subjectId || null,
          time_slot_id: timeSlotId || "",
          teacher_id: teacherId || null,
          tuition_package_id: tuitionPackageId || null,
          start_date: startDate.trim() || null,
          duration_mode: "by_sessions",
          sessions_per_week: finalSessions,
          hours_per_week: finalHours,
          registered_days: finalRegisteredDays,
          study_time_detail: finalStudyTimeDetail,
          schedule_details_json: JSON.stringify(autoItems),
          is_discount_enabled: isDiscountEnabled ? 1 : 0,
          discount_percent: isDiscountEnabled ? Number(discountPercent) || 0 : 0,
          discount_reason: isDiscountEnabled ? discountReason.trim() : "",
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

          {/* Phone, Zalo & Start Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Zalo Chat ID (Bot Tự Động)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={zaloChatId}
                  onChange={(e) => setZaloChatId(e.target.value)}
                  placeholder="ID chat từ Zalo Bot"
                  className="w-full px-3.5 py-2.5 text-sm font-mono font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Ngày đăng ký học (Start Date) với nút Vào hiện tại ngay */}
          <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ngày bắt đầu đăng ký học
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Thời điểm học sinh chính thức bắt đầu theo học tại trung tâm
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-36 sm:w-40">
                  <CalendarDays className="w-4 h-4 text-indigo-500 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setStartDate(new Date().toISOString().slice(0, 10))}
                  className="px-3 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Chọn ngày hôm nay"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hôm nay</span>
                </button>
              </div>
            </div>
          </div>

          {/* Teacher, Level & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Môn học đào tạo
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
                >
                  <option value="">-- Mặc định / Chưa phân môn --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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

          {/* Gói học phí áp dụng */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Gói Học Phí Áp Dụng
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <select
                value={tuitionPackageId}
                onChange={(e) => setTuitionPackageId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
              >
                <option value="">-- Mặc định (Tính theo giá chuẩn cơ sở) --</option>
                {tuitionPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({formatVND(pkg.amount)} • {pkg.cycle_value} {pkg.cycle_unit === "month" ? "tháng" : "tuần"})
                  </option>
                ))}
              </select>
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

          {/* DURATION CONFIGURATION (KIỂU LỊCH HỌC & MA TRẬN TỰ TÍNH) */}
          <div className="p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-4">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Cấu Hình Kiểu Lịch Học & Ma Trận Thời Lượng
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Chọn kiểu lịch mẫu của cơ sở hoặc linh hoạt chọn ngày học và số tiếng mỗi buổi để hệ thống tính ma trận tự động.
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              {/* Chọn nhanh theo Kiểu Lịch Mẫu của Cơ Sở */}
              {schedulePresets.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Chọn nhanh kiểu lịch học mẫu của cơ sở:
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Tự động điền ngày & giờ
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {schedulePresets.map((preset) => {
                      const isSelected = selectedPresetId === preset.id;
                      const calcTotalH = Math.round((preset.days?.length || 0) * (preset.hours_per_session || 1.5) * 10) / 10;
                      return (
                        <button
                          type="button"
                          key={preset.id}
                          onClick={() => handleApplyPreset(preset)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-600/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 border border-transparent hover:border-slate-300"
                          }`}
                        >
                          <span>{preset.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 font-mono"
                            }`}
                          >
                            {calcTotalH}h/tuần
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chọn các ngày học cố định */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Các ngày học trong tuần ({selectedDays.length} ngày đã chọn):
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

              {/* Cấu hình thời lượng mỗi buổi & Giờ học chi tiết */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Thời lượng mỗi buổi:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0.5"
                      max="8"
                      step="0.5"
                      value={sessionHours}
                      onChange={(e) => {
                        setSelectedPresetId(null);
                        setSessionHours(Number(e.target.value) || 1);
                      }}
                      className="w-20 px-3 py-1.5 text-xs font-bold text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                    <span className="text-xs font-bold text-slate-500">tiếng / buổi</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Khung giờ vào lớp mỗi buổi:
                  </label>
                  <input
                    type="text"
                    value={fixedSessionTime}
                    onChange={(e) => setFixedSessionTime(e.target.value)}
                    placeholder="18:00 - 19:30"
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Thẻ Ma Trận Tính Toán Tự Động */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                    Ma trận tính toán thời lượng tự động:
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {selectedDays.length} buổi × {sessionHours}h/buổi ={" "}
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {Math.round(selectedDays.length * sessionHours * 10) / 10} tiếng / tuần
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">Quy đổi:</span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 font-mono">
                    {Math.round(selectedDays.length * sessionHours * 60)} phút / tuần
                  </span>
                </div>
              </div>
            </div>
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
                      onClick={() => {
                        setDiscountPercent(preset.percentage);
                        if (preset.label && !preset.label.startsWith("Giảm ") && !discountReason) {
                          setDiscountReason(preset.label);
                        }
                      }}
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

                {/* Nhập Lý do được giảm học phí */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Lý do được giảm học phí:
                  </label>
                  <input
                    type="text"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="VD: Anh em ruột cùng học, Học sinh có hoàn cảnh khó khăn, Đăng ký sớm..."
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Standard Tuition Live Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {selectedPkg ? `Học phí áp dụng (${selectedPkg.name}):` : "Học phí chuẩn tự tính (Mặc định):"}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {selectedPkg
                  ? `Chu kỳ: ${selectedPkg.cycle_value} ${selectedPkg.cycle_unit === "month" ? "tháng" : "tuần"}${isDiscountEnabled && discountPercent > 0 ? ` (Giảm -${discountPercent}%)` : ""}`
                  : `(${formatVND(baseTuition)} base + ${formatVND(selectedLevelSurcharge)} surcharge)${isDiscountEnabled && discountPercent > 0 ? ` - ${discountPercent}%` : ""}`}
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
