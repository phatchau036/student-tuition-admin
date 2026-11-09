"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Teacher, TimeSlot, DAYS_OF_WEEK, TeacherLeave } from "@/lib/types";
import { formatTimeSlotLabel, getDayNameVi } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import {
  GraduationCap,
  Plus,
  Trash2,
  Edit2,
  Phone,
  Mail,
  BookOpen,
  Check,
  UserCheck,
  Users,
  X,
  User,
  Clock,
  Save,
  Search,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldAlert,
  CalendarCheck,
  Music,
  CheckCircle2,
  AlertCircle,
  Hash,
  CalendarX,
  UserMinus,
} from "lucide-react";

interface TeacherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  timeSlots?: TimeSlot[];
  schoolId?: string;
  onRefresh: () => void;
}

const COLOR_PRESETS = [
  { val: "indigo", name: "Chàm", bg: "bg-indigo-600", light: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800", ring: "ring-indigo-500" },
  { val: "emerald", name: "Ngọc", bg: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800", ring: "ring-emerald-500" },
  { val: "amber", name: "Hổ phách", bg: "bg-amber-600", light: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800", ring: "ring-amber-500" },
  { val: "rose", name: "Hoa hồng", bg: "bg-rose-600", light: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800", ring: "ring-rose-500" },
  { val: "purple", name: "Tím Huế", bg: "bg-purple-600", light: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800", ring: "ring-purple-500" },
  { val: "sky", name: "Da trời", bg: "bg-sky-600", light: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800", ring: "ring-sky-500" },
];

const QUICK_SUBJECTS = ["Piano", "Guitar", "Organ", "Thanh nhạc", "Violin", "Trống", "Hội họa"];

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  isOpen,
  onClose,
  teachers,
  timeSlots = [],
  schoolId,
  onRefresh,
}) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [color, setColor] = useState("indigo");
  const [maxStudents, setMaxStudents] = useState<number>(10);
  const [assignedSlotIds, setAssignedSlotIds] = useState<string[]>([]);
  const [workingShifts, setWorkingShifts] = useState<{ id: string; day: string; start_time: string; end_time: string; max_students: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Tìm kiếm & Lọc danh sách giáo viên
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("ALL");

  // Tab cấu hình nâng cao trong form (Lịch mở cửa vs Ca riêng)
  const [activeScheduleTab, setActiveScheduleTab] = useState<"slots" | "custom">("slots");

  // Custom Delete Confirm state
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Tab chính: Danh sách giáo viên vs Đơn xin nghỉ
  const [activeMainTab, setActiveMainTab] = useState<"teachers" | "leaves">("teachers");
  const [teacherLeaves, setTeacherLeaves] = useState<TeacherLeave[]>([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState<number>(0);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState<boolean>(false);

  // Modal xử lý duyệt / từ chối đơn
  const [actionLeaveModal, setActionLeaveModal] = useState<{
    isOpen: boolean;
    leave: TeacherLeave | null;
    type: "approve" | "reject";
  }>({ isOpen: false, leave: null, type: "approve" });
  const [substituteTeacherId, setSubstituteTeacherId] = useState<string>("");
  const [adminResponseNote, setAdminResponseNote] = useState<string>("");
  const [isSubmittingLeaveAction, setIsSubmittingLeaveAction] = useState<boolean>(false);

  const loadTeacherLeaves = async () => {
    try {
      setIsLoadingLeaves(true);
      const q = schoolId ? `?school_id=${encodeURIComponent(schoolId)}` : "";
      const res = await fetch(`/api/admin/teacher-leaves${q}`);
      const json = await res.json();
      if (json.success && json.data) {
        setTeacherLeaves(json.data.leaves || []);
        setPendingLeavesCount(json.data.pending_count || 0);
      }
    } catch {
      showToast("Không thể tải danh sách đơn xin nghỉ!", "error");
    } finally {
      setIsLoadingLeaves(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTeacherLeaves();
    }
  }, [isOpen, schoolId]);

  const handleOpenLeaveAction = (leave: TeacherLeave, type: "approve" | "reject") => {
    setActionLeaveModal({ isOpen: true, leave, type });
    setSubstituteTeacherId(leave.substitute_teacher_id || "");
    setAdminResponseNote(type === "approve" ? "Đã duyệt nghỉ, chúc thầy/cô việc gia đình thuận lợi!" : "Từ chối do ca dạy đang thiếu giáo viên đứng lớp.");
  };

  const handleExecuteLeaveAction = async () => {
    if (!actionLeaveModal.leave) return;
    try {
      setIsSubmittingLeaveAction(true);
      const res = await fetch("/api/admin/teacher-leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionLeaveModal.type,
          leave_id: actionLeaveModal.leave.id,
          substitute_teacher_id: actionLeaveModal.type === "approve" ? substituteTeacherId || null : null,
          admin_note: adminResponseNote.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setActionLeaveModal({ isOpen: false, leave: null, type: "approve" });
        loadTeacherLeaves();
      } else {
        showToast(data.message || "Thao tác thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingLeaveAction(false);
    }
  };

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa đơn xin nghỉ này không?")) return;
    try {
      const res = await fetch("/api/admin/teacher-leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", leave_id: leaveId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadTeacherLeaves();
      } else {
        showToast(data.message || "Xóa thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingTeacherId(null);
    setName("");
    setPhone("");
    setEmail("");
    setSpecialty("");
    setColor("indigo");
    setMaxStudents(10);
    setAssignedSlotIds([]);
    setWorkingShifts([]);
    setActiveScheduleTab("slots");
  };

  const toggleSlotAssignment = (slotId: string) => {
    if (assignedSlotIds.includes(slotId)) {
      setAssignedSlotIds(assignedSlotIds.filter((id) => id !== slotId));
    } else {
      setAssignedSlotIds([...assignedSlotIds, slotId]);
    }
  };

  const selectAllSlots = () => {
    if (assignedSlotIds.length === timeSlots.length) {
      setAssignedSlotIds([]);
    } else {
      setAssignedSlotIds(timeSlots.map((s) => s.id));
    }
  };

  const handleAddShift = () => {
    setWorkingShifts([
      ...workingShifts,
      {
        id: `shift-${Date.now()}`,
        day: "Thứ 2",
        start_time: "17:00",
        end_time: "20:00",
        max_students: maxStudents || 10,
      },
    ]);
  };

  const handleUpdateShift = (index: number, field: string, val: any) => {
    const updated = [...workingShifts];
    updated[index] = { ...updated[index], [field]: val };
    setWorkingShifts(updated);
  };

  const handleRemoveShift = (index: number) => {
    setWorkingShifts(workingShifts.filter((_, i) => i !== index));
  };

  const handleEditClick = (teacher: Teacher) => {
    setIsEditing(true);
    setEditingTeacherId(teacher.id);
    setName(teacher.name);
    setPhone(teacher.phone);
    setEmail(teacher.email || "");
    setSpecialty(teacher.specialty || "");
    setColor(teacher.color || "indigo");
    setMaxStudents(teacher.max_students || 10);
    setAssignedSlotIds(teacher.assigned_slot_ids || []);
    try {
      if (teacher.working_shifts_json) {
        const parsed = JSON.parse(teacher.working_shifts_json);
        if (Array.isArray(parsed)) {
          setWorkingShifts(parsed);
          if (parsed.length > 0 && (!teacher.assigned_slot_ids || teacher.assigned_slot_ids.length === 0)) {
            setActiveScheduleTab("custom");
          }
        } else {
          setWorkingShifts([]);
        }
      } else {
        setWorkingShifts([]);
      }
    } catch {
      setWorkingShifts([]);
    }
  };

  // Helper lấy headers có kèm Authorization token và school_id
  const getRequestHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (schoolId) headers["x-school-id"] = schoolId;
    return headers;
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/teachers/${teacherToDelete.id}`, {
        method: "DELETE",
        headers: getRequestHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        onRefresh();
        if (editingTeacherId === teacherToDelete.id) resetForm();
        setTeacherToDelete(null);
      } else {
        showToast(json.message || "Xóa thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập họ và tên giáo viên!", "error");
      return;
    }
    if (!phone.trim()) {
      showToast("Vui lòng nhập số điện thoại giáo viên!", "error");
      return;
    }

    try {
      setIsSaving(true);
      const url = isEditing ? `/api/teachers/${editingTeacherId}` : "/api/teachers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getRequestHeaders(),
        body: JSON.stringify({
          school_id: schoolId || undefined,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          specialty: specialty.trim(),
          color,
          max_students: Number(maxStudents) || 10,
          assigned_slot_ids: assignedSlotIds,
          working_shifts_json: JSON.stringify(workingShifts),
          is_active: 1,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || (isEditing ? "Cập nhật thành công!" : "Thêm giáo viên mới thành công!"), "success");
        resetForm();
        onRefresh();
      } else {
        showToast(json.message || "Không thể lưu thông tin giáo viên!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ API!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Thống kê nhanh đội ngũ
  const stats = useMemo(() => {
    const totalTeachers = teachers.length;
    const totalStudentsTaught = teachers.reduce((acc, t) => acc + (t.student_count || 0), 0);
    const subjectsSet = new Set<string>();
    teachers.forEach((t) => {
      if (t.specialty) {
        t.specialty.split(/[,/+-]/).forEach((s) => {
          const trimmed = s.trim();
          if (trimmed) subjectsSet.add(trimmed);
        });
      }
    });
    return {
      totalTeachers,
      totalStudentsTaught,
      subjectsCount: subjectsSet.size,
    };
  }, [teachers]);

  // Bộ lọc danh sách giáo viên
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchQuery =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.phone.includes(searchQuery.trim()) ||
        (t.specialty && t.specialty.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.email && t.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSubject =
        selectedSubjectFilter === "ALL" ||
        (t.specialty && t.specialty.toLowerCase().includes(selectedSubjectFilter.toLowerCase()));

      return matchQuery && matchSubject;
    });
  }, [teachers, searchQuery, selectedSubjectFilter]);

  const getColorMeta = (colorVal?: string) => {
    return COLOR_PRESETS.find((c) => c.val === colorVal) || COLOR_PRESETS[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto font-sans animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* ================= HEADER TRỰC QUAN & CAO CẤP ================= */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-white dark:from-slate-900 dark:via-indigo-950/20 dark:to-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 ring-4 ring-indigo-50 dark:ring-indigo-950/50">
              <GraduationCap className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Quản Lý Đội Ngũ Giáo Viên
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                  <Users className="w-3 h-3" />
                  {teachers.length} Thầy/Cô
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hồ sơ giảng dạy, chuyên môn bộ môn và phân công lịch phụ trách lớp học
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Metrics Badge (Desktop) */}
            <div className="hidden lg:flex items-center gap-4 px-3.5 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>{stats.totalStudentsTaught} HS đang học</span>
              </div>
              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Music className="w-4 h-4 text-indigo-500" />
                <span>{stats.subjectsCount} Bộ môn</span>
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
        </div>

        {/* ================= TABS CHÍNH: HỒ SƠ VS ĐƠN XIN NGHỈ ================= */}
        <div className="px-6 pt-2 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMainTab("teachers")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeMainTab === "teachers"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Danh Sách & Lịch Giảng Dạy ({teachers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMainTab("leaves")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeMainTab === "leaves"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <CalendarX className="w-4 h-4 text-rose-500" />
              <span>2. Đơn Xin Nghỉ Của Giáo Viên</span>
              {pendingLeavesCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                  {pendingLeavesCount} chờ duyệt
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-semibold">({teacherLeaves.length})</span>
              )}
            </button>
          </div>
        </div>

        {/* ================= TAB 1: DANH SÁCH GIÁO VIÊN ================= */}
        {activeMainTab === "teachers" && (
        <div className="p-4 sm:p-6 overflow-hidden flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 bg-slate-50/50 dark:bg-slate-950/30">
          
          {/* ================= CỘT TRÁI (5 PHẦN): FORM NHẬP LIỆU CHUYÊN NGHIỆP ================= */}
          <div className="lg:col-span-5 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            {/* Header Form */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isEditing ? "bg-amber-500 animate-pulse" : "bg-indigo-600"}`} />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  {isEditing ? <Edit2 className="w-3.5 h-3.5 text-amber-500" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
                  {isEditing ? "Cập Nhật Hồ Sơ Giáo Viên" : "Thêm Giáo Viên Mới"}
                </span>
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  ✕ Hủy chế độ sửa
                </button>
              )}
            </div>

            {/* Form scroll riêng */}
            <form id="teacher-management-form" onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
              
              {/* NHÓM 1: THÔNG TIN CƠ BẢN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Thông tin cá nhân
                  </span>
                  <span className="text-[10px] text-slate-400 italic">Bắt buộc họ tên & SĐT</span>
                </div>

                {/* Họ tên */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Họ và tên giáo viên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="VD: Thầy Phong, Cô Điệp, Thầy Phát..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                    />
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* SĐT & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Số điện thoại <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Email liên hệ
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="giaovien@email.com"
                        className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* NHÓM 2: CHUYÊN MÔN & QUY MÔ LỚP */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Music className="w-3.5 h-3.5" /> Chuyên môn & Quy mô ca dạy
                  </span>
                </div>

                {/* Chuyên môn */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Bộ môn giảng dạy
                  </label>
                  <div className="relative mb-2">
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="VD: Piano, Guitar, Organ..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 transition"
                    />
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  </div>

                  {/* Gợi ý chọn nhanh bộ môn */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-bold">Chọn nhanh:</span>
                    {QUICK_SUBJECTS.map((sub) => {
                      const isSelected = specialty.toLowerCase().includes(sub.toLowerCase());
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            if (!specialty) {
                              setSpecialty(sub);
                            } else if (!isSelected) {
                              setSpecialty(`${specialty}, ${sub}`);
                            }
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          + {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Màu đại diện giáo viên */}
                <div className="pt-1">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                        Màu đại diện
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {getColorMeta(color).name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => setColor(c.val)}
                          title={c.name}
                          className={`w-6 h-6 rounded-xl ${c.bg} flex items-center justify-center text-white transition-all cursor-pointer ${
                            color === c.val
                              ? "ring-2 ring-offset-2 ring-indigo-500 scale-110 shadow-sm"
                              : "opacity-60 hover:opacity-100 hover:scale-105"
                          }`}
                        >
                          {color === c.val && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Hướng dẫn: Phân công giáo viên theo ca trong Quản lý Lớp học */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold">Cơ chế quản lý phân ca:</span>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Tại đây chỉ lưu hồ sơ thông tin Thầy/Cô. Để phân công giáo viên vào từng ca dạy cụ thể trong ngày (ví dụ: 17h-18h Cô Điệp, 18h-20h Thầy Phong), bạn mở tính năng <strong>Quản Lý Lớp Học</strong>.
                  </p>
                </div>
              </div>

              {/* Nút Submit phụ trong form */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-2 py-3 px-4 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Đang lưu thông tin..." : isEditing ? "Lưu Cập Nhật Giáo Viên" : "+ Lưu & Thêm Giáo Viên"}</span>
              </button>
            </form>
          </div>

          {/* ================= CỘT PHẢI (7 PHẦN): DANH SÁCH GIÁO VIÊN CAO CẤP ================= */}
          <div className="lg:col-span-7 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
            
            {/* Header Danh Sách & Tìm kiếm */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Danh Sách Giáo Viên
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                    {filteredTeachers.length} / {teachers.length}
                  </span>
                </div>

                {isEditing && (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 rounded-xl border border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Đang chỉnh sửa
                  </span>
                )}
              </div>

              {/* Ô Search & Filter Chuyên Môn */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên giáo viên, SĐT, chuyên môn..."
                    className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Bộ Môn */}
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 text-xs font-bold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả môn</option>
                  {QUICK_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* List giáo viên có scroll riêng */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
              {filteredTeachers.map((tc) => {
                const colorMeta = getColorMeta(tc.color);
                const isCurrentEditing = editingTeacherId === tc.id;

                return (
                  <div
                    key={tc.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs ${
                      isCurrentEditing
                        ? "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-400/50"
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-300 dark:hover:border-slate-700 hover:shadow-md"
                    }`}
                  >
                    {/* Cụm thông tin Giáo viên */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Avatar lớn kèm huy hiệu */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-12 h-12 rounded-2xl text-white font-black text-base flex items-center justify-center shadow-md ${colorMeta.bg} ring-2 ring-white dark:ring-slate-900`}
                        >
                          {tc.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center" title="Đang hoạt động" />
                      </div>

                      {/* Chi tiết */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {tc.name}
                          </h3>
                          {tc.specialty && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                              {tc.specialty}
                            </span>
                          )}
                        </div>

                        {/* Thông tin phụ: SĐT, Email */}
                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <a
                            href={`tel:${tc.phone}`}
                            className="flex items-center gap-1 font-mono font-bold hover:text-indigo-600 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {tc.phone}
                          </a>
                          {tc.email && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="w-3.5 h-3.5 text-slate-400" /> {tc.email}
                            </span>
                          )}
                        </div>

                        {/* Thống kê học sinh */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50">
                            <UserCheck className="w-3 h-3" /> {tc.student_count || 0} học viên phụ trách
                          </span>

                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                            <Layers className="w-3 h-3 text-indigo-500" /> Phân ca tại Quản Lý Lớp Học
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons (Sửa / Xóa) */}
                    <div className="flex sm:flex-col items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleEditClick(tc)}
                        className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                          isCurrentEditing
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700"
                        }`}
                        title="Chỉnh sửa thông tin"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Sửa</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTeacherToDelete(tc)}
                        className="p-2 text-rose-500 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:hover:bg-rose-600 rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Xóa giáo viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="sm:hidden">Xóa</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty state khi không có giáo viên */}
              {filteredTeachers.length === 0 && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {searchQuery ? "Không tìm thấy giáo viên phù hợp" : "Chưa có giáo viên nào"}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      {searchQuery
                        ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc bộ môn."
                        : "Điền họ tên và số điện thoại ở khung bên trái rồi bấm Thêm Giáo Viên để bắt đầu."}
                    </p>
                  </div>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedSubjectFilter("ALL");
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition cursor-pointer"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* ================= TAB 2: ĐƠN XIN NGHỈ CỦA GIÁO VIÊN ================= */}
        {activeMainTab === "leaves" && (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50 dark:bg-slate-950/30">
            {/* Header / Filter */}
            <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarX className="w-4 h-4 text-rose-500" />
                  <span>Danh Sách Đơn Xin Nghỉ Của Giáo Viên</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Xem lý do xin nghỉ, phê duyệt và phân công giáo viên khác dạy thay
                </p>
              </div>

              <button
                type="button"
                onClick={loadTeacherLeaves}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Làm mới
              </button>
            </div>

            {/* Danh sách đơn xin nghỉ */}
            {teacherLeaves.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                <CalendarCheck className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Chưa có đơn xin nghỉ nào từ giáo viên
                </p>
                <p className="text-xs text-slate-500">
                  Khi giáo viên gửi đơn từ Cổng Giáo Viên (/giao-vien), các đơn xin nghỉ sẽ xuất hiện tại đây để bạn phê duyệt.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teacherLeaves.map((leave) => {
                  const dayName = getDayNameVi(leave.leave_date);
                  const [ly, lm, ld] = leave.leave_date.split("-");

                  return (
                    <div
                      key={leave.id}
                      className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black flex items-center justify-center text-xs">
                              {leave.teacher_name?.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                                {leave.teacher_name}
                              </h4>
                              <p className="text-xs text-slate-400">{leave.teacher_phone}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {leave.status === "approved" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                                <Check className="w-3.5 h-3.5" /> Đã duyệt
                              </span>
                            ) : leave.status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                                <X className="w-3.5 h-3.5" /> Từ chối
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> Chờ duyệt
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Chi tiết ca xin nghỉ */}
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                            <span className="text-rose-600 dark:text-rose-400">📅 Ngày nghỉ:</span>
                            <span>{dayName}, {ld}/{lm}/{ly}</span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Ca dạy: <strong className="text-slate-800 dark:text-slate-200">{leave.shift_desc || "Cả ngày"}</strong>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">
                            Lý do: <span className="italic text-slate-800 dark:text-slate-200">&ldquo;{leave.reason}&rdquo;</span>
                          </div>
                          {leave.substitute_teacher_name && (
                            <div className="text-indigo-600 dark:text-indigo-400 font-bold pt-1">
                              👤 Người dạy thay: {leave.substitute_teacher_name}
                            </div>
                          )}
                          {leave.admin_note && (
                            <div className="text-slate-500 text-[11px] pt-0.5">
                              Phản hồi: &ldquo;{leave.admin_note}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nút hành động cho Admin */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDeleteLeave(leave.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition cursor-pointer"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenLeaveAction(leave, "reject")}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 text-rose-700 dark:text-rose-400 font-bold text-xs transition cursor-pointer"
                          >
                            Từ chối
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLeaveAction(leave, "approve")}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{leave.status === "approved" ? "Sửa dạy thay" : "Duyệt & Gán Dạy Thay"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= FOOTER ĐỒNG BỘ NÚT BẤM ================= */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {activeMainTab === "teachers" ? (
              isEditing ? (
                <span>
                  Đang sửa: <strong className="text-amber-600 dark:text-amber-400">{name || "Giáo viên"}</strong>
                </span>
              ) : (
                <span>Hệ thống tự động đồng bộ hồ sơ giáo viên sang Sơ đồ lớp và Cổng GV</span>
              )
            ) : (
              <span>Duyệt đơn xin nghỉ và phân công giáo viên đứng ca thay thế</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Đóng
            </button>

            {activeMainTab === "teachers" && (
              <button
                type="submit"
                form="teacher-management-form"
                disabled={isSaving}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer flex items-center gap-2 active:scale-95 rounded-2xl"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Đang lưu..." : isEditing ? "Cập Nhật Giáo Viên" : "+ Thêm Giáo Viên"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= MODAL DUYỆT / TỪ CHỐI ĐƠN XIN NGHỈ ================= */}
        {actionLeaveModal.isOpen && actionLeaveModal.leave && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  {actionLeaveModal.type === "approve" ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Phê Duyệt Đơn & Gán Dạy Thay</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-rose-600" />
                      <span>Từ Chối Đơn Xin Nghỉ</span>
                    </>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setActionLeaveModal({ isOpen: false, leave: null, type: "approve" })}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
                <p>
                  Giáo viên xin nghỉ: <strong className="text-slate-900 dark:text-white">{actionLeaveModal.leave.teacher_name}</strong>
                </p>
                <p>
                  Ngày nghỉ: <strong>{actionLeaveModal.leave.leave_date}</strong> ({actionLeaveModal.leave.shift_desc || "Cả ngày"})
                </p>
                <p className="text-slate-600 dark:text-slate-400 italic">
                  Lý do: &ldquo;{actionLeaveModal.leave.reason}&rdquo;
                </p>
              </div>

              {actionLeaveModal.type === "approve" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phân công giáo viên dạy thay (Tùy chọn)
                  </label>
                  <select
                    value={substituteTeacherId}
                    onChange={(e) => setSubstituteTeacherId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="">-- Không gán người dạy thay / Tự học viên tự quản --</option>
                    {teachers
                      .filter((t) => t.id !== actionLeaveModal.leave?.teacher_id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          Thầy/Cô {t.name} ({t.specialty || "Giáo viên"})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {actionLeaveModal.type === "approve" ? "Ghi chú phản hồi cho giáo viên" : "Lý do từ chối gửi giáo viên *"}
                </label>
                <textarea
                  rows={2}
                  required={actionLeaveModal.type === "reject"}
                  value={adminResponseNote}
                  onChange={(e) => setAdminResponseNote(e.target.value)}
                  placeholder="Nhập nội dung phản hồi gửi đến Cổng Giáo Viên..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionLeaveModal({ isOpen: false, leave: null, type: "approve" })}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isSubmittingLeaveAction}
                  onClick={handleExecuteLeaveAction}
                  className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition cursor-pointer disabled:opacity-50 ${
                    actionLeaveModal.type === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isSubmittingLeaveAction ? "Đang xử lý..." : actionLeaveModal.type === "approve" ? "Xác Nhận Phê Duyệt" : "Xác Nhận Từ Chối"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= MODAL XÁC NHẬN XÓA GIÁO VIÊN ================= */}
        {teacherToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto ring-4 ring-rose-50 dark:ring-rose-950/30">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa giáo viên?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn có chắc chắn muốn xóa giáo viên <strong className="text-slate-800 dark:text-slate-200">{teacherToDelete.name}</strong> ({teacherToDelete.phone})?
                </p>
                {teacherToDelete.student_count && teacherToDelete.student_count > 0 ? (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200 dark:border-amber-900/60 mt-2">
                    Lưu ý: Giáo viên này đang phụ trách {teacherToDelete.student_count} học sinh. Các học sinh sẽ được chuyển về trạng thái Chưa gán giáo viên.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTeacherToDelete(null)}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDeleteTeacher}
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
