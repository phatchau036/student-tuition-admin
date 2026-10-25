"use client";

import React, { useState } from "react";
import { Teacher } from "@/lib/types";
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
} from "lucide-react";

interface TeacherManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  onRefresh: () => void;
}

export const TeacherManagementModal: React.FC<TeacherManagementModalProps> = ({
  isOpen,
  onClose,
  teachers,
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
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setIsEditing(false);
    setEditingTeacherId(null);
    setName("");
    setPhone("");
    setEmail("");
    setSpecialty("");
    setColor("indigo");
  };

  const handleEditClick = (teacher: Teacher) => {
    setIsEditing(true);
    setEditingTeacherId(teacher.id);
    setName(teacher.name);
    setPhone(teacher.phone);
    setEmail(teacher.email || "");
    setSpecialty(teacher.specialty || "");
    setColor(teacher.color || "indigo");
  };

  const handleDeleteTeacher = async (teacher: Teacher) => {
    if (confirm(`Bạn có chắc chắn muốn xóa giáo viên "${teacher.name}"?`)) {
      try {
        const res = await fetch(`/api/teachers/${teacher.id}`, { method: "DELETE" });
        const json = await res.json();
        if (json.success) {
          showToast(json.message, "success");
          onRefresh();
          if (editingTeacherId === teacher.id) resetForm();
        } else {
          showToast(json.message || "Xóa thất bại!", "error");
        }
      } catch {
        showToast("Lỗi kết nối máy chủ!", "error");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập tên giáo viên!", "error");
      return;
    }
    if (!phone.trim()) {
      showToast("Vui lòng nhập số điện thoại!", "error");
      return;
    }

    try {
      setIsSaving(true);
      const url = isEditing ? `/api/teachers/${editingTeacherId}` : "/api/teachers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          specialty: specialty.trim(),
          color,
          is_active: 1,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        resetForm();
        onRefresh();
      } else {
        showToast(json.message || "Không thể lưu thông tin giáo viên!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-indigo-600" />
              Quản Lý Đội Ngũ Giáo Viên
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Thêm mới, quản lý thông tin và phân công phụ trách học sinh
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body: Split Left (List) & Right (Form) */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Teacher Form (2 Cols on desktop) */}
          <div className="md:col-span-2 bg-slate-50/80 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  {isEditing ? <Edit2 className="w-3.5 h-3.5 text-indigo-600" /> : <Plus className="w-3.5 h-3.5 text-indigo-600" />}
                  {isEditing ? "Sửa Giáo Viên" : "Thêm Giáo Viên Mới"}
                </span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-[11px] text-indigo-600 hover:underline"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Thầy/Cô Nguyễn Văn B"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Email (Tùy chọn)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="giaovien@email.com"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Chuyên môn / Bộ môn
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Bộ môn giảng dạy (Piano, Guitar, Thanh nhạc...)"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Màu sắc thẻ đại diện
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
                      className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center text-white transition ring-offset-2 ${
                        color === c.val ? "ring-2 ring-slate-900 dark:ring-white scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                    >
                      {color === c.val && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full mt-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
              >
                {isSaving ? "Đang lưu..." : isEditing ? "Cập Nhật Giáo Viên" : "Thêm Giáo Viên"}
              </button>
            </form>
          </div>

          {/* Teacher List (3 Cols on desktop) */}
          <div className="md:col-span-3 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Danh Sách Giáo Viên ({teachers.length})</span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {teachers.map((tc) => (
                <div
                  key={tc.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0 ${
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

                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                        <span>{tc.name}</span>
                        {tc.specialty && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {tc.specialty}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3" /> {tc.phone}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> {tc.student_count || 0} học sinh phụ trách
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEditClick(tc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                      title="Sửa thông tin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(tc)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      title="Xóa giáo viên"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {teachers.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Chưa có giáo viên nào trong danh sách. Hãy thêm giáo viên ở khung bên trái.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50/70 dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
