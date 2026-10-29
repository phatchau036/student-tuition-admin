"use client";

import React, { useState } from "react";
import { Teacher, TimeSlot } from "@/lib/types";
import { formatTimeSlotLabel } from "@/lib/tuition";
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
  Sparkles,
  Clock,
  Calendar,
  Save,
} from "lucide-react";

interface TeacherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  timeSlots?: TimeSlot[];
  schoolId?: string;
  onRefresh: () => void;
}

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

  // Custom Delete Confirm state
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  };

  const toggleSlotAssignment = (slotId: string) => {
    if (assignedSlotIds.includes(slotId)) {
      setAssignedSlotIds(assignedSlotIds.filter((id) => id !== slotId));
    } else {
      setAssignedSlotIds([...assignedSlotIds, slotId]);
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
        if (Array.isArray(parsed)) setWorkingShifts(parsed);
        else setWorkingShifts([]);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Quản Lý Đội Ngũ Giáo Viên
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thêm mới, quản lý thông tin và phân công phụ trách học sinh
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

        {/* Content Body: Split Left (Form with scroll) & Right (List) */}
        <div className="p-5 overflow-hidden flex-1 grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* CỘT TRÁI: FORM NHẬP LIỆU (Có scroll riêng, không bao giờ bị tràn mất nút) */}
          <div className="md:col-span-2 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2.5 mb-3 shrink-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                {isEditing ? <Edit2 className="w-3.5 h-3.5 text-indigo-600" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
                {isEditing ? "Chỉnh Sửa Giáo Viên" : "Thêm Giáo Viên Mới"}
              </span>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            {/* Vùng cuộn riêng cho form */}
            <form id="teacher-management-form" onSubmit={handleSubmit} className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-thin">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Thầy/Cô Nguyễn Văn B"
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="giaovien@email.com"
                    className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                    Chuyên môn
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    placeholder="Piano, Guitar..."
                    className="w-full px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sĩ số tối đa giáo viên nhận trong 1 ca */}
              <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Sĩ số tối đa dạy / ca:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={maxStudents}
                      onChange={(e) => setMaxStudents(Number(e.target.value) || 10)}
                      className="w-14 px-2 py-1 text-xs font-black text-center rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-bold text-slate-500">học sinh</span>
                  </div>
                </div>
              </div>

              {/* Ca làm việc riêng linh hoạt theo tuần của giáo viên */}
              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Lịch ca riêng ({workingShifts.length}):
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddShift}
                    className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm ca
                  </button>
                </div>

                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-0.5 scrollbar-thin">
                  {workingShifts.map((shift, idx) => (
                    <div
                      key={shift.id || idx}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1 text-[11px]"
                    >
                      <select
                        value={shift.day}
                        onChange={(e) => handleUpdateShift(idx, "day", e.target.value)}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
                      >
                        {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"].map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 font-mono text-[10px]">
                        <input
                          type="time"
                          value={shift.start_time}
                          onChange={(e) => handleUpdateShift(idx, "start_time", e.target.value)}
                          className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={shift.end_time}
                          onChange={(e) => handleUpdateShift(idx, "end_time", e.target.value)}
                          className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveShift(idx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {workingShifts.length === 0 && (
                    <span className="text-[10px] text-slate-400 italic block text-center py-1">
                      Mặc định theo các ca mở cửa bên dưới
                    </span>
                  )}
                </div>
              </div>

              {/* Phân công ca dạy / khung giờ phụ trách */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Phân công ca mở cửa:</span>
                </label>
                <div className="space-y-1 max-h-28 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 scrollbar-thin">
                  {timeSlots.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic block text-center py-1">
                      Chưa cấu hình ca mở cửa nào
                    </span>
                  ) : (
                    timeSlots.map((slot) => {
                      const isAssigned = assignedSlotIds.includes(slot.id);
                      return (
                        <div
                          key={slot.id}
                          onClick={() => toggleSlotAssignment(slot.id)}
                          className={`p-1.5 rounded-lg border text-[11px] font-bold cursor-pointer transition flex items-center justify-between gap-1.5 ${
                            isAssigned
                              ? "bg-indigo-50 border-indigo-400 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                              : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <div
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                isAssigned ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {isAssigned && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span className="truncate">{formatTimeSlotLabel(slot)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Màu đại diện */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                  Màu huy hiệu
                </label>
                <div className="flex gap-2">
                  {[
                    { val: "indigo", bg: "bg-indigo-500" },
                    { val: "emerald", bg: "bg-emerald-500" },
                    { val: "amber", bg: "bg-amber-500" },
                    { val: "rose", bg: "bg-rose-500" },
                    { val: "purple", bg: "bg-purple-500" },
                  ].map((c) => (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => setColor(c.val)}
                      className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center text-white transition cursor-pointer ${
                        color === c.val ? "ring-2 ring-indigo-600 scale-110 shadow-sm" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {color === c.val && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nút lưu trong form */}
              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-2 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Đang lưu..." : isEditing ? "Cập Nhật Giáo Viên" : "Thêm Giáo Viên"}</span>
              </button>
            </form>
          </div>

          {/* CỘT PHẢI: DANH SÁCH GIÁO VIÊN HIỆN CÓ (3 Cols on desktop) */}
          <div className="md:col-span-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <span>Danh Sách Giáo Viên ({teachers.length})</span>
            </div>

            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 pt-3 scrollbar-thin">
              {teachers.map((tc) => (
                <div
                  key={tc.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-slate-700 transition flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 ${
                        tc.color === "emerald"
                          ? "bg-emerald-600"
                          : tc.color === "amber"
                          ? "bg-amber-600"
                          : tc.color === "rose"
                          ? "bg-rose-600"
                          : tc.color === "purple"
                          ? "bg-purple-600"
                          : "bg-indigo-600"
                      }`}
                    >
                      {tc.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                        <span className="truncate">{tc.name}</span>
                        {tc.specialty && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                            {tc.specialty}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-mono font-semibold">
                          <Phone className="w-3 h-3 text-slate-400" /> {tc.phone}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> {tc.student_count || 0} học viên
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3" /> Tối đa {tc.max_students || 10} HS/ca
                        </span>
                      </div>

                      {/* Display assigned time slots */}
                      {tc.assigned_slot_ids && tc.assigned_slot_ids.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-indigo-500" /> Ca:
                          </span>
                          {tc.assigned_slot_ids.map((sId) => {
                            const matchedSlot = timeSlots.find((s) => s.id === sId);
                            if (!matchedSlot) return null;
                            return (
                              <span
                                key={sId}
                                className="px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40"
                              >
                                {matchedSlot.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditClick(tc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
                      title="Sửa thông tin giáo viên"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeacherToDelete(tc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      title="Xóa giáo viên"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {teachers.length === 0 && (
                <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  Chưa có giáo viên nào trong danh sách. Hãy điền thông tin ở khung bên trái và bấm Thêm Giáo Viên.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer: Cung cấp nút lưu trực tiếp luôn hiển thị rõ ràng */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            {isEditing ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                Đang chỉnh sửa: <strong>{name}</strong>
              </span>
            ) : (
              <span>Điền họ tên & số điện thoại để ghi nhận giáo viên</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              Đóng
            </button>

            {/* Nút hành động chính tại Footer: kết nối thẳng vào form bằng form="teacher-management-form" */}
            <button
              type="submit"
              form="teacher-management-form"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md shadow-indigo-600/25 disabled:opacity-50 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Đang lưu..." : isEditing ? "Cập Nhật Giáo Viên" : "+ Thêm Giáo Viên"}</span>
            </button>
          </div>
        </div>

        {/* Custom Delete Teacher Modal */}
        {teacherToDelete && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác nhận xóa giáo viên?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Bạn có chắc chắn muốn xóa giáo viên <strong className="text-slate-800 dark:text-slate-200">{teacherToDelete.name}</strong> ({teacherToDelete.phone})?
                </p>
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
