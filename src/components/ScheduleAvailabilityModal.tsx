"use client";

import React, { useState, useMemo } from "react";
import { Student, Teacher, TimeSlot, Subject, ClassRoom, DAYS_OF_WEEK } from "@/lib/types";
import { timeToMinutes } from "@/lib/shiftDetection";
import { useToast } from "@/components/Toast";
import {
  CalendarCheck,
  Clock,
  Copy,
  Check,
  Sparkles,
  User,
  BookOpen,
  X,
  MessageSquare,
  Plus,
  Calendar,
  Layers,
  Building2,
  Users,
} from "lucide-react";

interface ScheduleAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers: Teacher[];
  classes?: ClassRoom[];
  timeSlots?: TimeSlot[];
  subjects: Subject[];
  onSelectSlotToEnroll?: (
    day: string,
    time: string,
    teacherId?: string,
    subjectId?: string,
    classId?: string
  ) => void;
}

export interface SlotVacancy {
  id: string;
  day: string;
  hour: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  classId?: string;
  className: string;
  classCode?: string;
  room?: string;
  subjectId?: string;
  subjectName: string;
  teacherId?: string;
  teacherName: string;
  teacherSpecialty?: string;
  role?: string;
  occupied: number;
  capacity: number;
  remaining: number;
  students: string[];
}

function isTimeOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return Math.max(start1, start2) < Math.min(end1, end2);
}

