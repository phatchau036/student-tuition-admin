"use client";

import React, { useState, useMemo } from "react";
import { Student, Teacher, TimeSlot, Subject } from "@/lib/types";
import { parseStudentScheduleSlots } from "@/lib/tuition";
import {
  Calendar,
  Clock,
  GraduationCap,
  Users,
  Search,
  Filter,
  Layers,
  BookOpen,
  Printer,
  ChevronLeft,
  ChevronRight,
  Plus,
  Send,
  Eye,
  Sparkles,
  CheckCircle2,
  CalendarCheck,
  AlertCircle,
  Phone,
  MessageCircle,
  UserCheck,
  DollarSign,
  Maximize2,
  LayoutGrid,
  Columns,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface ClassroomScheduleMatrixProps {
  students: Student[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  subjects: Subject[];
  onSelectStudent: (student: Student) => void;
  onAddStudentToSlot?: (day: string, time: string, teacherId?: string, subjectId?: string) => void;
}

// Các thứ trong tuần chuẩn
const DAYS_OF_WEEK = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

// Các mốc giờ chính hiển thị (17h, 18h, 19h cho ca tối, 08h, 09h, 10h cho ca sáng cuối tuần)
const DEFAULT_HOURS = ["17h", "18h", "19h"];
const WEEKEND_HOURS = ["08h", "09h", "10h", "17h", "18h", "19h"];

// Màu badge bộ môn cho sinh động và dễ nhận diện
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  piano: { bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  guitar: { bg: "bg-amber-50 dark:bg-amber-950/40", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  organ: { bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  "thanh nhạc": { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
  vocal: { bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-300", border: "border-rose-200 dark:border-rose-800" },
  trống: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  drum: { bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
  default: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-300", border: "border-slate-200 dark:border-slate-700" },
};

function getSubjectBadge(subjectName?: string) {
  if (!subjectName) return SUBJECT_COLORS.default;
  const key = subjectName.toLowerCase();
  for (const k in SUBJECT_COLORS) {
    if (key.includes(k)) return SUBJECT_COLORS[k];
  }
  return SUBJECT_COLORS.default;
}

export const ClassroomScheduleMatrix: React.FC<ClassroomScheduleMatrixProps> = ({
  students,
  teachers,
  timeSlots,
  subjects,
  onSelectStudent,
  onAddStudentToSlot,
}) => {
  // Mode: "week_horizontal" (Dàn ngang toàn tuần) | "single_day" (Chọn xem chi tiết từng thứ) | "teacher_centric" (Xem theo từng giáo viên)
  const [viewMode, setViewMode] = useState<"week_horizontal" | "single_day" | "teacher_centric">("week_horizontal");
  const [activeDay, setActiveDay] = useState<string>("Thứ 2");
  const [selectedTeacherTab, setSelectedTeacherTab] = useState<string>("all");

  // Filters & Search
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>("all");
  const [selectedPaymentStatusFilter, setSelectedPaymentStatusFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hover preview student popover
  const [hoveredStudent, setHoveredStudent] = useState<{
    student: Student;
    timeDetail: string;
    subjectName: string;
    x: number;
    y: number;
  } | null>(null);

  // Lọc danh sách giáo viên đang hoạt động
  const activeTeachers = useMemo(() => {
    let list = teachers.filter((t) => t.is_active !== 0);
    if (selectedTeacherFilter !== "all") {
      list = list.filter((t) => t.id === selectedTeacherFilter);
    }
    return list;
  }, [teachers, selectedTeacherFilter]);

  // Danh sách các mốc giờ thực tế xuất hiện theo từng ngày (tự động mở rộng từ ca đăng ký và dữ liệu học sinh)
  const dayHoursMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const d of DAYS_OF_WEEK) {
      const isWeekend = d === "Thứ 7" || d === "Chủ Nhật";
      const baseHours = isWeekend ? ["08h", "09h", "10h", "17h", "18h", "19h"] : ["17h", "18h", "19h", "20h"];
      const hourSet = new Set<string>(baseHours);

      // Thêm các giờ từ timeSlots của cơ sở
      timeSlots.forEach((slot) => {
        if (slot.start_time) {
          const h = parseInt(slot.start_time.split(":")[0], 10);
          if (!isNaN(h)) hourSet.add(`${String(h).padStart(2, "0")}h`);
        }
      });

      // Thêm các giờ thực tế mà học sinh đang học
      students.forEach((st) => {
        if (st.status === "dropped") return;
        const slots = parseStudentScheduleSlots(st, teachers);
        slots.forEach((s) => {
          if (s.day === d && s.hourSlot) {
            hourSet.add(s.hourSlot);
          }
        });
      });

      map[d] = Array.from(hourSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    }
    return map;
  }, [students, timeSlots, teachers]);

  // Map học sinh vào ma trận 5 chiều: matrixData[day][hourSlot][teacherId] = StudentSlotEntry[]
  const matrixData = useMemo(() => {
    const data: Record<
      string,
      Record<
        string,
        Record<
          string,
          Array<{
            student: Student;
            timeDetail: string;
            subjectName: string;
          }>
        >
      >
    > = {};

    // Khởi tạo khung
    for (const d of DAYS_OF_WEEK) {
      data[d] = {};
      const hours = dayHoursMap[d] || (d === "Thứ 7" || d === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS);
      for (const h of hours) {
        data[d][h] = {};
        for (const tc of teachers) {
          data[d][h][tc.id] = [];
        }
        data[d][h]["unassigned"] = []; // Học sinh chưa gán giáo viên
      }
    }

    // Duyệt qua từng học sinh
    for (const st of students) {
      if (st.status === "dropped") continue;

      const parsedSlots = parseStudentScheduleSlots(st, teachers);

      for (const slot of parsedSlots) {
        const d = slot.day;
        const h = slot.hourSlot;
        // Ưu tiên giáo viên gán trong hồ sơ, nếu chưa có thì lấy giáo viên tự động nhận diện từ ghi chú/lịch học
        const resolvedTeacherId = st.teacher_id || slot.detectedTeacherId || "unassigned";

        if (data[d]) {
          if (!data[d][h]) {
            data[d][h] = {};
            for (const tc of teachers) {
              data[d][h][tc.id] = [];
            }
            data[d][h]["unassigned"] = [];
          }

          const targetTeacherId = data[d][h][resolvedTeacherId] ? resolvedTeacherId : "unassigned";
          const subName = slot.subjectName || st.subject_name || "Piano";

          data[d][h][targetTeacherId].push({
            student: st,
            timeDetail: slot.timeDetail,
            subjectName: subName,
          });
        }
      }
    }

    return data;
  }, [students, teachers, dayHoursMap]);

  // Bộ lọc tìm kiếm & trạng thái học sinh trong ma trận
  const isStudentMatched = (st: Student) => {
    if (selectedPaymentStatusFilter !== "all") {
      if (selectedPaymentStatusFilter === "paid" && st.payment_status !== "paid") return false;
      if (selectedPaymentStatusFilter === "unpaid" && st.payment_status === "paid") return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(q) ||
      (st.phone && st.phone.includes(q)) ||
      (st.subject_name && st.subject_name.toLowerCase().includes(q))
    );
  };

  const isSubjectMatched = (subName: string, studentSubId?: string) => {
    if (selectedSubjectFilter === "all") return true;
    const subObj = subjects.find((s) => s.id === selectedSubjectFilter);
    if (!subObj) return true;
    return (
      (subName && subName.toLowerCase() === subObj.name.toLowerCase()) ||
      studentSubId === selectedSubjectFilter
    );
  };

  // Tính toán nhanh tổng quan sĩ số toàn trường
  const overallStats = useMemo(() => {
    let totalSlots = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let unassignedCount = 0;

    for (const d of DAYS_OF_WEEK) {
      const hours = d === "Thứ 7" || d === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS;
      for (const h of hours) {
        if (!matrixData[d] || !matrixData[d][h]) continue;
        for (const tcId in matrixData[d][h]) {
          const entries = matrixData[d][h][tcId];
          totalSlots += entries.length;
          for (const item of entries) {
            if (item.student.payment_status === "paid") paidCount++;
            else unpaidCount++;
            if (tcId === "unassigned") unassignedCount++;
          }
        }
      }
    }

    return { totalSlots, paidCount, unpaidCount, unassignedCount };
  }, [matrixData]);

  // Render một cột ngày hoàn chỉnh (chuẩn hoá hiển thị card học sinh & thanh mốc giờ)
  const renderDayColumn = (dayName: string, isFullWidth: boolean = false) => {
    const hours = dayHoursMap[dayName] || (dayName === "Thứ 7" || dayName === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS);

    // Tính tổng sĩ số và chưa đóng của ngày này
    let dayTotalStudents = 0;
    let dayUnpaidStudents = 0;
    for (const h of hours) {
      if (matrixData[dayName] && matrixData[dayName][h]) {
        for (const tcId in matrixData[dayName][h]) {
          const entries = matrixData[dayName][h][tcId];
          dayTotalStudents += entries.length;
          dayUnpaidStudents += entries.filter((e) => e.student.payment_status !== "paid").length;
        }
      }
    }

    const isWeekend = dayName === "Thứ 7" || dayName === "Chủ Nhật";

    return (
      <div
        key={dayName}
        className={`bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col shrink-0 ${
          isFullWidth
            ? "w-full"
            : "min-w-[360px] max-w-[420px] flex-1"
        }`}
      >
        {/* Header Ngày - Gradient sang trọng, nhận diện rõ Thứ */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isWeekend
              ? "bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border-amber-200/80 dark:border-amber-900/40 text-amber-950 dark:text-amber-200"
              : "bg-gradient-to-r from-indigo-500/10 via-indigo-400/5 to-transparent border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm shadow-2xs ${
                isWeekend
                  ? "bg-amber-500 text-white"
                  : "bg-indigo-600 text-white"
              }`}
            >
              {dayName.replace("Thứ ", "T")}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                  {dayName}
                </span>
                {isWeekend && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                    Cuối tuần
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">{dayTotalStudents}</strong> lượt học
                </span>
                {dayUnpaidStudents > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {dayUnpaidStudents} chưa đóng
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAddStudentToSlot?.(dayName, isWeekend ? "09:00" : "18:00")}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-slate-700 transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
            title="Thêm học viên mới vào ngày này"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm vào {dayName}</span>
          </button>
        </div>

        {/* Cột Tên Giáo Viên (Table Header bên dưới tên thứ) */}
        <div className="grid grid-cols-12 bg-slate-900 dark:bg-slate-950 text-white text-[11px] font-extrabold border-b border-slate-800 text-center divide-x divide-slate-800">
          <div className="col-span-2 py-2.5 uppercase bg-slate-950 text-amber-400 font-black flex items-center justify-center tracking-wider">
            GIỜ
          </div>
          {activeTeachers.map((tc) => (
            <div
              key={tc.id}
              className="py-2.5 px-1 truncate flex flex-col items-center justify-center"
              style={{ width: `${100 / Math.max(1, activeTeachers.length)}%` }}
              title={`${tc.name} (${tc.specialty || "GV"})`}
            >
              <span className="truncate max-w-[90px]">{tc.name}</span>
            </div>
          ))}
          <div className="col-span-2 py-2.5 px-1 text-slate-400 font-bold truncate flex items-center justify-center" title="Học viên chưa phân công GV">
            Chưa gán GV
          </div>
        </div>

        {/* Lưới các ca giờ trong ngày */}
        <div className="divide-y divide-slate-200/90 dark:divide-slate-800/80 flex-1 bg-slate-50/30 dark:bg-slate-950/20">
          {hours.map((hour) => {
            const hourCells = matrixData[dayName]?.[hour] || {};

            return (
              <div
                key={hour}
                className="grid grid-cols-12 divide-x divide-slate-200/90 dark:divide-slate-800/80 min-h-[145px]"
              >
                {/* Cột Mốc Giờ to rõ, thẩm mỹ */}
                <div className="col-span-2 bg-gradient-to-b from-amber-50/80 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-950/20 p-2 flex flex-col items-center justify-center text-center select-none border-r border-amber-200/70 dark:border-amber-900/40">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 dark:bg-amber-400/10 flex items-center justify-center mb-1">
                    <Clock className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  </div>
                  <span className="text-xl font-black text-amber-950 dark:text-amber-300 tracking-tight leading-none">
                    {hour}
                  </span>
                  <span className="text-[10px] text-amber-800/80 dark:text-amber-400/70 font-bold mt-1 tracking-tighter">
                    {hour === "17h"
                      ? "17:00"
                      : hour === "18h"
                      ? "18:00"
                      : hour === "19h"
                      ? "19:00"
                      : hour === "08h"
                      ? "08:00"
                      : hour === "09h"
                      ? "09:00"
                      : "10:00"}
                  </span>
                </div>

                {/* Các ô Giáo viên phụ trách trong ca này */}
                {activeTeachers.map((tc) => {
                  const entries = (hourCells[tc.id] || []).filter(
                    (e) => isStudentMatched(e.student) && isSubjectMatched(e.subjectName, e.student.subject_id)
                  );
                  const maxCap = tc.max_students || 10;
                  const isFull = entries.length >= maxCap;
                  const isCrowded = entries.length >= maxCap * 0.8;
                  const subBadge = getSubjectBadge(tc.specialty);

                  return (
                    <div
                      key={tc.id}
                      className="p-1.5 flex flex-col justify-between hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition group relative"
                      style={{ width: `${100 / Math.max(1, activeTeachers.length)}%` }}
                    >
                      {/* Tiêu đề mini: Bộ môn & Tỉ lệ sĩ số */}
                      <div className="pb-1 mb-1 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span
                          className={`font-black text-[9px] uppercase px-1.5 py-0.2 rounded-md ${subBadge.bg} ${subBadge.text} border ${subBadge.border} truncate max-w-[65px]`}
                        >
                          {tc.specialty || "Piano"}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono font-black text-[10px] ${
                            isFull
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                              : isCrowded
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          }`}
                          title={`Sĩ số hiện tại: ${entries.length}/${maxCap} học viên`}
                        >
                          {entries.length}/{maxCap}
                        </span>
                      </div>

                      {/* Danh sách thẻ học viên trong ô ca dạy */}
                      <div className="space-y-1.5 flex-1 overflow-y-auto max-h-52 scrollbar-thin pr-0.5">
                        {entries.length === 0 ? (
                          <div className="h-full min-h-[70px] flex flex-col items-center justify-center text-[10px] text-slate-400 dark:text-slate-600 italic">
                            <span>- trống -</span>
                          </div>
                        ) : (
                          entries.map(({ student, timeDetail, subjectName }) => {
                            const isPaid = student.payment_status === "paid";
                            const studentSubBadge = getSubjectBadge(subjectName);

                            return (
                              <div
                                key={student.id}
                                onClick={() => onSelectStudent(student)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredStudent({
                                    student,
                                    timeDetail,
                                    subjectName,
                                    x: rect.right + 10,
                                    y: rect.top,
                                  });
                                }}
                                onMouseLeave={() => setHoveredStudent(null)}
                                className={`p-1.5 rounded-xl border text-left cursor-pointer transition-all duration-150 transform hover:-translate-y-0.5 hover:shadow-md relative ${
                                  isPaid
                                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500"
                                    : "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
                                }`}
                              >
                                {/* Dòng tên và trạng thái học phí */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                                    {student.name}
                                  </span>
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 shadow-2xs ${
                                      isPaid ? "bg-emerald-500" : "bg-rose-500 ring-2 ring-rose-200"
                                    }`}
                                    title={isPaid ? "Đã hoàn thành học phí" : "Chưa đóng học phí"}
                                  />
                                </div>

                                {/* Giờ học lệch / Bộ môn nếu có */}
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  {timeDetail ? (
                                    <span className="text-[9px] font-black text-amber-700 dark:text-amber-400 font-mono tracking-tight bg-amber-100/70 dark:bg-amber-950/60 px-1 py-0.2 rounded">
                                      {timeDetail}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                      chuẩn ca
                                    </span>
                                  )}

                                  {student.level_name && (
                                    <span className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[60px]">
                                      {student.level_name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Nút bấm Thêm nhanh vào ô */}
                      <button
                        type="button"
                        onClick={() => onAddStudentToSlot?.(dayName, `${hour.replace("h", "")}:00`, tc.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all w-full mt-1.5 py-1 text-[10px] font-extrabold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-center flex items-center justify-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Xếp học viên</span>
                      </button>
                    </div>
                  );
                })}

                {/* Cột Học viên chưa gán giáo viên trong ca này */}
                <div className="col-span-2 p-1.5 bg-amber-50/30 dark:bg-slate-900/40 flex flex-col justify-between">
                  <div className="pb-1 mb-1 border-b border-amber-200/60 dark:border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-amber-800 dark:text-amber-400 font-bold">Chờ xếp GV</span>
                    <span className="font-mono font-bold text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200">
                      {(hourCells["unassigned"] || []).length}
                    </span>
                  </div>

                  <div className="space-y-1 flex-1 overflow-y-auto max-h-52 scrollbar-thin">
                    {(hourCells["unassigned"] || [])
                      .filter((e) => isStudentMatched(e.student) && isSubjectMatched(e.subjectName, e.student.subject_id))
                      .map(({ student, timeDetail }) => (
                        <div
                          key={student.id}
                          onClick={() => onSelectStudent(student)}
                          className="p-1 rounded-lg border border-dashed border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/40 text-[11px] font-bold text-amber-950 dark:text-amber-200 hover:bg-amber-100 transition cursor-pointer shadow-2xs"
                        >
                          <div className="truncate">{student.name}</div>
                          {timeDetail && (
                            <div className="text-[9px] text-amber-700 font-mono">({timeDetail})</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      {/* Thanh Chỉ Số Tổng Quan & Bộ Điều Khiển Thao Tác (KPIs Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Tổng lượt học trong tuần */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Lượt Học / Tuần</div>
            <div className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              {overallStats.totalSlots} <span className="text-xs font-normal text-slate-500">lượt</span>
            </div>
          </div>
        </div>

        {/* Học phí đã hoàn thành */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã Đóng Phí</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">
              {overallStats.paidCount} <span className="text-xs font-normal text-slate-500">lượt</span>
            </div>
          </div>
        </div>

        {/* Chưa đóng học phí */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cần Đóng Phí</div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 leading-tight">
              {overallStats.unpaidCount} <span className="text-xs font-normal text-slate-500">lượt</span>
            </div>
          </div>
        </div>

        {/* Chưa phân công giáo viên */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chờ Xếp Giáo Viên</div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 leading-tight">
              {overallStats.unassignedCount} <span className="text-xs font-normal text-slate-500">em</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar Điều Khiển & Bộ Lọc Nhanh */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Left: 3 Chế độ xem Sơ đồ */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("week_horizontal")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "week_horizontal"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Toàn Tuần (Dàn Ngang)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("single_day")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "single_day"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Xem Theo Thứ</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("teacher_centric")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "teacher_centric"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Theo Giáo Viên</span>
            </button>
          </div>
        </div>

        {/* Right: Tìm kiếm, Bộ lọc môn học, Học phí, In sơ đồ */}
        <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {/* Ô tìm kiếm thông minh */}
          <div className="relative flex-1 sm:w-52">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tên, SĐT học viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Lọc Bộ Môn */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Tất cả Bộ môn</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Lọc Trạng Thái Học Phí */}
          <select
            value={selectedPaymentStatusFilter}
            onChange={(e) => setSelectedPaymentStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">Tất cả học phí</option>
            <option value="paid">✓ Đã đóng phí</option>
            <option value="unpaid">✗ Chưa đóng phí</option>
          </select>

          {/* Lọc Giáo Viên */}
          {viewMode !== "teacher_centric" && (
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            >
              <option value="all">Tất cả GV ({teachers.length})</option>
              {teachers.map((tc) => (
                <option key={tc.id} value={tc.id}>
                  {tc.name}
                </option>
              ))}
            </select>
          )}

          {/* Nút In Sơ Đồ Lớp Học */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
            title="In sơ đồ lớp học ra máy in hoặc lưu PDF"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ 1: DÀN NGANG TOÀN TUẦN (Thẩm mỹ & chuẩn xác như demo Google Sheets) */}
      {viewMode === "week_horizontal" && (
        <div className="overflow-x-auto pb-6 scrollbar-thin">
          <div className="flex items-start gap-4 min-w-max">
            {DAYS_OF_WEEK.map((d) => renderDayColumn(d, false))}
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 2: XEM THEO TỪNG THỨ (Rất gọn, tối ưu trên laptop & máy tính bảng) */}
      {viewMode === "single_day" && (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DAYS_OF_WEEK.map((d) => {
              const isActive = activeDay === d;
              const isWeekend = d === "Thứ 7" || d === "Chủ Nhật";

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? isWeekend
                        ? "bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105"
                        : "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-105"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{d}</span>
                </button>
              );
            })}
          </div>

          {/* Hiển thị cột ngày đang chọn ở kích thước rộng đầy đủ */}
          <div className="max-w-4xl mx-auto">
            {renderDayColumn(activeDay, true)}
          </div>
        </div>
      )}

      {/* CHẾ ĐỘ 3: THEO DÕI THEO TỪNG GIÁO VIÊN (Teacher-Centric View) */}
      {viewMode === "teacher_centric" && (
        <div className="space-y-4">
          {/* Tab chọn Giáo Viên */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedTeacherTab("all")}
              className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer ${
                selectedTeacherTab === "all"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              }`}
            >
              Tất cả Giáo Viên ({teachers.length})
            </button>
            {teachers.map((tc) => (
              <button
                key={tc.id}
                type="button"
                onClick={() => setSelectedTeacherTab(tc.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  selectedTeacherTab === tc.id
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>{tc.name}</span>
                <span className="text-[10px] opacity-75">({tc.specialty || "GV"})</span>
              </button>
            ))}
          </div>

          {/* Bảng danh sách các ca dạy của giáo viên đã chọn */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers
              .filter((t) => selectedTeacherTab === "all" || t.id === selectedTeacherTab)
              .map((tc) => {
                // Đếm tổng số học sinh phụ trách của giáo viên này
                let teacherTotalStudents = 0;
                for (const d of DAYS_OF_WEEK) {
                  const hours = d === "Thứ 7" || d === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS;
                  for (const h of hours) {
                    if (matrixData[d]?.[h]?.[tc.id]) {
                      teacherTotalStudents += matrixData[d][h][tc.id].length;
                    }
                  }
                }

                return (
                  <div
                    key={tc.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-sm hover:shadow-md transition space-y-3"
                  >
                    {/* Header Thầy Cô */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{tc.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold">
                            {tc.specialty || "Piano"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          SĐT: {tc.phone || "Chưa cập nhật"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                          {teacherTotalStudents}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Lượt học</div>
                      </div>
                    </div>

                    {/* Danh sách các ca có học sinh của Thầy Cô */}
                    <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                      {DAYS_OF_WEEK.map((d) => {
                        const hours = d === "Thứ 7" || d === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS;
                        const dayActiveHours = hours.filter(
                          (h) => (matrixData[d]?.[h]?.[tc.id] || []).length > 0
                        );

                        if (dayActiveHours.length === 0) return null;

                        return (
                          <div key={d} className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                            <div className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center justify-between">
                              <span>{d}</span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {dayActiveHours.length} ca dạy
                              </span>
                            </div>

                            <div className="space-y-1">
                              {dayActiveHours.map((h) => {
                                const studentsInSlot = matrixData[d][h][tc.id];
                                return (
                                  <div key={h} className="text-[11px] bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
                                    <div className="flex items-center justify-between font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                                      <span>Ca {h}</span>
                                      <span className="text-[10px] text-slate-400">
                                        {studentsInSlot.length}/{tc.max_students || 10} học viên
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {studentsInSlot.map(({ student, timeDetail }) => (
                                        <button
                                          key={student.id}
                                          type="button"
                                          onClick={() => onSelectStudent(student)}
                                          className={`text-[10px] px-2 py-0.5 rounded-lg border font-semibold transition cursor-pointer hover:border-indigo-400 ${
                                            student.payment_status === "paid"
                                              ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                                              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                                          }`}
                                          title="Bấm để xem hồ sơ học viên"
                                        >
                                          {student.name} {timeDetail && `(${timeDetail})`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Popover Hover Chi Tiết Học Viên (Nổi lên khi di chuột vào card học sinh) */}
      {hoveredStudent && (
        <div
          className="fixed z-50 bg-slate-900/95 dark:bg-slate-800/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md pointer-events-none w-64 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: Math.min(window.innerHeight - 180, Math.max(10, hoveredStudent.y - 10)),
            left: Math.min(window.innerWidth - 270, hoveredStudent.x),
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-extrabold text-sm text-amber-300 truncate">
              {hoveredStudent.student.name}
            </span>
            <span
              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                hoveredStudent.student.payment_status === "paid"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {hoveredStudent.student.payment_status === "paid" ? "Đã Đóng Phí" : "Chưa Đóng Phí"}
            </span>
          </div>

          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{hoveredStudent.student.phone || "Chưa có SĐT"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Môn: {hoveredStudent.subjectName} ({hoveredStudent.student.level_name || "Tiêu chuẩn"})</span>
            </div>
            {hoveredStudent.timeDetail && (
              <div className="flex items-center gap-1.5 text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                <span>Giờ học riêng: {hoveredStudent.timeDetail}</span>
              </div>
            )}
            {hoveredStudent.student.teacher_name && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>GV: {hoveredStudent.student.teacher_name}</span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-700/80 text-[10px] text-slate-400 italic flex items-center justify-between">
            <span>Bấm vào để xem & sửa hồ sơ</span>
            <ArrowRight className="w-3 h-3 text-indigo-400" />
          </div>
        </div>
      )}
    </div>
  );
};
