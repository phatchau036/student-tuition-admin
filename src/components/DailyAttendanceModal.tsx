"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Student, Teacher, ClassRoom, AttendanceRecordInput } from "@/lib/types";
import { getDayNameVi } from "@/lib/tuition";
import { isTimeOverlap } from "@/lib/shiftDetection";
import { useToast } from "@/components/Toast";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Star,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  BookOpen,
  Check,
  UserCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface DailyAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  teachers: Teacher[];
  students: Student[];
  schoolId?: string;
  onRefresh?: () => void;
}

export const DailyAttendanceModal: React.FC<DailyAttendanceModalProps> = ({
  isOpen,
  onClose,
  classes = [],
  teachers = [],
  students = [],
  schoolId,
  onRefresh,
}) => {
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [todayDateStr, setTodayDateStr] = useState<string>("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [attendanceMap, setAttendanceMap] = useState<
    Record<
      string,
      {
        status: "attended" | "absent_excused" | "absent_unexcused";
        teacher_notes: string;
        homework: string;
        rating: number;
        isMarked: boolean;
        created_by?: string;
      }
    >
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessShiftId, setSavedSuccessShiftId] = useState<string | null>(null);
  const [loadingAiKey, setLoadingAiKey] = useState<string | null>(null);

  // Initialize date on mount or when opening modal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const today = new Date().toISOString().slice(0, 10);
      setTodayDateStr(today);
      if (!selectedDate) {
        setSelectedDate(today);
      }
    }
  }, [isOpen]);

  // Load attendance data from backend when date changes
  const loadAttendance = async (dateStr: string) => {
    if (!dateStr) return;
    try {
      const q = schoolId ? `&school_id=${encodeURIComponent(schoolId)}` : "";
      const res = await fetch(`/api/admin/attendance?date=${dateStr}${q}`);
      const json = await res.json();
      if (json.success && json.data?.lessons_map) {
        const nextMap: Record<string, any> = {};
        for (const [key, lesson] of Object.entries(json.data.lessons_map as Record<string, any>)) {
          nextMap[key] = {
            status: lesson.status || "attended",
            teacher_notes: lesson.teacher_notes || "",
            homework: lesson.homework || "",
            rating: lesson.rating || 5,
            isMarked: true,
            created_by: lesson.created_by || "teacher",
          };
        }
        setAttendanceMap(nextMap);
      } else {
        setAttendanceMap({});
      }
    } catch {
      showToast("Không thể tải thông tin điểm danh của ngày!", "error");
    }
  };

  useEffect(() => {
    if (isOpen && selectedDate) {
      loadAttendance(selectedDate);
    }
  }, [isOpen, selectedDate, schoolId]);

  if (!isOpen) return null;

  const dateToUse = selectedDate || todayDateStr || "2026-11-08";
  const dayName = getDayNameVi(dateToUse);
  const [y, m, d] = dateToUse.split("-");
  const isToday = Boolean(todayDateStr && dateToUse === todayDateStr);

  const handleShiftDate = (offsetDays: number) => {
    const cur = new Date(dateToUse);
    cur.setDate(cur.getDate() + offsetDays);
    const ny = cur.getFullYear();
    const nm = String(cur.getMonth() + 1).padStart(2, "0");
    const nd = String(cur.getDate()).padStart(2, "0");
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  const handleUpdateRecord = (key: string, field: string, value: any) => {
    setAttendanceMap((prev) => {
      const current = prev[key] || {
        status: "attended",
        teacher_notes: "",
        homework: "",
        rating: 5,
        isMarked: false,
      };
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleAiSuggest = async (recordKey: string, studentName: string, subjectName?: string) => {
    const current = attendanceMap[recordKey] || {
      status: "attended",
      teacher_notes: "",
      homework: "",
      rating: 5,
      isMarked: false,
    };
    try {
      setLoadingAiKey(recordKey);
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_feedback",
          student_name: studentName,
          subject_name: subjectName || "Học viên",
          rating: current.rating || 5,
          keywords: current.teacher_notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendanceMap((prev) => ({
          ...prev,
          [recordKey]: {
            ...current,
            teacher_notes: data.teacher_notes || current.teacher_notes,
            homework: data.homework || current.homework,
          },
        }));
        showToast("AI đã gợi ý nhận xét và bài tập thành công!", "success");
      } else {
        showToast(data.message || "Chưa thể tạo gợi ý AI", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi gọi AI", "error");
    } finally {
      setLoadingAiKey(null);
    }
  };

  // Lọc ra các ca học mở trong ngày hôm nay theo các lớp
  const shiftsToday = (classes || [])
    .filter((cls) => cls && (selectedClassFilter === "all" || cls.id === selectedClassFilter))
    .flatMap((cls) => {
      let schList: Array<{ day: string; start_time: string; end_time: string }> = [];
      try {
        if (cls.schedule_json) {
          const parsed = JSON.parse(String(cls.schedule_json));
          if (Array.isArray(parsed)) schList = parsed;
        }
      } catch {}

      let assList: Array<{ teacher_id: string; day?: string; start_time: string; end_time: string; role?: string }> = [];
      try {
        if (cls.teacher_assignments_json) {
          const parsed = JSON.parse(String(cls.teacher_assignments_json));
          if (Array.isArray(parsed)) assList = parsed;
        }
      } catch {}

      // Lọc các ca trong ngày hôm nay
      const matchingSchedules = schList.filter(
        (sc) => sc && (!sc.day || sc.day === "Tất cả các ngày" || sc.day === dayName || (typeof sc.day === "string" && sc.day.includes(dayName)))
      );

      return matchingSchedules.map((sc) => {
        // Tìm giáo viên phụ trách ca này
        const matchedAss = assList.find(
          (a) =>
            a &&
            (!a.day || a.day === "Tất cả các ngày" || (typeof a.day === "string" && a.day.includes(dayName))) &&
            isTimeOverlap(sc.start_time, sc.end_time, a.start_time, a.end_time)
        );
        let teacherName = cls.teacher_name || "Chưa phân công";
        let teacherId = cls.teacher_id;
        if (matchedAss && matchedAss.teacher_id) {
          const tc = (teachers || []).find((t) => t && t.id === matchedAss.teacher_id);
          if (tc) {
            teacherName = tc.name;
            teacherId = tc.id;
          }
        } else if (cls.teacher_id) {
          const tc = (teachers || []).find((t) => t && t.id === cls.teacher_id);
          if (tc) teacherName = tc.name;
        }

        // Lọc học sinh trong lớp học vào ngày này
        const classStudents = (students || []).filter((st) => {
          if (!st) return false;
          if (st.class_id !== cls.id && (!cls.teacher_id || st.teacher_id !== cls.teacher_id)) return false;
          if (st.status === "dropped") return false;

          let hasCustomSchedule = false;
          // Kiểm tra ngày học
          if (st.schedule_details_json) {
            try {
              const items = JSON.parse(String(st.schedule_details_json));
              if (Array.isArray(items) && items.length > 0) {
                hasCustomSchedule = true;
                if (items.some((it: any) => it && it.day === dayName)) return true;
              }
            } catch {}
          }
          if (st.registered_days && typeof st.registered_days === "string" && st.registered_days.trim()) {
            hasCustomSchedule = true;
            if (st.registered_days.includes(dayName)) return true;
          }
          // Nếu học sinh học chung theo lịch lớp
          return !hasCustomSchedule;
        });

        return {
          id: `shift-${cls.id}-${dayName}-${sc.start_time}-${sc.end_time}`,
          class_id: cls.id,
          class_name: cls.name,
          room: cls.room,
          start_time: sc.start_time,
          end_time: sc.end_time,
          teacher_name: teacherName,
          teacher_id: teacherId,
          students: classStudents,
        };
      });
    });

  const handleSaveShiftAttendance = async (
    shiftId: string,
    shiftClassId: string,
    shiftTeacherId: string | undefined,
    shiftStartTime: string,
    shiftStudents: Student[]
  ) => {
    if (shiftStudents.length === 0) return;
    try {
      setIsSaving(true);
      const recordsToSave: AttendanceRecordInput[] = shiftStudents.map((st) => {
        const key = `${st.id}_${shiftStartTime}`;
        const rec = attendanceMap[key] || {
          status: "attended",
          teacher_notes: "",
          homework: "",
          rating: 5,
        };
        return {
          student_id: st.id,
          class_id: shiftClassId,
          start_time: shiftStartTime,
          planned_minutes: 90,
          status: rec.status,
          teacher_notes: rec.teacher_notes,
          homework: rec.homework,
          rating: rec.rating,
        };
      });

      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateToUse,
          records: recordsToSave,
          school_id: schoolId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setSavedSuccessShiftId(shiftId);
        setTimeout(() => setSavedSuccessShiftId(null), 3000);
        loadAttendance(dateToUse);
        onRefresh?.();
      } else {
        showToast(json.message || "Lưu điểm danh thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Điểm Danh & Sổ Bài Học Hàng Ngày
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin hoặc Giáo viên đều có thể điểm danh và cập nhật lời nhận xét buổi học
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: Date Navigation & Class Filter */}
        <div className="p-4 sm:px-6 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* Bộ chọn ngày */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
              title="Lùi 1 ngày"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={dateToUse}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
            />

            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer"
              title="Tiến 1 ngày"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && todayDateStr && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayDateStr)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
              >
                Hôm nay
              </button>
            )}

            <span className="text-xs font-black text-slate-900 dark:text-white px-2 py-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {dayName}, {d}/{m}/{y}
            </span>
          </div>

          {/* Lọc theo lớp học */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Lớp:</span>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">-- Tất cả các lớp ({classes.length}) --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content: Danh sách ca và học sinh */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {shiftsToday.length === 0 ? (
            <div className="py-16 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Không có ca học nào diễn ra vào {dayName} ({d}/{m}/{y})
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy dùng bộ chọn ngày ở trên để chọn ngày có ca học hoặc kiểm tra lại thời khóa biểu trong Quản Lý Lớp Học.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {shiftsToday.map((shift) => {
                const isSaved = savedSuccessShiftId === shift.id;

                return (
                  <div
                    key={shift.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4"
                  >
                    {/* Header ca học */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                            <Clock className="w-3.5 h-3.5" />
                            {shift.start_time} - {shift.end_time}
                          </span>
                          <strong className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {shift.class_name}
                          </strong>
                          {shift.room && (
                            <span className="text-xs text-slate-500 font-medium">📍 {shift.room}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Giáo viên đứng ca: <strong>{shift.teacher_name}</strong>
                        </p>
                      </div>

                      <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {shift.students.length} học viên trong ca
                      </span>
                    </div>

                    {/* Danh sách học sinh trong ca */}
                    {shift.students.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        Chưa có học sinh nào đăng ký ca học này vào {dayName}.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {shift.students.map((st) => {
                          const recordKey = `${st.id}_${shift.start_time}`;
                          const currentRec = attendanceMap[recordKey] || {
                            status: "attended",
                            teacher_notes: "",
                            homework: "",
                            rating: 5,
                            isMarked: false,
                          };

                          return (
                            <div
                              key={st.id}
                              className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-3"
                            >
                              {/* Header học sinh & Huy hiệu đã điểm danh */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-black flex items-center justify-center text-xs">
                                    {(st.name || "H").slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <strong className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                                        {st.name || "Học sinh"}
                                      </strong>
                                      {st.student_code && (
                                        <code className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700">
                                          {st.student_code}
                                        </code>
                                      )}
                                      {/* Huy hiệu thông báo nếu đã điểm danh ngày hôm đó */}
                                      {currentRec.isMarked ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                          <Check className="w-3 h-3" />
                                          <span>
                                            Đã điểm danh:{" "}
                                            {currentRec.status === "attended"
                                              ? "Có mặt"
                                              : currentRec.status === "absent_excused"
                                              ? "Vắng có phép"
                                              : "Không phép"}
                                          </span>
                                          <span className="text-[9px] opacity-75">
                                            ({currentRec.created_by === "admin" ? "bởi Quản lý" : "bởi Giáo viên"})
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                          Chưa điểm danh
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-400">
                                      SĐT: {st.phone} {st.level_name && `• Level: ${st.level_name}`}
                                    </p>
                                  </div>
                                </div>

                                {/* Đánh giá sao 1 -> 5 */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:inline">
                                    Đánh giá:
                                  </span>
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() => handleUpdateRecord(recordKey, "rating", star)}
                                      className="p-0.5 transition hover:scale-110 cursor-pointer"
                                    >
                                      <Star
                                        className={`w-4 h-4 ${
                                          star <= currentRec.rating
                                            ? "text-amber-400 fill-amber-400"
                                            : "text-slate-300 dark:text-slate-600"
                                        }`}
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Bộ chọn 3 trạng thái: Có mặt / Vắng có phép / Không phép (LUÔN MỞ, KHÔNG KHÓA NÚT) */}
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateRecord(recordKey, "status", "attended")}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                    currentRec.status === "attended"
                                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-emerald-50"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Có mặt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUpdateRecord(recordKey, "status", "absent_excused")}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                    currentRec.status === "absent_excused"
                                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50"
                                  }`}
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Vắng có phép</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUpdateRecord(recordKey, "status", "absent_unexcused")}
                                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                                    currentRec.status === "absent_unexcused"
                                      ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50"
                                  }`}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Không phép</span>
                                </button>
                              </div>

                              {/* Tiêu đề & Nút AI Gợi Ý */}
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  Nhận xét & Dặn dò bài tập:
                                </span>
                                <button
                                  type="button"
                                  disabled={loadingAiKey === recordKey}
                                  onClick={() => handleAiSuggest(recordKey, st.name, st.subject_name || shift.class_name)}
                                  className="flex items-center gap-1 px-2.5 py-0.5 text-[10.5px] font-bold rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 hover:from-purple-100 hover:to-indigo-100 transition shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                                  title="Bấm để AI tự động soạn nhận xét sư phạm và dặn dò bài tập về nhà"
                                >
                                  <Sparkles className={`w-3 h-3 text-amber-500 ${loadingAiKey === recordKey ? "animate-spin" : ""}`} />
                                  <span>{loadingAiKey === recordKey ? "AI đang viết..." : "✨ AI Gợi ý"}</span>
                                </button>
                              </div>

                              {/* Ô Nhận xét & Bài tập về nhà (LUÔN CHO PHÉP NHẬP / BỔ SUNG) */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <input
                                    type="text"
                                    value={currentRec.teacher_notes}
                                    onChange={(e) => handleUpdateRecord(recordKey, "teacher_notes", e.target.value)}
                                    placeholder="Nhận xét tiến bộ của học viên..."
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={currentRec.homework}
                                    onChange={(e) => handleUpdateRecord(recordKey, "homework", e.target.value)}
                                    placeholder="Dặn dò bài tập về nhà..."
                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Nút lưu ca học */}
                    {shift.students.length > 0 && (
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                        <div>
                          {isSaved && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                              <Check className="w-4 h-4" /> Đã lưu điểm danh ca này thành công!
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            handleSaveShiftAttendance(
                              shift.id,
                              shift.class_id,
                              shift.teacher_id,
                              shift.start_time,
                              shift.students
                            )
                          }
                          className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? "Đang lưu..." : "Lưu Điểm Danh & Nhận Xét Ca Này"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