export const ScheduleAvailabilityModal: React.FC<ScheduleAvailabilityModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers,
  classes = [],
  timeSlots = [],
  subjects,
  onSelectSlotToEnroll,
}) => {
  const { showToast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [onlySpacious, setOnlySpacious] = useState<boolean>(false); // Chỉ hiện ca còn >= 3 chỗ
  const [isCopied, setIsCopied] = useState(false);

  // Lọc danh sách giáo viên đang hoạt động
  const activeTeachers = useMemo(() => {
    return teachers.filter((t) => t.is_active !== 0);
  }, [teachers]);

  const teacherMap = useMemo(() => {
    return new Map(teachers.map((t) => [t.id, t]));
  }, [teachers]);

  const subjectMap = useMemo(() => {
    return new Map(subjects.map((s) => [s.id, s.name]));
  }, [subjects]);

  // ⭐ TÍNH TOÁN DANH SÁCH CA TRỐNG CHUẨN XÁC THEO LỚP HỌC & CA PHÂN CÔNG
  const vacanciesByDay = useMemo(() => {
    const result: Record<string, SlotVacancy[]> = {};
    for (const d of DAYS_OF_WEEK) {
      result[d] = [];
    }

    const activeStudents = students.filter((s) => s.status !== "dropped");

    // TRƯỜNG HỢP 1: TÍNH THEO HỆ THỐNG LỚP HỌC (Mô hình chuẩn của cơ sở)
    if (classes.length > 0) {
      for (const cls of classes) {
        if (cls.status === "closed") continue;

        // Bộ lọc lớp học
        if (selectedClass !== "all" && cls.id !== selectedClass) continue;

        // Bộ lọc bộ môn
        if (selectedSubject !== "all" && cls.subject_id !== selectedSubject) continue;

        let schList: Array<{ day: string; start_time: string; end_time: string }> = [];
        try {
          if (cls.schedule_json) schList = JSON.parse(cls.schedule_json);
        } catch {}

        let assList: Array<{
          id?: string;
          teacher_id: string;
          day?: string;
          start_time: string;
          end_time: string;
          role?: string;
        }> = [];
        try {
          if (cls.teacher_assignments_json) assList = JSON.parse(cls.teacher_assignments_json);
        } catch {}

        const clsCapacity = Number(cls.max_students) || 15;
        const clsSubName = cls.subject_name || (cls.subject_id ? subjectMap.get(cls.subject_id) : "") || "Piano";

        for (const day of DAYS_OF_WEEK) {
          // Lớp có mở cửa vào ngày này không?
          const isOpenToday = schList.some(
            (s) => !s.day || s.day === "Tất cả các ngày" || s.day === day
          );
          if (!isOpenToday) continue;

          // Lọc các ca phân công trong ngày này
          const dayAss = assList.filter(
            (a) => !a.day || a.day === "Tất cả các ngày" || a.day.includes(day)
          );

          if (dayAss.length > 0) {
            // Có phân công ca cụ thể cho từng giáo viên trong lớp
            for (const ass of dayAss) {
              if (selectedTeacher !== "all" && ass.teacher_id !== selectedTeacher) {
                continue;
              }

              const tc = teacherMap.get(ass.teacher_id);
              const matchedStudents: string[] = [];

              for (const st of activeStudents) {
                if (st.class_id === cls.id) {
                  let match = false;
                  if (st.schedule_details_json) {
                    try {
                      const items = JSON.parse(st.schedule_details_json);
                      const dayItem = items.find((it: any) => it.day === day);
                      if (dayItem && dayItem.start_time) {
                        const sEnd = dayItem.end_time || dayItem.start_time;
                        if (isTimeOverlap(dayItem.start_time, sEnd, ass.start_time, ass.end_time)) {
                          match = true;
                        }
                      }
                    } catch {}
                  }

                  if (!match && st.registered_days && st.registered_days.includes(day)) {
                    if (st.study_time_detail) {
                      const range = st.study_time_detail.match(
                        /(\d{1,2}):(\d{2})\s*[-–to~]\s*(\d{1,2}):(\d{2})/
                      );
                      if (range) {
                        const sStart = `${range[1]}:${range[2]}`;
                        const sEnd = `${range[3]}:${range[4]}`;
                        if (isTimeOverlap(sStart, sEnd, ass.start_time, ass.end_time)) {
                          match = true;
                        }
                      }
                    } else {
                      match = true;
                    }
                  }

                  if (match) {
                    matchedStudents.push(st.name);
                  }
                }
              }

              const occupied = matchedStudents.length;
              const remaining = Math.max(0, clsCapacity - occupied);

              if (remaining > 0) {
                if (onlySpacious && remaining < 3) continue;

                result[day].push({
                  id: `vac-${cls.id}-${day}-${ass.start_time}-${ass.teacher_id}`,
                  day,
                  hour: ass.start_time.split(":")[0] + "h",
                  startTime: ass.start_time,
                  endTime: ass.end_time,
                  timeRange: `${ass.start_time} - ${ass.end_time}`,
                  classId: cls.id,
                  className: cls.name,
                  classCode: cls.code,
                  room: cls.room,
                  subjectId: cls.subject_id,
                  subjectName: clsSubName,
                  teacherId: ass.teacher_id,
                  teacherName: tc ? tc.name : "Giáo viên",
                  teacherSpecialty: tc?.specialty || clsSubName,
                  role: ass.role || "Đứng lớp",
                  occupied,
                  capacity: clsCapacity,
                  remaining,
                  students: matchedStudents,
                });
              }
            }
          } else {
            // Lớp mở chung ca theo schedule_json và giáo viên chủ nhiệm
            const daySchedules = schList.filter(
              (s) => !s.day || s.day === "Tất cả các ngày" || s.day === day
            );

            for (const s of daySchedules) {
              if (selectedTeacher !== "all" && cls.teacher_id && cls.teacher_id !== selectedTeacher) {
                continue;
              }

              const tc = cls.teacher_id ? teacherMap.get(cls.teacher_id) : undefined;
              const matchedStudents: string[] = [];

              for (const st of activeStudents) {
                if (st.class_id === cls.id) {
                  let match = false;
                  if (st.schedule_details_json) {
                    try {
                      const items = JSON.parse(st.schedule_details_json);
                      const dayItem = items.find((it: any) => it.day === day);
                      if (dayItem && dayItem.start_time) {
                        const sEnd = dayItem.end_time || dayItem.start_time;
                        if (isTimeOverlap(dayItem.start_time, sEnd, s.start_time, s.end_time)) {
                          match = true;
                        }
                      }
                    } catch {}
                  }

                  if (!match && st.registered_days && st.registered_days.includes(day)) {
                    match = true;
                  }

                  if (match) matchedStudents.push(st.name);
                }
              }

              const occupied = matchedStudents.length;
              const remaining = Math.max(0, clsCapacity - occupied);

              if (remaining > 0) {
                if (onlySpacious && remaining < 3) continue;

                result[day].push({
                  id: `vac-${cls.id}-${day}-${s.start_time}`,
                  day,
                  hour: s.start_time.split(":")[0] + "h",
                  startTime: s.start_time,
                  endTime: s.end_time,
                  timeRange: `${s.start_time} - ${s.end_time}`,
                  classId: cls.id,
                  className: cls.name,
                  classCode: cls.code,
                  room: cls.room,
                  subjectId: cls.subject_id,
                  subjectName: clsSubName,
                  teacherId: cls.teacher_id,
                  teacherName: tc ? tc.name : "Chưa gán GV",
                  teacherSpecialty: tc?.specialty || clsSubName,
                  role: "Chủ nhiệm / Đứng lớp",
                  occupied,
                  capacity: clsCapacity,
                  remaining,
                  students: matchedStudents,
                });
              }
            }
          }
        }
      }
    } else {
      // TRƯỜNG HỢP 2: FALLBACK TÍNH THEO CA CỦA TIME SLOTS / GIÁO VIÊN NẾU CƠ SỞ CHƯA TẠO LỚP
      for (const d of DAYS_OF_WEEK) {
        for (const slot of timeSlots) {
          if (!slot.start_time) continue;
          const sStart = slot.start_time;
          const sEnd = slot.end_time || "20:00";
          const slotCapacity = slot.max_students || 10;

          for (const tc of activeTeachers) {
            if (selectedTeacher !== "all" && tc.id !== selectedTeacher) continue;
            if (selectedSubject !== "all") {
              const subObj = subjects.find((s) => s.id === selectedSubject);
              if (subObj && tc.specialty && !tc.specialty.toLowerCase().includes(subObj.name.toLowerCase())) {
                continue;
              }
            }

            const matchedStudents: string[] = [];
            for (const st of activeStudents) {
              if (st.teacher_id === tc.id && st.registered_days && st.registered_days.includes(d)) {
                matchedStudents.push(st.name);
              }
            }

            const occupied = matchedStudents.length;
            const remaining = Math.max(0, slotCapacity - occupied);
            if (remaining > 0) {
              if (onlySpacious && remaining < 3) continue;

              result[d].push({
                id: `vac-slot-${slot.id}-${tc.id}-${d}`,
                day: d,
                hour: sStart.split(":")[0] + "h",
                startTime: sStart,
                endTime: sEnd,
                timeRange: `${sStart} - ${sEnd}`,
                className: "Ca mở cửa cơ sở",
                room: "",
                subjectName: tc.specialty || "Bộ môn",
                teacherId: tc.id,
                teacherName: tc.name,
                teacherSpecialty: tc.specialty || "GV",
                role: "Đứng ca",
                occupied,
                capacity: slotCapacity,
                remaining,
                students: matchedStudents,
              });
            }
          }
        }
      }
    }

    // Sắp xếp các ca trống trong ngày theo giờ bắt đầu tăng dần
    for (const d of DAYS_OF_WEEK) {
      result[d].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    }

    return result;
  }, [
    classes,
    students,
    activeTeachers,
    timeSlots,
    subjects,
    selectedSubject,
    selectedClass,
    selectedTeacher,
    onlySpacious,
    teacherMap,
    subjectMap,
  ]);

  // Tổng số ca trống tìm được
  const totalAvailableSlots = useMemo(() => {
    let count = 0;
    for (const d of DAYS_OF_WEEK) {
      if (selectedDay === "all" || selectedDay === d) {
        count += (vacanciesByDay[d] || []).length;
      }
    }
    return count;
  }, [vacanciesByDay, selectedDay]);

  // ⭐ MẪU TIN NHẮN TƯ VẤN ZALO / PHỤ HUYNH CHUẨN XÁC KÈM TÊN LỚP, PHÒNG & GIỜ
  const consultationText = useMemo(() => {
    const subName =
      selectedSubject !== "all"
        ? subjects.find((s) => s.id === selectedSubject)?.name || "Bộ môn"
        : "các bộ môn";

    let text = `Dạ Trung Tâm xin gửi Quý Phụ Huynh thông tin các lớp học [${subName}] hiện đang CÒN CHỖ:\n\n`;

    const daysToInclude = selectedDay === "all" ? DAYS_OF_WEEK : [selectedDay];
    let hasAny = false;

    for (const d of daysToInclude) {
      const list = vacanciesByDay[d] || [];
      if (list.length === 0) continue;
      hasAny = true;

      text += `📅 ${d.toUpperCase()}:\n`;
      for (const item of list) {
        const roomDesc = item.room ? ` (${item.room})` : "";
        const roleDesc = item.role ? ` - ${item.role}` : "";
        text += ` • ${item.timeRange} | ${item.className}${roomDesc} · GV: ${item.teacherName}${roleDesc} · Còn ${item.remaining} chỗ (Đang học: ${item.occupied}/${item.capacity})\n`;
      }
      text += `\n`;
    }

    if (!hasAny) {
      text += `Hiện các ca theo tiêu chí chọn đã kín chỗ, trung tâm sẽ sắp xếp lịch ưu tiên khi có học sinh đổi ca ạ!`;
    } else {
      text += `Quý Phụ Huynh muốn đăng ký cho bé vào khung giờ nào để trung tâm xếp lớp và giữ chỗ trước cho bé ạ?`;
    }

    return text.trim();
  }, [vacanciesByDay, selectedDay, selectedSubject, subjects]);

  const handleCopyConsultation = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(consultationText);
      setIsCopied(true);
      showToast(
        "Đã sao chép nội dung tư vấn! Bạn có thể dán (Ctrl+V) gửi phụ huynh qua Zalo ngay.",
        "success"
      );
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-linear-to-r from-amber-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Kết Luận Ca Trống & Tư Vấn Tuyển Sinh Nhanh</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tra cứu chính xác lớp học nào, thứ mấy, phòng nào và giáo viên nào đang còn chỗ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar Bộ Lọc Nhanh */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1">
            {/* Lọc Lớp Học */}
            {classes.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="bg-transparent outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">Tất cả Lớp học ({classes.length})</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.room ? `(${c.room})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Lọc Bộ Môn */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-transparent outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Tất cả Bộ môn</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Giáo Viên */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="bg-transparent outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Tất cả Giáo viên ({activeTeachers.length})</option>
                {activeTeachers.map((tc) => (
                  <option key={tc.id} value={tc.id}>
                    {tc.name} {tc.specialty ? `(${tc.specialty})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Thứ trong tuần */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent outline-none text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">Toàn bộ cả tuần</option>
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle chỉ ca còn nhiều chỗ */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={onlySpacious}
                onChange={(e) => setOnlySpacious(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Ưu tiên ca rộng (&ge; 3 chỗ)</span>
            </label>
          </div>

          {/* Nút Sao Chép Mẫu Tư Vấn Zalo */}
          <button
            type="button"
            onClick={handleCopyConsultation}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold flex items-center gap-2 shadow-md shadow-indigo-600/25 transition cursor-pointer active:scale-95 shrink-0"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? "Đã Sao Chép!" : "Copy Tin Nhắn Gửi Phụ Huynh"}</span>
          </button>
        </div>

        {/* Nội Dung: Danh Sách Kết Luận Ca Trống Theo Thứ */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Hộp xem trước tin nhắn tư vấn */}
          <div className="bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Nội Dung Tư Vấn Nhanh Phụ Huynh (Sẵn Sàng Gửi Zalo/SMS)</span>
              </span>
              <button
                type="button"
                onClick={handleCopyConsultation}
                className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Sao chép toàn bộ</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto scrollbar-thin">
              {consultationText}
            </pre>
          </div>

          {/* Thẻ Thống Kê Tổng Số Ca Trống */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800 dark:text-slate-200">
              Tìm thấy <span className="text-emerald-600 text-sm font-black">{totalAvailableSlots} ca</span> còn chỗ tiếp nhận học viên mới:
            </span>
            <span className="text-slate-400 italic">Bấm &quot;+ Ghi danh vào ca này&quot; để xếp đúng lớp và giờ học</span>
          </div>

          {/* Lưới các Ngày và Ca Trống Chi Tiết */}
          <div className="space-y-4">
            {DAYS_OF_WEEK.filter((d) => selectedDay === "all" || selectedDay === d).map((dayName) => {
              const list = vacanciesByDay[dayName] || [];
              const isWeekend = dayName === "Thứ 7" || dayName === "Chủ Nhật";

              if (list.length === 0) {
                return (
                  <div
                    key={dayName}
                    className="p-3.5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between"
                  >
                    <span className="font-bold">{dayName}: Hiện không có ca trống theo bộ lọc đã chọn</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">
                      Đầy ca
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={dayName}
                  className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-2xs space-y-3"
                >
                  {/* Tiêu đề Ngày */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white ${
                          isWeekend ? "bg-amber-500" : "bg-indigo-600"
                        }`}
                      >
                        {dayName.replace("Thứ ", "T")}
                      </span>
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        {dayName}
                      </span>
                      {isWeekend && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Cuối tuần
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Còn {list.length} ca có chỗ trống
                    </span>
                  </div>

                  {/* Danh sách các ca của ngày này */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {list.map((item) => {
                      const percent = Math.min(
                        100,
                        Math.round((item.occupied / (item.capacity || 15)) * 100)
                      );

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 hover:border-indigo-400 transition flex flex-col justify-between space-y-2.5 group"
                        >
                          <div className="space-y-1.5">
                            {/* Khung giờ & Chỗ còn */}
                            <div className="flex items-center justify-between">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                                <Clock className="w-3 h-3" />
                                {item.timeRange}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-mono">
                                Còn {item.remaining}/{item.capacity} chỗ
                              </span>
                            </div>

                            {/* Tên lớp & Phòng */}
                            <div className="pt-1 flex items-center justify-between gap-1 flex-wrap">
                              <strong className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1">
                                <Layers className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{item.className}</span>
                              </strong>
                              {item.room && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                  📍 {item.room}
                                </span>
                              )}
                            </div>

                            {/* Giáo viên đứng ca */}
                            <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <strong>{item.teacherName}</strong>
                              </span>
                              {item.role && (
                                <span className="text-[10px] font-bold text-slate-400">
                                  {item.role}
                                </span>
                              )}
                            </div>

                            {/* Bộ môn */}
                            <div className="text-[11px] text-slate-500 font-medium">
                              Môn: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.subjectName}</span>
                            </div>

                            {/* Thanh tiến độ sĩ số */}
                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${percent}%` }}
                                className={`h-full rounded-full transition-all duration-300 ${
                                  percent >= 80 ? "bg-amber-500" : percent > 0 ? "bg-emerald-600" : "bg-transparent"
                                }`}
                              />
                            </div>
                          </div>

                          {/* Nút xếp học viên nhanh vào đúng ca này */}
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectSlotToEnroll?.(
                                item.day,
                                item.startTime,
                                item.teacherId,
                                item.subjectId,
                                item.classId
                              );
                            }}
                            className="w-full py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 text-xs font-black transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ghi danh vào ca này</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Dữ liệu được đối soát theo thời gian thực dựa trên sĩ số học sinh và phân công ca giảng dạy của từng Lớp học.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
