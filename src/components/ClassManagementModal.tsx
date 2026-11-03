"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ClassRoom, Teacher, Subject, Student, ClassScheduleItem, ClassTeacherAssignment } from "@/lib/types";
import { useToast } from "@/components/Toast";
import { formatScheduleCompact, DAYS_ORDER_MAP } from "@/lib/shiftDetection";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Save,
  Search,
  X,
  Users,
  Building2,
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Check,
  ChevronRight,
  ShieldCheck,
  HelpCircle,
  UserPlus,
  CalendarDays,
  Sparkles,
} from "lucide-react";

interface ClassManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  teachers: Teacher[];
  subjects: Subject[];
  students: Student[];
  schoolId?: string;
  onRefresh: () => void;
}

const COLOR_PRESETS = [
  { val: "indigo", name: "Chàm", bg: "bg-indigo-600" },
  { val: "emerald", name: "Ngọc", bg: "bg-emerald-600" },
  { val: "amber", name: "Hổ phách", bg: "bg-amber-600" },
  { val: "rose", name: "Hoa hồng", bg: "bg-rose-600" },
  { val: "purple", name: "Tím Huế", bg: "bg-purple-600" },
  { val: "sky", name: "Da trời", bg: "bg-sky-600" },
];

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
  isOpen,
  onClose,
  classes,
  teachers,
  subjects,
  students,
  schoolId,
  onRefresh,
}) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [maxStudents, setMaxStudents] = useState<number>(15);
  const [room, setRoom] = useState("");
  const [color, setColor] = useState("indigo");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"active" | "closed">("active");

  // Khung giờ hoạt động của lớp (ví dụ: Thứ 2-4-6 mở từ 17:00 - 20:00)
  const [scheduleItems, setScheduleItems] = useState<ClassScheduleItem[]>([]);

  // Phân công giáo viên vào ca trong lớp (nhiều GV, có thể cùng ca hoặc nối ca)
  const [teacherAssignments, setTeacherAssignments] = useState<ClassTeacherAssignment[]>([]);

  // Gán học sinh vào lớp (mảng ID)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isSelectingStudents, setIsSelectingStudents] = useState(false);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState("");

  // Tìm kiếm & Filter danh sách lớp
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("ALL");
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("ALL");

  // Chế độ xem phân công ca dạy: "by_day" (theo thứ trong tuần) hoặc "by_teacher" (theo giáo viên)
  const [shiftViewMode, setShiftViewMode] = useState<"by_day" | "by_teacher">("by_day");

  const [isSaving, setIsSaving] = useState(false);
  const [classToDelete, setClassToDelete] = useState<ClassRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setIsEditing(false);
    setEditingClassId(null);
    setName("");
    setCode("");
    setSubjectId(subjects[0]?.id || "");
    setMaxStudents(15);
    setRoom("Phòng 101");
    setColor("indigo");
    setNote("");
    setStatus("active");
    setScheduleItems([
      { id: "sch-1", day: "Thứ 2", start_time: "17:00", end_time: "20:00" },
      { id: "sch-2", day: "Thứ 4", start_time: "17:00", end_time: "20:00" },
      { id: "sch-3", day: "Thứ 6", start_time: "17:00", end_time: "20:00" },
    ]);
    setTeacherAssignments(
      teachers.length >= 2
        ? [
            { id: "ta-1", teacher_id: teachers[0]?.id || "", day: "Tất cả các ngày", start_time: "17:00", end_time: "18:00", role: "Đứng lớp ca 1" },
            { id: "ta-2", teacher_id: teachers[1]?.id || "", day: "Tất cả các ngày", start_time: "18:00", end_time: "20:00", role: "Đứng lớp ca 2" },
          ]
        : teachers[0]
        ? [{ id: "ta-1", teacher_id: teachers[0].id, day: "Tất cả các ngày", start_time: "17:00", end_time: "20:00", role: "Đứng lớp chính" }]
        : []
    );
    setSelectedStudentIds([]);
    setIsSelectingStudents(false);
  };

  useEffect(() => {
    if (isOpen && !isEditing) {
      resetForm();
    }
  }, [isOpen]);

  // Thêm khung giờ lớp
  const handleAddScheduleItem = () => {
    setScheduleItems([
      ...scheduleItems,
      {
        id: `sch-${Date.now()}`,
        day: "Thứ 7",
        start_time: "17:00",
        end_time: "20:00",
      },
    ]);
  };

  const handleUpdateScheduleItem = (index: number, field: keyof ClassScheduleItem, val: string) => {
    const updated = [...scheduleItems];
    updated[index] = { ...updated[index], [field]: val };
    setScheduleItems(updated);
  };

  const handleRemoveScheduleItem = (index: number) => {
    setScheduleItems(scheduleItems.filter((_, i) => i !== index));
  };

  // Thêm phân công giáo viên vào ca
  const handleAddTeacherAssignment = () => {
    setTeacherAssignments([
      ...teacherAssignments,
      {
        id: `ta-${Date.now()}`,
        teacher_id: teachers[0]?.id || "",
        day: "Tất cả các ngày",
        start_time: "18:00",
        end_time: "20:00",
        role: "Đứng lớp",
      },
    ]);
  };

  const handleUpdateTeacherAssignment = (index: number, field: keyof ClassTeacherAssignment, val: string) => {
    const updated = [...teacherAssignments];
    updated[index] = { ...updated[index], [field]: val };
    setTeacherAssignments(updated);
  };

  const handleRemoveTeacherAssignment = (index: number) => {
    setTeacherAssignments(teacherAssignments.filter((_, i) => i !== index));
  };

  const handleEditClick = (cls: ClassRoom) => {
    setIsEditing(true);
    setEditingClassId(cls.id);
    setName(cls.name);
    setCode(cls.code || "");
    setSubjectId(cls.subject_id || "");
    setMaxStudents(cls.max_students || 15);
    setRoom(cls.room || "");
    setColor(cls.color || "indigo");
    setNote(cls.note || "");
    setStatus(cls.status || "active");

    try {
      if (cls.schedule_json) {
        const parsed = JSON.parse(cls.schedule_json);
        if (Array.isArray(parsed)) setScheduleItems(parsed);
        else setScheduleItems([]);
      } else {
        setScheduleItems([]);
      }
    } catch {
      setScheduleItems([]);
    }

    try {
      if (cls.teacher_assignments_json) {
        const parsed = JSON.parse(cls.teacher_assignments_json);
        if (Array.isArray(parsed)) setTeacherAssignments(parsed);
        else setTeacherAssignments([]);
      } else if (cls.teacher_id) {
        // Fallback từ giáo viên đơn cũ
        setTeacherAssignments([
          {
            id: "ta-fallback",
            teacher_id: cls.teacher_id,
            day: "Tất cả các ngày",
            start_time: "17:00",
            end_time: "20:00",
            role: "Đứng lớp chính",
          },
        ]);
      } else {
        setTeacherAssignments([]);
      }
    } catch {
      setTeacherAssignments([]);
    }

    if (Array.isArray(cls.students)) {
      setSelectedStudentIds(cls.students.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const getRequestHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (schoolId) headers["x-school-id"] = schoolId;
    return headers;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập tên lớp học!", "error");
      return;
    }

    try {
      setIsSaving(true);
      // GV đại diện chính = GV đầu tiên trong danh sách phân công (nếu có)
      const primaryTeacherId = teacherAssignments[0]?.teacher_id || null;

      const res = await fetch("/api/classes", {
        method: "POST",
        headers: getRequestHeaders(),
        body: JSON.stringify({
          id: isEditing ? editingClassId : undefined,
          school_id: schoolId || undefined,
          name: name.trim(),
          code: code.trim(),
          subject_id: subjectId || null,
          teacher_id: primaryTeacherId,
          max_students: Number(maxStudents) || 15,
          room: room.trim(),
          schedule_json: JSON.stringify(scheduleItems),
          teacher_assignments_json: JSON.stringify(teacherAssignments),
          color,
          note: note.trim(),
          status,
          assigned_student_ids: selectedStudentIds,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Lưu lớp học thành công!", "success");
        resetForm();
        onRefresh();
      } else {
        showToast(json.message || "Không thể lưu lớp học!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/classes?id=${classToDelete.id}`, {
        method: "DELETE",
        headers: getRequestHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Đã xóa lớp học!", "success");
        setClassToDelete(null);
        if (editingClassId === classToDelete.id) resetForm();
        onRefresh();
      } else {
        showToast(json.message || "Xóa lớp thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Lọc danh sách lớp học
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchQuery =
        !searchQuery.trim() ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.room && c.room.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject = selectedSubjectFilter === "ALL" || c.subject_id === selectedSubjectFilter;

      let matchTeacher = selectedTeacherFilter === "ALL";
      if (selectedTeacherFilter !== "ALL") {
        if (c.teacher_id === selectedTeacherFilter) matchTeacher = true;
        try {
          if (c.teacher_assignments_json) {
            const parsed = JSON.parse(c.teacher_assignments_json);
            if (Array.isArray(parsed) && parsed.some((a: any) => a.teacher_id === selectedTeacherFilter)) {
              matchTeacher = true;
            }
          }
        } catch {}
      }

      return matchQuery && matchSubject && matchTeacher;
    });
  }, [classes, searchQuery, selectedSubjectFilter, selectedTeacherFilter]);

  const getColorMeta = (colorVal?: string) => {
    return COLOR_PRESETS.find((c) => c.val === colorVal) || COLOR_PRESETS[0];
  };

  const filteredStudentsForSelect = useMemo(() => {
    if (!studentSearchKeyword.trim()) return students;
    const q = studentSearchKeyword.toLowerCase();
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q))
    );
  }, [students, studentSearchKeyword]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* ================= HEADER ================= */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 ring-4 ring-indigo-50 dark:ring-indigo-950/50">
              <Layers className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Quản Lý Lớp Học & Phân Công Ca Dạy
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <Building2 className="w-3 h-3" />
                  Mô hình Lớp trung tâm
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sĩ số áp dụng chung cho cả lớp • Phân công nhiều giáo viên theo từng khung giờ (17h-18h Cô Điệp, 18h-20h Thầy Phong)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= BODY CHÍNH (2 CỘT) ================= */}
        <div className="p-4 sm:p-6 overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 bg-slate-50/50 dark:bg-slate-950/30">
          
          {/* CỘT TRÁI (6 PHẦN): FORM CẤU HÌNH LỚP HỌC */}
          <div className="lg:col-span-6 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isEditing ? "bg-amber-500 animate-pulse" : "bg-indigo-600"}`} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {isEditing ? <Edit2 className="w-3.5 h-3.5 text-amber-500" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
                  {isEditing ? "Cập Nhật Cấu Hình Lớp" : "Thiết Lập Lớp Học Mới"}
                </span>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  ✕ Hủy sửa
                </button>
              )}
            </div>

            {/* Form scroll riêng */}
            <form id="class-management-form" onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              
              {/* 1. Thông tin Lớp & Sĩ số chung */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Tên lớp học <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Lớp Piano 1, Guitar K1..."
                      className="w-full px-3 py-2 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Mã lớp
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="PIANO-1"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Bộ môn
                    </label>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none cursor-pointer"
                    >
                      <option value="">Chưa chọn môn</option>
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Phòng học
                    </label>
                    <input
                      type="text"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="Phòng 101"
                      className="w-full px-2.5 py-2 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  {/* ⭐ SĨ SỐ TỐI ĐA CỦA CẢ LỚP (KHÔNG CẦN CHIA THEO GIÁO VIÊN) */}
                  <div className="p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60">
                    <label className="text-[11px] font-black uppercase text-indigo-950 dark:text-indigo-200 block">
                      Sĩ số lớp tối đa
                    </label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={maxStudents}
                        onChange={(e) => setMaxStudents(Number(e.target.value) || 15)}
                        className="w-14 px-2 py-1 text-xs font-black text-center rounded-xl border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 outline-none shadow-xs"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">học sinh</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Khung giờ mở cửa hoạt động của Lớp (ví dụ: 17h - 20h) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" /> Khung giờ hoạt động của lớp ({scheduleItems.length})
                    </span>
                    <span className="text-[10px] text-slate-400 block">Lớp mở cửa từ mấy giờ đến mấy giờ trong tuần</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddScheduleItem}
                    className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" /> Thêm ngày/giờ
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 scrollbar-thin">
                  {scheduleItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shadow-xs text-xs"
                    >
                      <select
                        value={item.day}
                        onChange={(e) => handleUpdateScheduleItem(idx, "day", e.target.value)}
                        className="px-2 py-1 text-xs font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 font-mono text-xs">
                        <input
                          type="time"
                          value={item.start_time}
                          onChange={(e) => handleUpdateScheduleItem(idx, "start_time", e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          type="time"
                          value={item.end_time}
                          onChange={(e) => handleUpdateScheduleItem(idx, "end_time", e.target.value)}
                          className="px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleItem(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. ⭐ PHÂN CÔNG GIÁO VIÊN THEO TỪNG CA TRONG LỚP (HỖ TRỢ NHIỀU GV, CÙNG GIỜ HOẶC NỐI CA) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" /> Phân công Giáo viên đứng ca ({teacherAssignments.length})
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      VD: 17h-18h Cô Điệp, 18h-20h Thầy Phong (hoặc 2-3 GV cùng 1 khung giờ)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTeacherAssignment}
                    className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" /> Thêm ca giáo viên
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2.5 rounded-2xl border-2 border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 scrollbar-thin">
                  {teacherAssignments.map((ta, idx) => (
                    <div
                      key={ta.id || idx}
                      className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Chọn giáo viên */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase text-slate-400">GV:</span>
                          <select
                            value={ta.teacher_id}
                            onChange={(e) => handleUpdateTeacherAssignment(idx, "teacher_id", e.target.value)}
                            className="px-2 py-1 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none flex-1 truncate"
                          >
                            <option value="">-- Chọn giáo viên --</option>
                            {teachers.map((tc) => (
                              <option key={tc.id} value={tc.id}>
                                {tc.name} {tc.specialty ? `(${tc.specialty})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Vai trò / Ghi chú ca */}
                        <input
                          type="text"
                          value={ta.role || ""}
                          onChange={(e) => handleUpdateTeacherAssignment(idx, "role", e.target.value)}
                          placeholder="Vai trò: Đứng lớp ca 1..."
                          className="w-28 px-2 py-1 text-[11px] font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveTeacherAssignment(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Gỡ giáo viên này khỏi ca"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                        {/* Khung giờ dạy của giáo viên này */}
                        <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 flex-wrap">
                            <span className="font-semibold text-slate-600 dark:text-slate-400">Áp dụng:</span>
                            <select
                              value={ta.day || "Tất cả các ngày"}
                              onChange={(e) => handleUpdateTeacherAssignment(idx, "day", e.target.value)}
                              className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-700"
                            >
                              <option value="Tất cả các ngày">🌟 Tất cả các ngày mở</option>
                              <optgroup label="Tùy chọn nhanh">
                                <option value="Thứ 2, Thứ 4, Thứ 6">Thứ 2, 4, 6</option>
                                <option value="Thứ 3, Thứ 5, Thứ 7">Thứ 3, 5, 7</option>
                                <option value="Thứ 7, Chủ Nhật">Cuối tuần (T7, CN)</option>
                              </optgroup>
                              <optgroup label="Từng thứ riêng lẻ">
                                {DAYS_OF_WEEK.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-xs">
                            <input
                              type="time"
                              value={ta.start_time}
                              onChange={(e) => handleUpdateTeacherAssignment(idx, "start_time", e.target.value)}
                              className="px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                            />
                            <span className="text-slate-400 font-bold">-</span>
                            <input
                              type="time"
                              value={ta.end_time}
                              onChange={(e) => handleUpdateTeacherAssignment(idx, "end_time", e.target.value)}
                              className="px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-bold"
                            />
                          </div>
                        </div>
                    </div>
                  ))}

                  {teacherAssignments.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-400 italic">
                      Chưa phân công giáo viên nào vào ca. Bấm &quot;Thêm ca giáo viên&quot; để gán Thầy/Cô phụ trách.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Gán học sinh vào lớp */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Học sinh trong lớp ({selectedStudentIds.length}/{maxStudents})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSelectingStudents(!isSelectingStudents)}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isSelectingStudents ? "Đóng danh sách" : "Thêm / Chọn học sinh"}</span>
                  </button>
                </div>

                {isSelectingStudents && (
                  <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                    <input
                      type="text"
                      placeholder="Tìm học sinh theo tên, SĐT..."
                      value={studentSearchKeyword}
                      onChange={(e) => setStudentSearchKeyword(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                    />

                    <div className="max-h-36 overflow-y-auto space-y-1 scrollbar-thin">
                      {filteredStudentsForSelect.map((st) => {
                        const isPicked = selectedStudentIds.includes(st.id);
                        return (
                          <div
                            key={st.id}
                            onClick={() => {
                              if (isPicked) {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== st.id));
                              } else {
                                if (selectedStudentIds.length >= maxStudents) {
                                  showToast(`Lớp đã đạt sĩ số tối đa (${maxStudents} học sinh)!`, "error");
                                  return;
                                }
                                setSelectedStudentIds([...selectedStudentIds, st.id]);
                              }
                            }}
                            className={`p-2 rounded-xl text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                              isPicked
                                ? "bg-indigo-50 border border-indigo-400 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shadow-2xs"
                                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                            }`}
                          >
                            <span className="truncate">{st.name} ({st.phone})</span>
                            {isPicked && <Check className="w-3.5 h-3.5 stroke-[3] text-indigo-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Màu sắc & Trạng thái */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400">Màu:</span>
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setColor(c.val)}
                      className={`w-5 h-5 rounded-lg ${c.bg} flex items-center justify-center text-white transition cursor-pointer ${
                        color === c.val ? "ring-2 ring-indigo-500 scale-110 shadow-xs" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {color === c.val && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-500">Trạng thái:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="active">Đang mở</option>
                    <option value="closed">Đã đóng</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-2 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Đang lưu..." : isEditing ? "Lưu Cập Nhật Lớp" : "+ Lưu & Thêm Lớp Học"}</span>
              </button>
            </form>
          </div>

          {/* CỘT PHẢI (6 PHẦN): DANH SÁCH LỚP HỌC ĐÃ TẠO */}
          <div className="lg:col-span-6 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Header & Bộ lọc */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Danh Sách Lớp ({filteredClasses.length})
                  </span>
                </div>

                {isEditing && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Đang chỉnh sửa
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên lớp, phòng..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>

                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer truncate"
                >
                  <option value="ALL">Tất cả bộ môn</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Danh sách lớp học */}
            <div className="p-4 space-y-3.5 overflow-y-auto flex-1 scrollbar-thin">
              {filteredClasses.map((cls) => {
                const colorMeta = getColorMeta(cls.color);
                const isCurrentEditing = editingClassId === cls.id;
                const isFull = (cls.student_count || 0) >= cls.max_students;

                let scheduleItemsList: ClassScheduleItem[] = [];
                try {
                  if (cls.schedule_json) scheduleItemsList = JSON.parse(cls.schedule_json);
                } catch {}

                let teacherAssignmentsList: ClassTeacherAssignment[] = [];
                try {
                  if (cls.teacher_assignments_json) teacherAssignmentsList = JSON.parse(cls.teacher_assignments_json);
                } catch {}

                return (
                  <div
                    key={cls.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 shadow-2xs ${
                      isCurrentEditing
                        ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-400/50"
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-300 dark:hover:border-slate-700"
                    }`}
                  >
                    {/* Header Card: Tên lớp, Phòng, Nút sửa/xóa */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs ${colorMeta.bg}`}>
                          {cls.code || "L"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {cls.name}
                            </h3>
                            {cls.subject_name && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                                {cls.subject_name}
                              </span>
                            )}
                            {cls.room && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                📍 {cls.room}
                              </span>
                            )}
                          </div>

                          {/* Khung giờ mở của lớp (Gộp thông minh bằng formatScheduleCompact) */}
                          {scheduleItemsList.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 mt-1">
                              <Clock className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="font-semibold text-slate-600 dark:text-slate-400">Mở cửa:</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {formatScheduleCompact(scheduleItemsList).map((txt, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                                  >
                                    {txt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(cls)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                          title="Sửa lớp này"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setClassToDelete(cls)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                          title="Xóa lớp này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sĩ số của LỚP: chỉ ghi số học sinh thực tế */}
                    <div className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-slate-500 font-medium">
                        Sĩ số lớp: <strong className="text-slate-900 dark:text-white font-bold">{cls.student_count || 0} học sinh</strong>
                      </span>
                      {cls.room && (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {cls.room}
                        </span>
                      )}
                    </div>

                    {/* ⭐ DANH SÁCH GIÁO VIÊN ĐỨNG CA TRONG LỚP NÀY */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-xs">
                          <GraduationCap className="w-4 h-4 text-emerald-600" /> Phân công ca dạy ({teacherAssignmentsList.length} ca)
                        </span>

                        {/* Switch Chế độ xem: Theo Tuần / Theo Giáo Viên */}
                        <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => setShiftViewMode("by_day")}
                            className={`px-2 py-0.5 rounded-lg transition ${
                              shiftViewMode === "by_day"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            }`}
                          >
                            Theo Lịch Tuần
                          </button>
                          <button
                            type="button"
                            onClick={() => setShiftViewMode("by_teacher")}
                            className={`px-2 py-0.5 rounded-lg transition ${
                              shiftViewMode === "by_teacher"
                                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs"
                                : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            }`}
                          >
                            Theo Giáo Viên
                          </button>
                        </div>
                      </div>

                      {teacherAssignmentsList.length === 0 ? (
                        <div className="text-center py-2 text-slate-400 italic text-[11px]">
                          Chưa có giáo viên nào được phân công vào lớp này.
                        </div>
                      ) : shiftViewMode === "by_day" ? (
                        /* CHẾ ĐỘ 1: THEO LỊCH TUẦN (Thứ 2 -> Chủ Nhật) */
                        <div className="space-y-2">
                          {DAYS_OF_WEEK.map((dayName) => {
                            // Lọc các ca áp dụng cho thứ này
                            const dayShifts = teacherAssignmentsList.filter(
                              (ta) => !ta.day || ta.day === "Tất cả các ngày" || ta.day === dayName
                            );
                            if (dayShifts.length === 0) return null;

                            return (
                              <div
                                key={dayName}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                  <span className="font-extrabold text-[11px] text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{dayName}</span>
                                    <span className="text-[10px] font-normal text-slate-400">({dayShifts.length} ca dạy)</span>
                                  </span>
                                  <span className="text-[10px] text-slate-400">Sĩ số tối đa: {cls.max_students} HS/ca</span>
                                </div>

                                <div className="space-y-1.5">
                                  {dayShifts.map((ta, sIdx) => {
                                    const tcObj = teachers.find((t) => t.id === ta.teacher_id);
                                    const [taSh] = (ta.start_time || "00:00").split(":").map(Number);
                                    const [taEh] = (ta.end_time || "23:59").split(":").map(Number);

                                    const classStudents = students.filter((s) => s.class_id === cls.id && s.status !== "dropped");
                                    let slotStudentCount = 0;
                                    for (const st of classStudents) {
                                      let matchSlot = false;
                                      if (st.schedule_details_json) {
                                        try {
                                          const parsed = JSON.parse(st.schedule_details_json);
                                          if (Array.isArray(parsed)) {
                                            matchSlot = parsed.some((item: any) => {
                                              const matchD = !ta.day || ta.day === "Tất cả các ngày" || ta.day === item.day;
                                              if (!matchD || item.day !== dayName) return false;
                                              if (!item.start_time) return true;
                                              const [stH] = item.start_time.split(":").map(Number);
                                              return stH >= taSh && stH < taEh;
                                            });
                                          }
                                        } catch {}
                                      } else if (st.study_time_detail) {
                                        const match = st.study_time_detail.match(/(\d{1,2})(?::(\d{2})|h)/);
                                        const regDays = String(st.registered_days || "");
                                        if (match && regDays.includes(dayName)) {
                                          const stH = parseInt(match[1], 10);
                                          matchSlot = stH >= taSh && stH < taEh;
                                        }
                                      }
                                      if (matchSlot) slotStudentCount++;
                                    }

                                    const isSlotFull = slotStudentCount >= cls.max_students;
                                    const slotPercent = Math.min(100, Math.round((slotStudentCount / (cls.max_students || 15)) * 100));

                                    return (
                                      <div
                                        key={sIdx}
                                        className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-600">
                                              {ta.start_time} - {ta.end_time}
                                            </span>
                                            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                                              {tcObj?.name || "Chưa phân công"}
                                            </span>
                                            {ta.role && (
                                              <span className="text-[10px] text-slate-400">({ta.role})</span>
                                            )}
                                          </div>

                                          <span
                                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                                              isSlotFull
                                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                                                : slotStudentCount > 0
                                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
                                                : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                            }`}
                                          >
                                            {slotStudentCount}/{cls.max_students} HS
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 pt-0.5">
                                          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                              style={{ width: `${slotPercent}%` }}
                                              className={`h-full rounded-full transition-all duration-300 ${
                                                isSlotFull
                                                  ? "bg-rose-500"
                                                  : slotPercent >= 80
                                                  ? "bg-amber-500"
                                                  : slotPercent > 0
                                                  ? "bg-indigo-600"
                                                  : "bg-transparent"
                                              }`}
                                            />
                                          </div>
                                          <span className="text-[9px] font-bold text-slate-400 font-mono w-7 text-right">
                                            {slotPercent}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* CHẾ ĐỘ 2: THEO GIÁO VIÊN (Gom theo từng Thầy/Cô) */
                        <div className="space-y-2">
                          {Array.from(new Set(teacherAssignmentsList.map((ta) => ta.teacher_id))).map((tcId) => {
                            const tcObj = teachers.find((t) => t.id === tcId);
                            const tcShifts = teacherAssignmentsList.filter((ta) => ta.teacher_id === tcId);

                            return (
                              <div
                                key={tcId}
                                className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                                      {tcObj?.name?.charAt(0) || "G"}
                                    </div>
                                    <div>
                                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                        {tcObj?.name || "Giáo viên"}
                                      </span>
                                      {tcObj?.specialty && (
                                        <span className="text-[10px] text-slate-400 ml-1.5">({tcObj.specialty})</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    {tcShifts.length} ca dạy
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {tcShifts.map((ta, sIdx) => {
                                    const [taSh] = (ta.start_time || "00:00").split(":").map(Number);
                                    const [taEh] = (ta.end_time || "23:59").split(":").map(Number);

                                    const classStudents = students.filter((s) => s.class_id === cls.id && s.status !== "dropped");
                                    let slotStudentCount = 0;
                                    for (const st of classStudents) {
                                      let matchSlot = false;
                                      if (st.schedule_details_json) {
                                        try {
                                          const parsed = JSON.parse(st.schedule_details_json);
                                          if (Array.isArray(parsed)) {
                                            matchSlot = parsed.some((item: any) => {
                                              const matchDay = !ta.day || ta.day === "Tất cả các ngày" || ta.day === item.day;
                                              if (!matchDay) return false;
                                              if (!item.start_time) return true;
                                              const [stH] = item.start_time.split(":").map(Number);
                                              return stH >= taSh && stH < taEh;
                                            });
                                          }
                                        } catch {}
                                      } else if (st.study_time_detail) {
                                        const match = st.study_time_detail.match(/(\d{1,2})(?::(\d{2})|h)/);
                                        if (match) {
                                          const stH = parseInt(match[1], 10);
                                          matchSlot = stH >= taSh && stH < taEh;
                                        }
                                      }
                                      if (matchSlot) slotStudentCount++;
                                    }

                                    const isSlotFull = slotStudentCount >= cls.max_students;
                                    const slotPercent = Math.min(100, Math.round((slotStudentCount / (cls.max_students || 15)) * 100));

                                    return (
                                      <div
                                        key={sIdx}
                                        className="p-2 rounded-lg bg-slate-50/70 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-[11px] text-indigo-700 dark:text-indigo-400">
                                              {ta.day || "Tất cả ngày"}
                                            </span>
                                            <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-600">
                                              {ta.start_time} - {ta.end_time}
                                            </span>
                                            {ta.role && (
                                              <span className="text-[10px] text-slate-400">({ta.role})</span>
                                            )}
                                          </div>

                                          <span
                                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                                              isSlotFull
                                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                                                : slotStudentCount > 0
                                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900"
                                                : "bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                                            }`}
                                          >
                                            {slotStudentCount}/{cls.max_students} HS
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 pt-0.5">
                                          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                              style={{ width: `${slotPercent}%` }}
                                              className={`h-full rounded-full transition-all duration-300 ${
                                                isSlotFull
                                                  ? "bg-rose-500"
                                                  : slotPercent >= 80
                                                  ? "bg-amber-500"
                                                  : slotPercent > 0
                                                  ? "bg-indigo-600"
                                                  : "bg-transparent"
                                              }`}
                                            />
                                          </div>
                                          <span className="text-[9px] font-bold text-slate-400 font-mono w-7 text-right">
                                            {slotPercent}%
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredClasses.length === 0 && (
                <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <Layers className="w-8 h-8 text-indigo-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {searchQuery ? "Không tìm thấy lớp học phù hợp" : "Chưa có lớp học nào"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Điền tên lớp, mở ca từ 17h-20h và phân công Thầy/Cô đứng ca ở khung bên trái.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Mô hình Lớp trung tâm: Sĩ số tính cho Lớp, Giáo viên được gán theo từng khung giờ linh hoạt</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              form="class-management-form"
              disabled={isSaving}
              className="px-6 py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer flex items-center gap-2 active:scale-95 rounded-2xl"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Đang lưu..." : isEditing ? "Lưu Cập Nhật Lớp" : "+ Thêm Lớp Học"}</span>
            </button>
          </div>
        </div>

        {/* Modal xác nhận xóa */}
        {classToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto ring-4 ring-rose-50 dark:ring-rose-950/30">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa lớp học?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn có chắc chắn muốn xóa lớp <strong className="text-slate-800 dark:text-slate-200">{classToDelete.name}</strong>?
                </p>
                {classToDelete.student_count && classToDelete.student_count > 0 ? (
                  <p className="text-[11px] text-amber-600 font-semibold bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl mt-2">
                    Lưu ý: Lớp đang có {classToDelete.student_count} học sinh. Các học sinh sẽ được chuyển về trạng thái chưa gán lớp.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClassToDelete(null)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
