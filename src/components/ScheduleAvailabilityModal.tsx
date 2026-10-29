"use client";

import React, { useState, useMemo } from "react";
import { Student, Teacher, TimeSlot, Subject } from "@/lib/types";
import { parseStudentScheduleSlots } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Sparkles,
  Users,
  User,
  BookOpen,
  Filter,
  X,
  MessageSquare,
  ArrowRight,
  Plus,
  Calendar,
  Send,
} from "lucide-react";

interface ScheduleAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  subjects: Subject[];
  onSelectSlotToEnroll?: (day: string, time: string, teacherId?: string, subjectId?: string) => void;
}

const DAYS_OF_WEEK = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

const DEFAULT_HOURS = ["17h", "18h", "19h", "20h"];
const WEEKEND_HOURS = ["08h", "09h", "10h", "11h", "17h", "18h", "19h", "20h"];

interface SlotVacancy {
  day: string;
  hour: string;
  timeRange: string;
  teacherId: string;
  teacherName: string;
  teacherSpecialty: string;
  occupied: number;
  capacity: number;
  remaining: number;
  students: string[];
}

export const ScheduleAvailabilityModal: React.FC<ScheduleAvailabilityModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers,
  timeSlots,
  subjects,
  onSelectSlotToEnroll,
}) => {
  const { showToast } = useToast();

  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [onlySpacious, setOnlySpacious] = useState<boolean>(false); // Chỉ hiện ca còn >= 3 chỗ
  const [isCopied, setIsCopied] = useState(false);

  // Lọc danh sách giáo viên đang hoạt động
  const activeTeachers = useMemo(() => {
    return teachers.filter((t) => t.is_active !== 0);
  }, [teachers]);

  // Danh sách các mốc giờ có mở ca
  const dayHoursMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const d of DAYS_OF_WEEK) {
      const isWeekend = d === "Thứ 7" || d === "Chủ Nhật";
      const baseHours = isWeekend ? WEEKEND_HOURS : DEFAULT_HOURS;
      const hourSet = new Set<string>(baseHours);

      timeSlots.forEach((slot) => {
        if (slot.start_time) {
          const h = parseInt(slot.start_time.split(":")[0], 10);
          if (!isNaN(h)) hourSet.add(`${String(h).padStart(2, "0")}h`);
        }
      });

      map[d] = Array.from(hourSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    return map;
  }, [timeSlots]);

  // Tính toán chi tiết từng ô và số chỗ còn trống
  const vacanciesByDay = useMemo(() => {
    // 1. Map học sinh vào ô [day][hour][teacherId]
    const occupancy: Record<string, Record<string, Record<string, Student[]>>> = {};

    for (const d of DAYS_OF_WEEK) {
      occupancy[d] = {};
      const hours = dayHoursMap[d] || DEFAULT_HOURS;
      for (const h of hours) {
        occupancy[d][h] = {};
        for (const tc of activeTeachers) {
          occupancy[d][h][tc.id] = [];
        }
      }
    }

    // Điền học sinh
    for (const st of students) {
      if (st.status === "dropped") continue;
      const slots = parseStudentScheduleSlots(st, activeTeachers);

      for (const slot of slots) {
        const d = slot.day;
        const h = slot.hourSlot;
        const tId = st.teacher_id || slot.detectedTeacherId;

        if (occupancy[d] && tId && occupancy[d][h] && occupancy[d][h][tId]) {
          occupancy[d][h][tId].push(st);
        }
      }
    }

    // 2. Tổng hợp danh sách ca còn chỗ theo từng thứ
    const result: Record<string, SlotVacancy[]> = {};

    for (const d of DAYS_OF_WEEK) {
      result[d] = [];
      const hours = dayHoursMap[d] || DEFAULT_HOURS;

      for (const h of hours) {
        const hNum = parseInt(h.replace("h", ""), 10);
        const timeRange = `${String(hNum).padStart(2, "0")}:00 - ${String(hNum + 1).padStart(2, "0")}:00`;

        for (const tc of activeTeachers) {
          // Lọc theo bộ môn nếu có chọn
          if (selectedSubject !== "all") {
            const subObj = subjects.find((s) => s.id === selectedSubject);
            const subName = subObj?.name?.toLowerCase() || "";
            const tcSpec = (tc.specialty || "").toLowerCase();
            if (subName && !tcSpec.includes(subName) && !subName.includes(tcSpec)) {
              continue;
            }
          }

          // Lọc theo giáo viên nếu có chọn
          if (selectedTeacher !== "all" && tc.id !== selectedTeacher) {
            continue;
          }

          const currentStudents = occupancy[d]?.[h]?.[tc.id] || [];
          const occupiedCount = currentStudents.length;
          const capacity = tc.max_students || 10;
          const remaining = Math.max(0, capacity - occupiedCount);

          // Chỉ lấy các ca CÒN CHỖ TRỐNG
          if (remaining > 0) {
            if (onlySpacious && remaining < 3) {
              continue;
            }

            result[d].push({
              day: d,
              hour: h,
              timeRange,
              teacherId: tc.id,
              teacherName: tc.name,
              teacherSpecialty: tc.specialty || "Piano",
              occupied: occupiedCount,
              capacity,
              remaining,
              students: currentStudents.map((s) => s.name),
            });
          }
        }
      }
    }

    return result;
  }, [students, activeTeachers, dayHoursMap, selectedSubject, selectedTeacher, onlySpacious, subjects]);

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

  // Tạo nội dung văn bản tư vấn nhanh cho Zalo / Điện thoại
  const consultationText = useMemo(() => {
    const subName = selectedSubject !== "all"
      ? subjects.find((s) => s.id === selectedSubject)?.name || "Bộ môn"
      : "các bộ môn";

    let text = `Dạ Trung Tâm xin gửi Quý Phụ Huynh thông tin các khung giờ học [${subName}] hiện đang CÒN CHỖ:\n\n`;

    const daysToInclude = selectedDay === "all" ? DAYS_OF_WEEK : [selectedDay];
    let hasAny = false;

    for (const d of daysToInclude) {
      const list = vacanciesByDay[d] || [];
      if (list.length === 0) continue;
      hasAny = true;

      text += `📅 ${d.toUpperCase()}:\n`;
      // Gom nhóm theo ca giờ
      const groupedByHour: Record<string, SlotVacancy[]> = {};
      for (const item of list) {
        if (!groupedByHour[item.hour]) groupedByHour[item.hour] = [];
        groupedByHour[item.hour].push(item);
      }

      for (const h in groupedByHour) {
        const slotsInHour = groupedByHour[h];
        const details = slotsInHour
          .map((s) => `${s.teacherName} (${s.teacherSpecialty}): Còn ${s.remaining} chỗ`)
          .join(" | ");
        text += ` • Ca ${h} (${slotsInHour[0].timeRange}): ${details}\n`;
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
      showToast("Đã sao chép nội dung tư vấn! Bạn có thể dán (Ctrl+V) gửi phụ huynh qua Zalo ngay.", "success");
      setTimeout(() => setIsCopied(false), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Kết Luận Ca Trống & Tư Vấn Tuyển Sinh Nhanh</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Xem nhanh thứ mấy giờ nào còn chỗ theo từng Thầy Cô để tư vấn phụ huynh trong 1 giây
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
                    {tc.name} ({tc.specialty || "GV"})
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
            <span className="text-slate-400 italic">Bấm &quot;+ Xếp học viên&quot; để ghi danh nhanh vào đúng ca</span>
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
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold">Đầy ca</span>
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
                    {list.map((item, idx) => (
                      <div
                        key={`${item.day}-${item.hour}-${item.teacherId}-${idx}`}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-indigo-400 transition flex flex-col justify-between space-y-2 group"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              Ca {item.hour} ({item.timeRange})
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              Còn {item.remaining} chỗ
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1.5 font-medium">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span>
                              <strong>{item.teacherName}</strong> ({item.teacherSpecialty})
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Hiện có: {item.occupied}/{item.capacity} học viên
                          </div>
                        </div>

                        {/* Nút xếp học viên nhanh vào đúng ca này */}
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectSlotToEnroll?.(
                              item.day,
                              `${item.hour.replace("h", "")}:00`,
                              item.teacherId
                            );
                          }}
                          className="w-full py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 text-[11px] font-black transition flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ghi danh vào ca này</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Dữ liệu được tính toán theo thời gian thực dựa trên sĩ số học sinh đang học của từng giáo viên.
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
