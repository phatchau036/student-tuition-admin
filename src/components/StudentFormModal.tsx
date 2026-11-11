"use client";

import React, { useState, useEffect } from "react";
import { Student, LevelSurcharge, TimeSlot, DiscountOption, Teacher, ScheduleItem, TuitionPackage, Subject, SchedulePreset, ClassRoom, DAYS_OF_WEEK } from "@/lib/types";
import {
  calculateStudentTuition,
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
import { checkClassCapacityForSchedule } from "@/lib/shiftDetection";
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
  Check,
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
  Building2,
  Users,
  ShieldAlert,
  Lock,
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
  classes?: ClassRoom[];
  students?: Student[];
  schedulePresets?: SchedulePreset[];
  schoolId?: string;
  defaultDurationMode?: "by_hours" | "by_sessions";
  defaultSessions?: number;
  defaultHours?: number;
  defaultStudyTime?: string;
  initialTeacherId?: string;
  initialClassId?: string;
  initialDay?: string;
  initialStartTime?: string;
  canManageTuition?: boolean;
  canViewTuition?: boolean;
}

const ALL_DAYS = DAYS_OF_WEEK;

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
  classes = [],
  students = [],
  schedulePresets = [],
  schoolId,
  defaultDurationMode = "by_hours",
  defaultSessions = 3,
  defaultHours = 3,
  defaultStudyTime = "18:00 - 19:00",
  initialTeacherId,
  initialClassId,
  initialDay,
  initialStartTime,
  canManageTuition = true,
  canViewTuition = true,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zaloLink, setZaloLink] = useState("");
  const [zaloChatId, setZaloChatId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
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
  const [selectedPresetName, setSelectedPresetName] = useState<string>("");

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
      setClassId(studentToEdit.class_id || "");
      setTimeSlotId(studentToEdit.time_slot_id || (timeSlots[0]?.id ?? ""));
      setTeacherId(studentToEdit.class_id ? "" : (studentToEdit.teacher_id || ""));
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
        (p) =>
          (studentToEdit.schedule_preset_name && p.name === studentToEdit.schedule_preset_name) ||
          (p.days.length === regDays.length && p.days.every((d) => regDays.includes(d)))
      );
      setSelectedPresetId(matchedPreset?.id || null);
      setSelectedPresetName(studentToEdit.schedule_preset_name || matchedPreset?.name || "");

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
      setClassId(initialClassId || "");
      setTimeSlotId(timeSlots[0]?.id || "");
      setTeacherId(initialClassId ? "" : (initialTeacherId || teachers[0]?.id || ""));
      setTuitionPackageId(tuitionPackages[0]?.id || "");
      setStartDate(new Date().toISOString().slice(0, 10)); // Mặc định vào ngày hiện tại
      setDurationMode(defaultDurationMode);

      const defaultPreset = schedulePresets.find((p) => p.is_default) || schedulePresets[0];

      if (defaultPreset && !initialDay) {
        setSelectedPresetId(defaultPreset.id);
        setSelectedPresetName(defaultPreset.name);
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
  const liveBreakdown = calculateStudentTuition({
    packageAmount: selectedPkg ? selectedPkg.amount : null,
    packageName: selectedPkg ? selectedPkg.name : null,
    baseTuition,
    levelSurcharge: selectedLevelSurcharge,
    levelName: selectedLevel?.level_name,
    isDiscountEnabled,
    discountPercent,
  });
  const liveTuition = liveBreakdown.finalTuition;

  // Kiểm tra sĩ số thực tế theo ca & ngày của lớp học được chọn
  const classCapacityCheck = React.useMemo(() => {
    if (!classId) return null;
    return checkClassCapacityForSchedule({
      selectedClassId: classId,
      selectedDays,
      sessionTimeStr: fixedSessionTime,
      classes,
      allStudents: students,
      excludeStudentId: studentToEdit?.id,
    });
  }, [classId, selectedDays, fixedSessionTime, classes, students, studentToEdit?.id]);

  const handleApplyPreset = (preset: SchedulePreset) => {
    setSelectedPresetId(preset.id);
    setSelectedPresetName(preset.name);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập tên học sinh!", "error");
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

    // Kiểm tra ràng buộc sĩ số tối đa theo ca của lớp
    if (classCapacityCheck && classCapacityCheck.isOverCapacity) {
      showToast(
        classCapacityCheck.warningMessage || "Ca học của lớp đã đạt sĩ số tối đa, không thể lưu thêm học sinh!",
        "error"
      );
      return;
    }

    const finalSessions = selectedDays.length;
    const finalHours = Math.round(selectedDays.length * sessionHours * 10) / 10;
    const finalRegisteredDays = selectedDays.join(", ");
    const finalStudyTimeDetail = fixedSessionTime.trim() || "18:00 - 19:00";

    // Tự động đồng bộ schedule_details_json để ma trận xếp lớp nhận diện chính xác
    // Chuẩn hóa tách giờ thông minh: tránh trường hợp chuỗi chứa dải ngày như "T2, T4 (17h - 18h30)" làm hỏng start_time
    const cleanTimeStr = finalStudyTimeDetail.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\b/gi, " ");
    const rangeMatch = cleanTimeStr.match(
      /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
    );
    let startPart = "18:00";
    let endPart = "19:30";

    if (rangeMatch) {
      const sH = parseInt(rangeMatch[1], 10);
      const sM = rangeMatch[2] || rangeMatch[3] || "00";
      let eH = parseInt(rangeMatch[4], 10);
      const eM = rangeMatch[5] || rangeMatch[6] || "00";
      if (!isNaN(sH) && sH >= 0 && sH <= 23) {
        if (!isNaN(eH) && eH < sH && eH <= 5) eH += 12;
        const validEH = !isNaN(eH) ? eH : sH + 1;
        startPart = `${String(sH).padStart(2, "0")}:${sM}`;
        endPart = `${String(validEH).padStart(2, "0")}:${eM}`;
      }
    } else {
      const singleMatch = cleanTimeStr.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
      if (singleMatch) {
        const sH = parseInt(singleMatch[1], 10);
        const sM = singleMatch[2] || singleMatch[3] || "00";
        if (!isNaN(sH) && sH >= 0 && sH <= 23) {
          startPart = `${String(sH).padStart(2, "0")}:${sM}`;
          endPart = `${String(sH + 1).padStart(2, "0")}:${sM}`;
        }
      }
    }

    const autoItems: ScheduleItem[] = selectedDays.map((d, idx) => ({
      id: String(idx + 1),
      day: d,
      start_time: startPart,
      end_time: endPart,
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
          class_id: classId || null,
          time_slot_id: timeSlotId || "",
          teacher_id: classId ? null : (teacherId || null),
          tuition_package_id: tuitionPackageId || null,
          start_date: startDate.trim() || null,
          duration_mode: "by_sessions",
          sessions_per_week: finalSessions,
          hours_per_week: finalHours,
          registered_days: finalRegisteredDays,
          study_time_detail: finalStudyTimeDetail,
          schedule_details_json: JSON.stringify(autoItems),
          schedule_preset_name: selectedPresetName || (schedulePresets.find((p) => p.id === selectedPresetId)?.name) || "",
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
                Số điện thoại liên hệ
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567 (Tùy chọn)"
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

          {/* Class, Level & Subject (Hệ thống tự động xếp giáo viên theo ca của Lớp) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Lớp học tham gia
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <select
                  value={classId}
                  onChange={(e) => {
                    const cId = e.target.value;
                    setClassId(cId);
                    setTeacherId(""); // Hệ thống tự động xếp giáo viên theo khung giờ của lớp
                    const matchedClass = classes.find((c) => c.id === cId);
                    if (matchedClass) {
                      if (matchedClass.subject_id) setSubjectId(matchedClass.subject_id);
                      // Chỉ gợi ý điền lịch mở của lớp khi tạo học sinh mới hoàn toàn và chưa có ngày nào được chọn
                      if (!studentToEdit && selectedDays.length === 0) {
                        try {
                          if (matchedClass.schedule_json) {
                            const parsed = JSON.parse(matchedClass.schedule_json);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              const days = parsed.map((item: any) => item.day);
                              setSelectedDays(days);
                              const first = parsed[0];
                              if (first.start_time && first.end_time) {
                                setFixedSessionTime(`${first.start_time} - ${first.end_time}`);
                              }
                            }
                          }
                        } catch {}
                      }
                    }
                  }}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition"
                >
                  <option value="">-- Chưa gán lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.room ? `(${cls.room})` : ""} - {cls.student_count || 0}/{cls.max_students || 10} HS
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Gói Học Phí Áp Dụng
              </label>
              {!canManageTuition && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Cần quyền Học Phí để sửa
                </span>
              )}
            </div>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <select
                disabled={!canManageTuition}
                value={tuitionPackageId}
                onChange={(e) => setTuitionPackageId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none hover:border-slate-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
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

          {/* DURATION CONFIGURATION (KIỂU LỊCH HỌC & MA TRẬN TỰ TÍNH THEO SETTING) */}
          <div className="p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Kiểu Lịch Học Áp Dụng (Theo Cấu Hình Cơ Sở)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Chọn 1 trong các kiểu lịch mà cơ sở đã thiết lập. Ngày học và thời lượng buổi được áp dụng tự động.
                </p>
              </div>
              <span className="self-start sm:self-auto text-[10px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-900/40">
                <Sparkles className="w-3 h-3" /> Chuẩn hóa từ Cài Đặt
              </span>
            </div>

            {/* Danh sách các kiểu lịch học dạng Cards để chọn trực tiếp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {(schedulePresets && schedulePresets.length > 0
                ? schedulePresets
                : [
                    { id: "preset-even", name: "Thứ chẵn (2-4-6)", days: ["Thứ 2", "Thứ 4", "Thứ 6"], hours_per_session: 1.5, default_start_time: "18:00", is_default: true },
                    { id: "preset-odd", name: "Thứ lẻ (3-5-7)", days: ["Thứ 3", "Thứ 5", "Thứ 7"], hours_per_session: 1.5, default_start_time: "18:00", is_default: false },
                    { id: "preset-weekend", name: "Cuối tuần (T7-CN)", days: ["Thứ 7", "Chủ Nhật"], hours_per_session: 2.0, default_start_time: "09:00", is_default: false },
                  ]
              ).map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const calcTotalH = Math.round((preset.days?.length || 0) * (preset.hours_per_session || 1.5) * 10) / 10;
                return (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs ring-2 ring-indigo-600/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {preset.name}
                        </span>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          preset.is_default && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                              Mặc định
                            </span>
                          )
                        )}
                      </div>

                      {/* Badges các ngày trong tuần của kiểu này */}
                      <div className="flex flex-wrap gap-1 my-2">
                        {(preset.days || []).map((d) => (
                          <span
                            key={d}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {preset.days?.length || 0} buổi × {preset.hours_per_session}h ={" "}
                        <strong className="text-indigo-600 dark:text-indigo-400 font-black">{calcTotalH}h / tuần</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Khung giờ vào lớp & Ma trận chi tiết */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                  Khung giờ vào lớp mỗi buổi:
                </label>
                <input
                  type="text"
                  value={fixedSessionTime}
                  onChange={(e) => setFixedSessionTime(e.target.value)}
                  placeholder="18:00 - 19:30"
                  className="w-full px-3 py-2 text-xs font-bold font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Đã tự động tính theo kiểu lịch ({sessionHours}h/buổi), có thể điều chỉnh giờ nếu ca học lệch
                </span>
              </div>

              {/* Thẻ Ma Trận Tính Toán Tự Động */}
              <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                    Ma trận thời lượng tự động:
                  </span>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {selectedDays.length} buổi × {sessionHours}h/buổi ={" "}
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {Math.round(selectedDays.length * sessionHours * 10) / 10} tiếng / tuần
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Ngày học: {selectedDays.join(", ") || "Chưa chọn"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">Quy đổi:</span>
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 font-mono">
                    {Math.round(selectedDays.length * sessionHours * 60)} phút / tuần
                  </span>
                </div>
              </div>
            </div>

            {/* CẢNH BÁO / THÔNG TIN SĨ SỐ CA HỌC CỦA LỚP */}
            {classCapacityCheck && (
              <div
                className={`p-3.5 rounded-2xl border transition ${
                  classCapacityCheck.isOverCapacity
                    ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800"
                    : classCapacityCheck.peakOccupiedCount >= classCapacityCheck.maxCapacity * 0.8
                    ? "bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                    : "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {classCapacityCheck.isOverCapacity ? (
                      <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block text-slate-900 dark:text-white">
                        Kiểm Tra Sĩ Số Ca Lớp Thực Tế
                      </span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300">
                        Khung giờ: <strong>{classCapacityCheck.timeRangeDisplay || fixedSessionTime || "18:00 - 19:30"}</strong> • Sĩ số tối đa: <strong>{classCapacityCheck.maxCapacity} HS / ca</strong>
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${
                      classCapacityCheck.isOverCapacity
                        ? "bg-rose-600 text-white shadow-xs"
                        : classCapacityCheck.peakOccupiedCount >= classCapacityCheck.maxCapacity * 0.8
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {classCapacityCheck.isOverCapacity
                      ? "⚠️ ĐÃ ĐẦY CA"
                      : `SĨ SỐ CA: ${classCapacityCheck.peakOccupiedCount}/${classCapacityCheck.maxCapacity} HS`}
                  </span>
                </div>

                {/* Danh sách sĩ số từng ngày đã chọn */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  {classCapacityCheck.dayDetails.map((dayItem) => {
                    const percent = Math.min(100, Math.round((dayItem.occupiedCount / (dayItem.maxCapacity || 1)) * 100));
                    return (
                      <div
                        key={dayItem.day}
                        className={`p-2 rounded-xl border text-[11px] flex flex-col justify-between ${
                          dayItem.isOverCapacity
                            ? "bg-rose-100/70 dark:bg-rose-900/50 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200"
                            : "bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span>{dayItem.day}</span>
                          <span className={`font-black ${dayItem.isOverCapacity ? "text-rose-600 dark:text-rose-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                            {dayItem.occupiedCount}/{dayItem.maxCapacity}
                          </span>
                        </div>

                        {/* Thanh phần trăm sĩ số */}
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              dayItem.isOverCapacity
                                ? "bg-rose-600"
                                : percent >= 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        <span className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                          {dayItem.isOverCapacity
                            ? "Hết chỗ nhận thêm"
                            : `Còn trống ${dayItem.remainingSlots} chỗ`}
                        </span>

                        {dayItem.overlappingStudents && dayItem.overlappingStudents.length > 0 && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-none">
                            {dayItem.overlappingStudents.map((st) => (
                              <span
                                key={st.id}
                                className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-full"
                                title={`${st.name} (${st.timeDetail || ""})`}
                              >
                                {st.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {classCapacityCheck.warningMessage && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5 bg-rose-100/50 dark:bg-rose-900/30 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/50">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{classCapacityCheck.warningMessage}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Discount Section */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Percent className="w-4 h-4 text-indigo-500" />
                  Áp Dụng Chiết Khấu / Giảm Giá
                </span>
                {!canManageTuition && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3" /> Cần quyền Học Phí để sửa
                  </span>
                )}
              </div>
              <label className={`relative inline-flex items-center ${canManageTuition ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                <input
                  type="checkbox"
                  disabled={!canManageTuition}
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
                      disabled={!canManageTuition}
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
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    disabled={!canManageTuition}
                    value={discountPercent || ""}
                    onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-16 px-2.5 py-1 text-xs font-black rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-xs font-bold text-slate-500">%</span>
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Lý do được giảm học phí:
                  </label>
                  <input
                    type="text"
                    disabled={!canManageTuition}
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="VD: Anh em ruột cùng học, Học sinh có hoàn cảnh khó khăn, Đăng ký sớm..."
                    className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Standard Tuition Live Preview */}
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {selectedPkg ? `Học phí dự tính (${selectedPkg.name}):` : "Học phí chuẩn tự tính (Mặc định):"}
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium block">
                Công thức: <strong className="text-indigo-600 dark:text-indigo-400">{!canViewTuition ? "••••••" : liveBreakdown.formulaText}</strong>
              </span>
              {selectedPkg && (
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
                  Chu kỳ: {selectedPkg.cycle_value} {selectedPkg.cycle_unit === "month" ? "tháng" : "tuần"}
                </span>
              )}
            </div>
            <div className="text-right shrink-0 pl-3">
              <span className="text-lg font-black text-indigo-700 dark:text-indigo-300 block">
                {!canViewTuition ? (
                  <span className="font-mono tracking-widest text-slate-400">•••••• đ</span>
                ) : (
                  formatVND(liveTuition)
                )}
              </span>
              <span className="text-[10px] font-bold text-slate-400">/ chu kỳ</span>
            </div>
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
              disabled={isSaving || Boolean(classCapacityCheck && classCapacityCheck.isOverCapacity)}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              {isSaving
                ? "Đang lưu..."
                : classCapacityCheck?.isOverCapacity
                ? "Ca học đã đầy"
                : studentToEdit
                ? "Lưu thay đổi"
                : "Tạo học sinh"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
