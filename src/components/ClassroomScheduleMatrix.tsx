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
  X,
  SlidersHorizontal,
} from "lucide-react";

interface ClassroomScheduleMatrixProps {
  students: Student[];
  teachers: Teacher[];
  timeSlots: TimeSlot[];
  subjects: Subject[];
  onSelectStudent: (student: Student) => void;
  onAddStudentToSlot?: (day: string, time: string, teacherId?: string, subjectId?: string) => void;
  onOpenConsultation?: () => void;
}

// 7 Ngày trong tuần chuẩn
const DAYS_OF_WEEK = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

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

// Chuyển mốc giờ "08h", "17h" thành định dạng "08:00", "17:00"
function formatHourLabel(h: string): string {
  const clean = h.replace("h", "");
  return `${clean.padStart(2, "0")}:00`;
}

interface StudentSlotEntry {
  student: Student;
  timeDetail: string;
  subjectName: string;
  teacherId: string;
  teacherName?: string;
}

export const ClassroomScheduleMatrix: React.FC<ClassroomScheduleMatrixProps> = ({
  students,
  teachers,
  timeSlots,
  subjects,
  onSelectStudent,
  onAddStudentToSlot,
  onOpenConsultation,
}) => {
  // Xác định Thứ hôm nay để highlight cột trực quan & gán mặc định
  const todayName = useMemo(() => {
    const dayIndex = new Date().getDay();
    const map = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return map[dayIndex];
  }, []);

  // Mode: "week_grid" (Lưới 7 Ngày Chuẩn) | "single_day" (Xem Chi Tiết Từng Thứ) | "teacher_centric" (Theo Giáo Viên)
  const [viewMode, setViewMode] = useState<"week_grid" | "single_day" | "teacher_centric">("week_grid");
  // Mặc định ưu tiên chọn Thứ của Hôm Nay trước
  const [activeDay, setActiveDay] = useState<string>(() => {
    const dayIndex = new Date().getDay();
    const map = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return map[dayIndex] || "Thứ 2";
  });
  const [selectedTeacherTab, setSelectedTeacherTab] = useState<string>("all");

  // Lọc danh sách giáo viên đang hoạt động
  const activeTeachers = useMemo(() => {
    let list = teachers.filter((t) => t.is_active !== 0);
    if (selectedTeacherFilter !== "all") {
      list = list.filter((t) => t.id === selectedTeacherFilter);
    }
    return list;
  }, [teachers, selectedTeacherFilter]);

  // Bộ lọc tìm kiếm & trạng thái học sinh
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
      (st.subject_name && st.subject_name.toLowerCase().includes(q)) ||
      (st.teacher_name && st.teacher_name.toLowerCase().includes(q))
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

  // Map học sinh vào ma trận 5 chiều: matrixData[day][hourSlot][teacherId] = StudentSlotEntry[]
  const matrixData = useMemo(() => {
    const data: Record<string, Record<string, Record<string, StudentSlotEntry[]>>> = {};

    // Khởi tạo khung cho tất cả các ngày
    for (const d of DAYS_OF_WEEK) {
      data[d] = {};
    }

    // Duyệt qua từng học sinh
    for (const st of students) {
      if (st.status === "dropped") continue;

      const parsedSlots = parseStudentScheduleSlots(st, teachers);

      for (const slot of parsedSlots) {
        const d = slot.day;
        const h = slot.hourSlot;
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
          const tcObj = teachers.find((t) => t.id === targetTeacherId);

          data[d][h][targetTeacherId].push({
            student: st,
            timeDetail: slot.timeDetail,
            subjectName: subName,
            teacherId: targetTeacherId,
            teacherName: tcObj?.name || (targetTeacherId === "unassigned" ? "Chờ gán GV" : undefined),
          });
        }
      }
    }

    return data;
  }, [students, teachers]);

  // Danh sách các mốc giờ tổng hợp cho toàn tuần (đảm bảo các hàng thẳng hàng nhau 100%)
  const allWeekHours = useMemo(() => {
    const hourSet = new Set<string>(["08h", "09h", "10h", "17h", "18h", "19h", "20h"]);

    // Thêm các giờ từ timeSlots của cơ sở
    timeSlots.forEach((slot) => {
      if (slot.start_time) {
        const h = parseInt(slot.start_time.split(":")[0], 10);
        if (!isNaN(h)) hourSet.add(`${String(h).padStart(2, "0")}h`);
      }
    });

    // Thêm các giờ từ học sinh thực tế
    students.forEach((st) => {
      if (st.status === "dropped") return;
      const slots = parseStudentScheduleSlots(st, teachers);
      slots.forEach((s) => {
        if (s.hourSlot) hourSet.add(s.hourSlot);
      });
    });

    let sorted = Array.from(hourSet).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // Nếu người dùng chọn "Ẩn giờ trống", chỉ giữ lại những giờ có ít nhất 1 học sinh theo bộ lọc
    if (hideEmptyHours) {
      sorted = sorted.filter((h) => {
        for (const d of DAYS_OF_WEEK) {
          const hourMap = matrixData[d]?.[h];
          if (!hourMap) continue;
          for (const tcId in hourMap) {
            if (selectedTeacherFilter !== "all" && tcId !== selectedTeacherFilter) continue;
            for (const item of hourMap[tcId]) {
              if (isStudentMatched(item.student) && isSubjectMatched(item.subjectName, item.student.subject_id)) {
                return true;
              }
            }
          }
        }
        return false;
      });
    }

    return sorted;
  }, [students, timeSlots, teachers, hideEmptyHours, matrixData, selectedTeacherFilter, selectedPaymentStatusFilter, searchQuery, selectedSubjectFilter]);

  // Lấy toàn bộ học sinh trong ô (Day, Hour) đã qua bộ lọc
  const getSlotFilteredEntries = (day: string, hour: string): StudentSlotEntry[] => {
    const hourMap = matrixData[day]?.[hour] || {};
    const results: StudentSlotEntry[] = [];

    for (const tcId in hourMap) {
      if (selectedTeacherFilter !== "all" && tcId !== selectedTeacherFilter) continue;
      for (const item of hourMap[tcId]) {
        if (isStudentMatched(item.student) && isSubjectMatched(item.subjectName, item.student.subject_id)) {
          results.push(item);
        }
      }
    }

    return results;
  };

  // Thống kê tổng số lượt học toàn tuần
  const overallStats = useMemo(() => {
    let totalSlots = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let unassignedCount = 0;

    for (const d of DAYS_OF_WEEK) {
      for (const h of allWeekHours) {
        const hourMap = matrixData[d]?.[h];
        if (!hourMap) continue;
        for (const tcId in hourMap) {
          for (const item of hourMap[tcId]) {
            totalSlots++;
            if (item.student.payment_status === "paid") paidCount++;
            else unpaidCount++;
            if (tcId === "unassigned") unassignedCount++;
          }
        }
      }
    }

    return { totalSlots, paidCount, unpaidCount, unassignedCount };
  }, [matrixData, allWeekHours]);

  // Thống kê học sinh theo từng ngày
  const dayStatsMap = useMemo(() => {
    const map: Record<string, { total: number; unpaid: number }> = {};
    for (const d of DAYS_OF_WEEK) {
      let total = 0;
      let unpaid = 0;
      for (const h of allWeekHours) {
        const hourMap = matrixData[d]?.[h];
        if (!hourMap) continue;
        for (const tcId in hourMap) {
          for (const item of hourMap[tcId]) {
            total++;
            if (item.student.payment_status !== "paid") unpaid++;
          }
        }
      }
      map[d] = { total, unpaid };
    }
    return map;
  }, [matrixData, allWeekHours]);

  return (
    <div className="space-y-4 font-sans animate-in fade-in duration-200">
      {/* =========================================================================
          THANH CÔNG CỤ 2 TẦNG (2-TIER TOOLBAR)
          ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-3 shadow-xs space-y-2.5">
        {/* TẦNG 1: Chuyển Chế Độ Xem + Tóm Tắt KPI + Nút Thao Tác Nhanh */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Nhóm nút chuyển chế độ xem */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("week_grid")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "week_grid"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Lưới 7 Ngày Tuần</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("single_day");
                setActiveDay(todayName);
              }}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "single_day"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Xem Theo Thứ</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode("teacher_centric")}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                viewMode === "teacher_centric"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Theo Giáo Viên</span>
            </button>
          </div>

          {/* Dải tóm tắt KPI toàn tuần tinh tế */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <strong>{overallStats.totalSlots}</strong> lượt học
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <strong>{overallStats.paidCount}</strong> đã đóng
            </span>
            {overallStats.unpaidCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <strong>{overallStats.unpaidCount}</strong> chưa đóng
                </span>
              </>
            )}
          </div>

          {/* Nút Tư Vấn Ca Trống & In Lịch */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onOpenConsultation && (
              <button
                type="button"
                onClick={onOpenConsultation}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Mở bảng tra cứu chỗ trống và sao chép mẫu tin nhắn Zalo tư vấn phụ huynh"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Tư Vấn Ca Trống</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="In sơ đồ lớp học ra máy in hoặc lưu PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TẦNG 2: Bộ Lọc & Tìm Kiếm */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* Ô Tìm Kiếm Nhanh */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm tên, SĐT, môn học, giáo viên..."
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

          {/* Lọc Học Phí */}
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

          {/* Checkbox Ẩn Khung Giờ Trống */}
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer select-none font-semibold hover:bg-slate-100">
            <input
              type="checkbox"
              checked={hideEmptyHours}
              onChange={(e) => setHideEmptyHours(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span>Ẩn ca trống</span>
          </label>
        </div>
      </div>

      {/* =========================================================================
          CHẾ ĐỘ 1: MA TRẬN LƯỚI 7 NGÀY TOÀN TUẦN (HERO TIMETABLE GRID)
          - 7 Cột chia đều nhau, vừa vặn 100% màn hình, không cuộn ngang trên Desktop
          - Cột giờ tinh gọn nằm ở ngoài cùng bên trái, các hàng thẳng hàng nhau 100%
          - Chip rộng, không cắt chữ, ô > 3 học sinh hiển thị "+N nữa" mở Drawer
          ========================================================================= */}
      {viewMode === "week_grid" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left table-fixed min-w-[960px]">
              {/* HEADER 7 NGÀY */}
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40">
                  {/* Cột Giờ Bên Trái */}
                  <th className="w-16 p-2.5 text-center text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 border-r border-slate-200 dark:border-slate-800">
                    GIỜ
                  </th>

                  {/* 7 Cột Ngày */}
                  {DAYS_OF_WEEK.map((dayName) => {
                    const isToday = dayName === todayName;
                    const isWeekend = dayName === "Thứ 7" || dayName === "Chủ Nhật";
                    const stats = dayStatsMap[dayName] || { total: 0, unpaid: 0 };

                    return (
                      <th
                        key={dayName}
                        className={`p-2.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 transition-colors ${
                          isToday
                            ? "bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200"
                            : isWeekend
                            ? "bg-amber-50/50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                                isToday
                                  ? "bg-indigo-600 text-white"
                                  : isWeekend
                                  ? "bg-amber-500 text-white"
                                  : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {dayName.replace("Thứ ", "T")}
                            </span>
                            <div>
                              <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1">
                                <span>{dayName}</span>
                                {isToday && (
                                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-600 text-white leading-tight">
                                    Hôm nay
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                <span>{stats.total} lượt</span>
                                {stats.unpaid > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                                    • {stats.unpaid} chưa đóng
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onAddStudentToSlot?.(dayName, isWeekend ? "09:00" : "18:00")}
                            className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center text-slate-400 transition cursor-pointer"
                            title={`Thêm nhanh học sinh vào ${dayName}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* BODY: CÁC KHUNG GIỜ THẲNG HÀNG */}
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {allWeekHours.map((hour) => {
                  const hourLabel = formatHourLabel(hour);

                  return (
                    <tr key={hour} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/20 transition-colors">
                      {/* Cột Mốc Giờ Tinh Gọn (56-64px) */}
                      <td className="w-16 p-2 text-center align-top bg-slate-50/60 dark:bg-slate-950/30 border-r border-slate-200 dark:border-slate-800 select-none">
                        <div className="font-mono font-black text-xs text-slate-700 dark:text-slate-300">
                          {hourLabel}
                        </div>
                      </td>

                      {/* 7 Cột Ngày Trong Khung Giờ Này */}
                      {DAYS_OF_WEEK.map((dayName) => {
                        const isToday = dayName === todayName;
                        const entries = getSlotFilteredEntries(dayName, hour);
                        const totalInSlot = entries.length;

                        // Chỉ hiển thị tối đa 3 thẻ, phần còn lại gom thành nút "+N học viên nữa"
                        const visibleEntries = entries.slice(0, 3);
                        const remainingCount = totalInSlot - 3;

                        return (
                          <td
                            key={dayName}
                            className={`p-1.5 align-top border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-h-[110px] transition-colors relative group ${
                              isToday ? "bg-indigo-50/15 dark:bg-indigo-950/10" : ""
                            }`}
                          >
                            {/* Danh sách thẻ học sinh */}
                            <div className="space-y-1.5 min-h-[95px] flex flex-col justify-start">
                              {totalInSlot === 0 ? (
                                /* Ô Trống Sạch Sẽ */
                                <div
                                  onClick={() => onAddStudentToSlot?.(dayName, hourLabel)}
                                  className="h-full min-h-[90px] rounded-xl flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition cursor-pointer border border-transparent hover:border-dashed hover:border-indigo-300 dark:hover:border-indigo-700/60 group/empty"
                                >
                                  <Plus className="w-4 h-4 opacity-0 group-hover/empty:opacity-100 transition-opacity transform group-hover/empty:scale-110" />
                                  <span className="text-[10px] font-bold opacity-0 group-hover/empty:opacity-100 transition-opacity mt-0.5">
                                    Thêm vào ca
                                  </span>
                                </div>
                              ) : (
                                <>
                                  {visibleEntries.map(({ student, timeDetail, subjectName, teacherName }) => {
                                    const isPaid = student.payment_status === "paid";
                                    const subBadge = getSubjectBadge(subjectName);

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
                                            ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400"
                                            : "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
                                        }`}
                                      >
                                        {/* Dòng 1: Tên học sinh và chấm trạng thái học phí */}
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-bold text-[11px] text-slate-900 dark:text-white truncate" title={student.name}>
                                            {student.name}
                                          </span>
                                          <span
                                            className={`w-2 h-2 rounded-full shrink-0 ${
                                              isPaid ? "bg-emerald-500" : "bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-900"
                                            }`}
                                            title={isPaid ? "Đã đóng học phí" : "Chưa đóng học phí"}
                                          />
                                        </div>

                                        {/* Dòng 2: Môn học + Giờ học lệch / Giáo viên */}
                                        <div className="flex items-center justify-between gap-1 mt-0.5 text-[9px]">
                                          <span
                                            className={`font-extrabold uppercase px-1 rounded-sm ${subBadge.bg} ${subBadge.text} truncate max-w-[65px]`}
                                          >
                                            {subjectName}
                                          </span>

                                          {timeDetail ? (
                                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100/70 dark:bg-amber-950/60 px-1 rounded">
                                              {timeDetail}
                                            </span>
                                          ) : teacherName ? (
                                            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[65px]">
                                              {teacherName}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Nút Thu Gọn Xem Thêm Khi Ô Có Quá 3 Học Sinh */}
                                  {remainingCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDrawerSlot({
                                          day: dayName,
                                          hour,
                                          entries,
                                        })
                                      }
                                      className="w-full py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] text-center transition cursor-pointer border border-indigo-200/70 dark:border-indigo-800 flex items-center justify-center gap-1 active:scale-95 shadow-2xs"
                                    >
                                      <span>+{remainingCount} học viên nữa</span>
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 2: XEM CHI TIẾT THEO TỪNG THỨ (SINGLE DAY VIEW)
          ========================================================================= */}
      {viewMode === "single_day" && (
        <div className="space-y-4">
          {/* Day selection tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {DAYS_OF_WEEK.map((d) => {
              const isActive = activeDay === d;
              const isToday = d === todayName;
              const stats = dayStatsMap[d] || { total: 0, unpaid: 0 };

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDay(d)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-102"
                      : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                  }`}
                >
                  <span>{d}</span>
                  {isToday && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 font-black">
                      Hôm nay
                    </span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>
                    {stats.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Chi tiết ca học trong ngày đã chọn */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Lịch học chi tiết {activeDay}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onAddStudentToSlot?.(activeDay, "18:00")}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm học viên vào {activeDay}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {allWeekHours.map((hour) => {
                const hourLabel = formatHourLabel(hour);
                const entries = getSlotFilteredEntries(activeDay, hour);

                return (
                  <div
                    key={hour}
                    className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col justify-between space-y-2 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                      <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                        {hourLabel}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {entries.length} học viên
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 max-h-60 overflow-y-auto scrollbar-thin pr-0.5">
                      {entries.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          Chưa có học viên nào
                        </div>
                      ) : (
                        entries.map(({ student, timeDetail, subjectName, teacherName }) => {
                          const isPaid = student.payment_status === "paid";
                          const subBadge = getSubjectBadge(subjectName);

                          return (
                            <div
                              key={student.id}
                              onClick={() => onSelectStudent(student)}
                              className={`p-2 rounded-xl border text-left cursor-pointer transition ${
                                isPaid
                                  ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                  : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 hover:border-rose-400"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {student.name}
                                </span>
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isPaid ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 mt-1">
                                <span className={`font-bold px-1 rounded ${subBadge.bg} ${subBadge.text}`}>
                                  {subjectName}
                                </span>
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                  {timeDetail || hourLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddStudentToSlot?.(activeDay, hourLabel)}
                      className="w-full py-1 text-xs font-bold rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 text-slate-500 text-center transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm vào ca {hourLabel}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHẾ ĐỘ 3: THEO DÕI THEO GIÁO VIÊN (TEACHER-CENTRIC VIEW)
          ========================================================================= */}
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
                let teacherTotalStudents = 0;
                for (const d of DAYS_OF_WEEK) {
                  for (const h of allWeekHours) {
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

                    <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                      {DAYS_OF_WEEK.map((d) => {
                        const dayActiveHours = allWeekHours.filter(
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
                                      <span>Ca {formatHourLabel(h)}</span>
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

      {/* =========================================================================
          SIDE DRAWER: XEM TOÀN BỘ DANH SÁCH HỌC VIÊN TRONG Ô CA HỌC ĐÔNG
          ========================================================================= */}
      {drawerSlot && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-6 flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Header Drawer */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {drawerSlot.day} · {formatHourLabel(drawerSlot.hour)}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                    {drawerSlot.entries.length} học viên
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh sách phân bổ chi tiết các học viên trong ca học này
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDrawerSlot(null);
                  setDrawerSearch("");
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thanh Tìm Kiếm Trong Drawer */}
            <div className="py-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Lọc học viên trong ca này..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Danh Sách Học Viên Trong Drawer */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {drawerSlot.entries
                .filter(({ student, subjectName, teacherName }) => {
                  if (!drawerSearch.trim()) return true;
                  const q = drawerSearch.toLowerCase();
                  return (
                    student.name.toLowerCase().includes(q) ||
                    (student.phone && student.phone.includes(q)) ||
                    (subjectName && subjectName.toLowerCase().includes(q)) ||
                    (teacherName && teacherName.toLowerCase().includes(q))
                  );
                })
                .map(({ student, timeDetail, subjectName, teacherName }) => {
                  const isPaid = student.payment_status === "paid";
                  const subBadge = getSubjectBadge(subjectName);

                  return (
                    <div
                      key={student.id}
                      onClick={() => {
                        onSelectStudent(student);
                        setDrawerSlot(null);
                      }}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition hover:shadow-md ${
                        isPaid
                          ? "bg-slate-50/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                          : "bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 hover:border-rose-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {student.name}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPaid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                        >
                          {isPaid ? "Đã đóng phí" : "Chưa đóng phí"}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span className={`font-bold px-1.5 py-0.5 rounded ${subBadge.bg} ${subBadge.text}`}>
                          {subjectName}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          GV: {teacherName || "Chưa phân công"}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span>SĐT: {student.phone || "---"}</span>
                        {/* Luôn hiển thị giờ học, nếu timeDetail rỗng thì lấy từ study_time_detail hoặc giờ của ca */}
                        <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-1.5 py-0.5 rounded text-[10px]">
                          {timeDetail || student.study_time_detail || formatHourLabel(drawerSlot.hour)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Nút Thêm Nhanh Vào Ca Này */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => {
                  onAddStudentToSlot?.(drawerSlot.day, formatHourLabel(drawerSlot.hour));
                  setDrawerSlot(null);
                }}
                className="w-full py-2.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition flex items-center justify-center gap-1.5 active:scale-98"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Thêm học viên vào ca này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          POPOVER HOVER CHI TIẾT HỌC VIÊN
          ========================================================================= */}
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
              <div className="flex items-center gap-1.5 text-amber-300 font-mono">
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
