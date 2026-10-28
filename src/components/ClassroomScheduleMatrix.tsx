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

export const ClassroomScheduleMatrix: React.FC<ClassroomScheduleMatrixProps> = ({
  students,
  teachers,
  timeSlots,
  subjects,
  onSelectStudent,
  onAddStudentToSlot,
}) => {
  // Mode: "week_horizontal" (Dàn ngang toàn tuần như Google Sheets demo) | "single_day" (Chọn xem chi tiết từng thứ)
  const [viewMode, setViewMode] = useState<"week_horizontal" | "single_day">("week_horizontal");
  const [activeDay, setActiveDay] = useState<string>("Thứ 2");

  // Filters
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Lọc danh sách giáo viên đang hoạt động
  const activeTeachers = useMemo(() => {
    let list = teachers.filter((t) => t.is_active !== 0);
    if (selectedTeacherFilter !== "all") {
      list = list.filter((t) => t.id === selectedTeacherFilter);
    }
    return list;
  }, [teachers, selectedTeacherFilter]);

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
      const hours = d === "Thứ 7" || d === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS;
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
      // Chỉ tính học sinh đang học hoặc bảo lưu nếu cần
      if (st.status === "dropped") continue;

      const parsedSlots = parseStudentScheduleSlots(st);
      const studentTeacherId = st.teacher_id || "unassigned";

      for (const slot of parsedSlots) {
        const d = slot.day;
        const h = slot.hourSlot;

        if (data[d] && data[d][h]) {
          const targetTeacherId = data[d][h][studentTeacherId] ? studentTeacherId : "unassigned";
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
  }, [students, teachers]);

  // Bộ lọc tìm kiếm học sinh trong ma trận
  const isStudentMatched = (st: Student) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return st.name.toLowerCase().includes(q) || st.phone.includes(q);
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

  // Render một cột của một ngày cụ thể (Dùng chung cho cả Dàn Ngang và Từng Thứ)
  const renderDayColumn = (dayName: string) => {
    const hours = dayName === "Thứ 7" || dayName === "Chủ Nhật" ? WEEKEND_HOURS : DEFAULT_HOURS;

    // Tính tổng sĩ số của ngày này
    let dayTotalStudents = 0;
    for (const h of hours) {
      if (matrixData[dayName] && matrixData[dayName][h]) {
        for (const tcId in matrixData[dayName][h]) {
          dayTotalStudents += matrixData[dayName][h][tcId].length;
        }
      }
    }

    return (
      <div
        key={dayName}
        className="flex-1 min-w-[360px] max-w-[480px] bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm flex flex-col shrink-0"
      >
        {/* Day Header - Màu vàng nhạt / Xanh theo chuẩn demo */}
        <div className="bg-amber-100 dark:bg-amber-950/60 border-b-2 border-slate-300 dark:border-slate-700 px-4 py-3 flex items-center justify-between text-slate-900 dark:text-white">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm uppercase tracking-wider text-amber-950 dark:text-amber-200">
              {dayName}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
              {dayTotalStudents} học viên
            </span>
          </div>

          <button
            type="button"
            onClick={() => onAddStudentToSlot?.(dayName, "18:00")}
            className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 transition flex items-center gap-1 shadow-2xs"
            title="Thêm học sinh mới vào ngày này"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vào {dayName}</span>
          </button>
        </div>

        {/* Teachers Header Row */}
        <div className="grid grid-cols-12 bg-indigo-900 text-white text-[11px] font-black border-b border-indigo-800 text-center divide-x divide-indigo-800">
          <div className="col-span-2 py-2 uppercase bg-indigo-950 text-amber-300 font-extrabold flex items-center justify-center">
            GIỜ
          </div>
          {activeTeachers.map((tc) => (
            <div
              key={tc.id}
              className="py-2 px-1 truncate"
              style={{ width: `${100 / Math.max(1, activeTeachers.length)}%` }}
              title={`${tc.name} (${tc.specialty || "GV"})`}
            >
              {tc.name}
            </div>
          ))}
          {/* Cột cho học sinh chưa gán giáo viên */}
          <div className="col-span-2 py-2 px-1 text-slate-300 truncate" title="Chưa gán giáo viên">
            Chờ gán GV
          </div>
        </div>

        {/* Hour Rows */}
        <div className="divide-y-2 divide-slate-200 dark:divide-slate-800 flex-1">
          {hours.map((hour) => {
            const hourCells = matrixData[dayName]?.[hour] || {};

            return (
              <div key={hour} className="grid grid-cols-12 divide-x divide-slate-200 dark:divide-slate-800 min-h-[140px]">
                {/* Cột GIỜ to rõ màu vàng bên trái */}
                <div className="col-span-2 bg-amber-50/70 dark:bg-amber-950/30 p-2 flex flex-col items-center justify-center text-center border-r border-amber-200 dark:border-amber-900/40 select-none">
                  <span className="text-xl sm:text-2xl font-black text-amber-950 dark:text-amber-300 tracking-tight">
                    {hour}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {hour === "17h" ? "17-18h" : hour === "18h" ? "18-19h" : hour === "19h" ? "19-20h" : `${hour}-10h`}
                  </span>
                </div>

                {/* Các Cột Giáo Viên Trong Ca Giờ Này */}
                {activeTeachers.map((tc) => {
                  const entries = (hourCells[tc.id] || []).filter(
                    (e) => isStudentMatched(e.student) && isSubjectMatched(e.subjectName, e.student.subject_id)
                  );
                  const isAvailable = entries.length < (tc.max_students || 10);
                  const isCrowded = entries.length >= (tc.max_students || 10) * 0.8;
                  const isFull = entries.length >= (tc.max_students || 10);

                  return (
                    <div
                      key={tc.id}
                      className="p-1.5 flex flex-col justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition relative group"
                      style={{ width: `${100 / Math.max(1, activeTeachers.length)}%` }}
                    >
                      {/* Subject sub-header (ví dụ: Piano, Guitar, Organ...) */}
                      <div className="pb-1 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="font-extrabold text-indigo-600 dark:text-indigo-400 truncate uppercase">
                          {tc.specialty || "Piano"}
                        </span>
                        <span
                          className={`px-1 rounded font-mono font-bold text-[9px] ${
                            isFull
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : isCrowded
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "text-slate-400"
                          }`}
                        >
                          {entries.length}/{tc.max_students || 10}
                        </span>
                      </div>

                      {/* Danh sách học sinh trong ô */}
                      <div className="space-y-1 flex-1 overflow-y-auto max-h-48 scrollbar-none">
                        {entries.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-[10px] text-slate-400 italic py-2">
                            {hour === "17h" && tc.name.toLowerCase().includes("điệp") ? "KO CÓ LỚP" : "- trống -"}
                          </div>
                        ) : (
                          entries.map(({ student, timeDetail, subjectName }) => {
                            const isPaid = student.payment_status === "paid";

                            return (
                              <div
                                key={student.id}
                                onClick={() => onSelectStudent(student)}
                                className={`px-1.5 py-1 rounded-lg border text-left cursor-pointer transition hover:scale-[1.02] shadow-2xs ${
                                  isPaid
                                    ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                    : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60"
                                }`}
                                title={`${student.name} (${student.phone}) - Bấm xem chi tiết`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                                    {student.name}
                                  </span>
                                  {!isPaid && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Chưa đóng học phí" />
                                  )}
                                </div>

                                {timeDetail && (
                                  <span className="block text-[9px] font-semibold text-amber-600 dark:text-amber-400 font-mono leading-tight">
                                    ({timeDetail})
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Nút thêm nhanh học sinh vào ô này */}
                      <button
                        type="button"
                        onClick={() => onAddStudentToSlot?.(dayName, `${hour.replace("h", "")}:00`, tc.id)}
                        className="opacity-0 group-hover:opacity-100 transition w-full mt-1 py-0.5 text-[9px] font-bold rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-center flex items-center justify-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>Thêm</span>
                      </button>
                    </div>
                  );
                })}

                {/* Cột học sinh chưa gán giáo viên trong ca này */}
                <div className="col-span-2 p-1.5 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                  <div className="pb-1 mb-1 border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 font-semibold">
                    Chờ gán: {hourCells["unassigned"]?.length || 0}
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto max-h-48 scrollbar-none">
                    {(hourCells["unassigned"] || [])
                      .filter((e) => isStudentMatched(e.student) && isSubjectMatched(e.subjectName, e.student.subject_id))
                      .map(({ student, timeDetail }) => (
                        <div
                          key={student.id}
                          onClick={() => onSelectStudent(student)}
                          className="px-1.5 py-1 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/60 dark:bg-amber-950/40 text-[11px] font-bold text-amber-900 dark:text-amber-200 cursor-pointer"
                        >
                          <div className="truncate">{student.name}</div>
                          {timeDetail && <div className="text-[9px] text-amber-600 font-mono">({timeDetail})</div>}
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
      {/* Top Filter and Display Mode Controls */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("week_horizontal")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                viewMode === "week_horizontal"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Toàn Tuần (Dàn Ngang Demo)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("single_day")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                viewMode === "single_day"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Xem Theo Từng Thứ</span>
            </button>
          </div>
        </div>

        {/* Right: Quick Search & Subject/Teacher Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          {/* Search student */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tên học sinh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">Tất cả Bộ môn</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Teacher Filter */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
          >
            <option value="all">Tất cả Giáo viên ({teachers.length})</option>
            {teachers.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.name}
              </option>
            ))}
          </select>

          {/* Print button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition"
            title="In sơ đồ lớp học"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: DÀN NGANG TOÀN TUẦN (Giống hệt file Google Sheets demo) */}
      {viewMode === "week_horizontal" && (
        <div className="overflow-x-auto pb-6 scrollbar-thin">
          <div className="flex items-start gap-4 min-w-max">
            {DAYS_OF_WEEK.map((d) => renderDayColumn(d))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: XEM THEO TỪNG THỨ (Gọn gàng, dễ quản lý trên màn hình nhỏ) */}
      {viewMode === "single_day" && (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DAYS_OF_WEEK.map((d) => {
              const isActive = activeDay === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition whitespace-nowrap ${
                    isActive
                      ? "bg-amber-500 text-white shadow-md shadow-amber-500/25"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Single day big card */}
          <div className="max-w-3xl mx-auto">
            {renderDayColumn(activeDay)}
          </div>
        </div>
      )}
    </div>
  );
};
