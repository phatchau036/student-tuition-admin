"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SchoolAdmin, AdminRole, Teacher, TimeSlot, ADMIN_PERMISSION_GROUPS } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  ShieldCheck,
  Users,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  Lock,
  Unlock,
  Check,
  Copy,
  X,
  UserCheck,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Square,
  Save,
  RefreshCw,
  GraduationCap,
  Phone,
  Mail,
  BookOpen,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  Info,
} from "lucide-react";

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string;
  schoolName?: string;
  teachers?: Teacher[];
  timeSlots?: TimeSlot[];
  onRefresh?: () => void;
  initialTab?: "teachers" | "staff" | "roles";
}

const COLOR_PRESETS = [
  { val: "indigo", name: "Chàm", bg: "bg-indigo-600", light: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800" },
  { val: "emerald", name: "Ngọc", bg: "bg-emerald-600", light: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800" },
  { val: "amber", name: "Hổ phách", bg: "bg-amber-600", light: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800" },
  { val: "rose", name: "Hoa hồng", bg: "bg-rose-600", light: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800" },
  { val: "purple", name: "Tím Huế", bg: "bg-purple-600", light: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800" },
  { val: "sky", name: "Da trời", bg: "bg-sky-600", light: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800" },
];

const QUICK_SUBJECTS = ["Piano", "Guitar", "Organ", "Thanh nhạc", "Violin", "Trống", "Hội họa"];

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName = "Trung tâm",
  teachers = [],
  timeSlots = [],
  onRefresh,
  initialTab = "teachers",
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"teachers" | "staff" | "roles">(initialTab);

  // Data state
  const [staffList, setStaffList] = useState<SchoolAdmin[]>([]);
  const [rolesList, setRolesList] = useState<AdminRole[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>(teachers);
  const [isLoading, setIsLoading] = useState(false);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Sync teachers from props
  useEffect(() => {
    setTeachersList(teachers);
  }, [teachers]);

  // =========================================================================
  // 1. TEACHER FORM STATE (Tab Đội Ngũ Giáo Viên)
  // =========================================================================
  const [isTeacherFormOpen, setIsTeacherFormOpen] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherSpecialty, setTeacherSpecialty] = useState("Piano");
  const [teacherColor, setTeacherColor] = useState("indigo");
  const [isSavingTeacher, setIsSavingTeacher] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // =========================================================================
  // 2. STAFF FORM STATE (Tab Nhân Viên Quản Trị /admin)
  // =========================================================================
  const [isStaffFormOpen, setIsStaffFormOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFullName, setStaffFullName] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffRoleId, setStaffRoleId] = useState("");
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    fullName: string;
    username: string;
    password: string;
    roleName: string;
  } | null>(null);

  // =========================================================================
  // 3. ROLE FORM STATE (Tab Nhóm Quyền & Vai Trò RBAC)
  // =========================================================================
  const [isRoleFormOpen, setIsRoleFormOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSavingRole, setIsSavingRole] = useState(false);

  const getHeaders = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (schoolId) headers["x-school-id"] = schoolId;
    return headers;
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const q = schoolId ? `?school_id=${encodeURIComponent(schoolId)}` : "";
      const [staffRes, rolesRes, tcRes] = await Promise.all([
        fetch(`/api/admin/staff${q}`, { headers: getHeaders() }),
        fetch(`/api/admin/roles${q}`, { headers: getHeaders() }),
        fetch(`/api/teachers${q}`, { headers: getHeaders() }),
      ]);
      const staffJson = await staffRes.json();
      const rolesJson = await rolesRes.json();
      const tcJson = await tcRes.json();

      if (staffJson.success) setStaffList(staffJson.data || []);
      if (rolesJson.success) setRolesList(rolesJson.data || []);
      if (tcJson.success) setTeachersList(tcJson.data || []);
    } catch {
      showToast("Không thể tải danh sách tài khoản & vai trò!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, schoolId]);

  // =========================================================================
  // XỬ LÝ GIÁO VIÊN (TEACHER HANDLERS)
  // =========================================================================
  const resetTeacherForm = () => {
    setEditingTeacherId(null);
    setTeacherName("");
    setTeacherPhone("");
    setTeacherEmail("");
    setTeacherSpecialty("Piano");
    setTeacherColor("indigo");
    setIsTeacherFormOpen(false);
  };

  const handleOpenEditTeacher = (tc: Teacher) => {
    setEditingTeacherId(tc.id);
    setTeacherName(tc.name);
    setTeacherPhone(tc.phone);
    setTeacherEmail(tc.email || "");
    setTeacherSpecialty(tc.specialty || "Piano");
    setTeacherColor(tc.color || "indigo");
    setIsTeacherFormOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) {
      showToast("Vui lòng nhập họ và tên giáo viên!", "error");
      return;
    }
    if (!teacherPhone.trim()) {
      showToast("Vui lòng nhập số điện thoại (dùng làm tài khoản đăng nhập Cổng Giáo Viên)!", "error");
      return;
    }

    try {
      setIsSavingTeacher(true);
      const isEditing = Boolean(editingTeacherId);
      const url = isEditing ? `/api/teachers/${editingTeacherId}` : "/api/teachers";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify({
          school_id: schoolId || undefined,
          name: teacherName.trim(),
          phone: teacherPhone.trim(),
          email: teacherEmail.trim(),
          specialty: teacherSpecialty.trim(),
          color: teacherColor,
          max_students: 10,
          is_active: 1,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(
          json.message ||
            (isEditing
              ? "Cập nhật thông tin giáo viên thành công!"
              : `Đã tạo tài khoản Cổng Giáo Viên cho ${teacherName.trim()} (SĐT: ${teacherPhone.trim()})!`),
          "success"
        );
        resetTeacherForm();
        loadData();
        onRefresh?.();
      } else {
        showToast(json.message || "Không thể lưu thông tin giáo viên!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingTeacher(false);
    }
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      setIsDeletingTeacher(true);
      const res = await fetch(`/api/teachers/${teacherToDelete.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || "Đã xóa giáo viên thành công!", "success");
        setTeacherToDelete(null);
        loadData();
        onRefresh?.();
      } else {
        showToast(json.message || "Xóa thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  const handleCopyTeacherInvite = (tc: Teacher) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const msg = `Kính gửi Thầy/Cô ${tc.name},
${schoolName} xin gửi thông tin đăng nhập Cổng Giáo Viên:
• Đường dẫn: ${origin}/giao-vien
• Tài khoản đăng nhập (SĐT): ${tc.phone}
• Quyền hạn: Xem lịch ca dạy, điểm danh học viên, chấm sao, nhận xét bài học và gửi đơn xin nghỉ dạy.
Thầy/Cô vui lòng truy cập để theo dõi ca dạy nhé!`;

    navigator.clipboard.writeText(msg);
    showToast(`Đã sao chép hướng dẫn đăng nhập Zalo cho ${tc.name}!`, "success");
  };

  // =========================================================================
  // XỬ LÝ NHÂN VIÊN (STAFF HANDLERS)
  // =========================================================================
  const resetStaffForm = () => {
    setEditingStaffId(null);
    setStaffFullName("");
    setStaffUsername("");
    setStaffPassword("");
    setStaffPhone("");
    setStaffRoleId(rolesList.find((r) => r.is_system !== 1)?.id || "");
    setIsStaffFormOpen(false);
  };

  const handleGeneratePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 6; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffPassword(pwd);
  };

  const handleOpenCreateStaff = () => {
    resetStaffForm();
    handleGeneratePassword();
    setIsStaffFormOpen(true);
  };

  const handleOpenEditStaff = (staff: SchoolAdmin) => {
    setEditingStaffId(staff.id);
    setStaffFullName(staff.full_name);
    setStaffUsername(staff.username);
    setStaffPassword("");
    setStaffPhone(staff.phone || "");
    setStaffRoleId(staff.role_id || "");
    setIsStaffFormOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim() || !staffUsername.trim()) {
      showToast("Vui lòng nhập họ tên và tên đăng nhập!", "error");
      return;
    }
    if (!editingStaffId && !staffPassword) {
      showToast("Vui lòng nhập hoặc tự sinh mật khẩu cho nhân viên!", "error");
      return;
    }
    if (!staffRoleId) {
      showToast("Vui lòng chọn vai trò phân quyền cho nhân viên!", "error");
      return;
    }

    try {
      setIsSavingStaff(true);
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          id: editingStaffId || undefined,
          school_id: schoolId,
          full_name: staffFullName.trim(),
          username: staffUsername.trim().toLowerCase(),
          password: staffPassword.trim() || undefined,
          phone: staffPhone.trim(),
          role_id: staffRoleId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        if (!editingStaffId) {
          const selectedRole = rolesList.find((r) => r.id === staffRoleId);
          setCreatedCredentials({
            fullName: staffFullName.trim(),
            username: staffUsername.trim().toLowerCase(),
            password: staffPassword.trim(),
            roleName: selectedRole ? selectedRole.name : "Nhân viên",
          });
        }
        resetStaffForm();
        loadData();
      } else {
        showToast(data.message || "Không thể lưu tài khoản nhân viên!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleToggleStaffActive = async (staff: SchoolAdmin) => {
    if (staff.is_owner === 1) {
      showToast("Không thể khóa tài khoản Chủ cơ sở!", "error");
      return;
    }
    try {
      const nextActive = staff.is_active === 1 ? 0 : 1;
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "toggle_active",
          id: staff.id,
          is_active: nextActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadData();
      } else {
        showToast(data.message || "Cập nhật trạng thái thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleDeleteStaff = async (staff: SchoolAdmin) => {
    if (staff.is_owner === 1) {
      showToast("Không thể xóa tài khoản Chủ cơ sở!", "error");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản nhân viên "${staff.full_name}" không?`)) return;

    try {
      const res = await fetch(`/api/admin/staff?id=${staff.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadData();
      } else {
        showToast(data.message || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleCopyCredentials = (creds: { fullName: string; username: string; password: string; roleName: string }) => {
    const text = `Tài khoản Quản trị cơ sở:\n- Họ tên: ${creds.fullName}\n- Vai trò: ${creds.roleName}\n- Tên đăng nhập: ${creds.username}\n- Mật khẩu: ${creds.password}`;
    navigator.clipboard.writeText(text);
    showToast("Đã sao chép tài khoản vào clipboard!", "success");
  };

  // =========================================================================
  // XỬ LÝ NHÓM QUYỀN (ROLES HANDLERS)
  // =========================================================================
  const allPermissionKeys = useMemo(() => {
    return ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.id));
  }, []);

  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDesc("");
    setSelectedPermissions([]);
    setIsRoleFormOpen(true);
  };

  const handleOpenEditRole = (role: AdminRole) => {
    if (role.is_system === 1) {
      showToast("Đây là vai trò hệ thống cố định, không thể chỉnh sửa!", "info");
      return;
    }
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleDesc(role.description || "");
    setSelectedPermissions(role.permissions || []);
    setIsRoleFormOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleSelectAllGroupPermissions = (groupId: string) => {
    const group = ADMIN_PERMISSION_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    const groupItemIds = group.items.map((i) => i.id);
    const isAllSelected = groupItemIds.every((id) => selectedPermissions.includes(id));

    if (isAllSelected) {
      setSelectedPermissions(selectedPermissions.filter((id) => !groupItemIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedPermissions, ...groupItemIds]));
      setSelectedPermissions(combined);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showToast("Vui lòng nhập tên nhóm quyền / vai trò!", "error");
      return;
    }

    try {
      setIsSavingRole(true);
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          id: editingRoleId || undefined,
          school_id: schoolId,
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: selectedPermissions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsRoleFormOpen(false);
        loadData();
      } else {
        showToast(data.message || "Không thể lưu nhóm quyền!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: AdminRole) => {
    if (role.is_system === 1) {
      showToast("Không thể xóa vai trò hệ thống mặc định!", "error");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa nhóm quyền "${role.name}" không?`)) return;

    try {
      const res = await fetch(`/api/admin/roles?id=${role.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadData();
      } else {
        showToast(data.message || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Trung Tâm Quản Lý Nhân Sự & Phân Quyền</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {schoolName}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Quản lý tập trung Đội ngũ Giáo viên đứng lớp (/giao-vien) và Tài khoản Nhân viên văn phòng (/admin)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Unified Navigation Tabs */}
        <div className="px-6 pt-2 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* TAB 1: ĐỘI NGŨ GIÁO VIÊN */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("teachers");
                setIsStaffFormOpen(false);
                setIsRoleFormOpen(false);
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "teachers"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400 dark:border-amber-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span>1. Đội Ngũ Giáo Viên ({teachersList.length})</span>
            </button>

            {/* TAB 2: TÀI KHOẢN NHÂN VIÊN */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("staff");
                setIsTeacherFormOpen(false);
                setIsRoleFormOpen(false);
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "staff"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4 text-indigo-500" />
              <span>2. Nhân Viên Quản Trị ({staffList.length})</span>
            </button>

            {/* TAB 3: NHÓM QUYỀN & VAI TRÒ */}
            <button
              type="button"
              onClick={() => {
                setActiveTab("roles");
                setIsTeacherFormOpen(false);
                setIsStaffFormOpen(false);
              }}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                activeTab === "roles"
                  ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400 font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>3. Nhóm Quyền &amp; Vai Trò ({rolesList.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition shrink-0"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* =========================================================================
              TAB 1: ĐỘI NGŨ GIÁO VIÊN (/giao-vien) - VAI TRÒ CỐ ĐỊNH
              ========================================================================= */}
          {activeTab === "teachers" && (
            <div className="space-y-5">
              {/* Top Banner giải thích rõ ràng cơ chế bảo mật */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Quyền hạn hệ thống cố định</span>
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-100">
                      Tài Khoản Giáo Viên Đứng Lớp (Cổng /giao-vien)
                    </h4>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Giáo viên chỉ cần dùng <strong>Số điện thoại</strong> để đăng nhập trên điện thoại. Quyền hạn được <strong>khóa cố định</strong>: Chỉ xem ca dạy, điểm danh, chấm sao, nhận xét bài học và xin nghỉ. <em>Bảo vệ an toàn tuyệt đối, giáo viên không thể xem tiền học phí hay doanh thu cơ sở.</em>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetTeacherForm();
                    setIsTeacherFormOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm Giáo Viên Mới</span>
                </button>
              </div>

              {/* Form Thêm / Sửa Giáo Viên */}
              {isTeacherFormOpen && (
                <form
                  onSubmit={handleSaveTeacher}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-amber-600" />
                      <span>{editingTeacherId ? "Chỉnh Sửa Giáo Viên" : "Thêm Giáo Viên Mới (Cấp Tài Khoản Cố Định)"}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={resetTeacherForm}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Họ và tên giáo viên *
                      </label>
                      <input
                        type="text"
                        required
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="VD: Thầy Hoàng Tuấn, Cô Lan..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Số điện thoại (Tài khoản đăng nhập /giao-vien) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={teacherPhone}
                        onChange={(e) => setTeacherPhone(e.target.value)}
                        placeholder="VD: 0909123456"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Bộ môn giảng dạy
                      </label>
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={teacherSpecialty}
                          onChange={(e) => setTeacherSpecialty(e.target.value)}
                          placeholder="VD: Piano, Guitar..."
                          className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <div className="flex items-center gap-1 flex-wrap">
                          {QUICK_SUBJECTS.map((sub) => (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => setTeacherSpecialty(sub)}
                              className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                                teacherSpecialty === sub
                                  ? "bg-amber-600 text-white border-amber-600 font-bold"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="sm:col-span-1 lg:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email liên hệ (Tùy chọn)
                      </label>
                      <input
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="VD: teacher@gmail.com"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Màu thẻ nhận diện
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.val}
                            type="button"
                            onClick={() => setTeacherColor(preset.val)}
                            className={`w-6 h-6 rounded-full ${preset.bg} transition ${
                              teacherColor === preset.val ? "ring-2 ring-offset-2 ring-amber-500 scale-110" : "opacity-70 hover:opacity-100"
                            }`}
                            title={preset.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Vai trò: Giáo viên đứng lớp (Tự động cấp quyền Cổng Giáo Viên)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetTeacherForm}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingTeacher}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSavingTeacher ? "Đang lưu..." : editingTeacherId ? "Lưu Thay Đổi" : "Tạo Giáo Viên"}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Danh sách Giáo viên */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 font-bold">
                      <th className="py-3 px-4">Giáo Viên</th>
                      <th className="py-3 px-4">Tài Khoản Đăng Nhập (/giao-vien)</th>
                      <th className="py-3 px-4">Bộ Môn</th>
                      <th className="py-3 px-4">Vai Trò &amp; Phân Quyền</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {teachersList.map((tc) => {
                      const colorObj = COLOR_PRESETS.find((c) => c.val === tc.color) || COLOR_PRESETS[0];

                      return (
                        <tr key={tc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl ${colorObj.bg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs`}>
                                {tc.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-white block">
                                  {tc.name}
                                </span>
                                {tc.email && <span className="text-[11px] text-slate-400 block">{tc.email}</span>}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="inline-flex flex-col items-start">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-amber-600" />
                                <span>{tc.phone}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                Đăng nhập bằng SĐT này
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {tc.specialty || "Piano"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                                <Lock className="w-3 h-3 text-amber-600" />
                                <span>Cố định: Giáo viên đứng lớp</span>
                              </span>
                              <p className="text-[10px] text-slate-400">
                                Cổng /giao-vien • Bảo vệ dữ liệu tài chính
                              </p>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Nút Copy Zalo */}
                              <button
                                type="button"
                                onClick={() => handleCopyTeacherInvite(tc)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 text-blue-600 dark:text-blue-400 text-xs font-bold transition cursor-pointer"
                                title="Sao chép hướng dẫn đăng nhập gửi Zalo"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Gửi Zalo</span>
                              </button>

                              {/* Sửa */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(tc)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                                title="Chỉnh sửa giáo viên"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Xóa */}
                              <button
                                type="button"
                                onClick={() => setTeacherToDelete(tc)}
                                className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                                title="Xóa giáo viên"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {teachersList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          Chưa có giáo viên nào trong danh sách. Hãy bấm <strong>&ldquo;+ Thêm Giáo Viên Mới&rdquo;</strong> ở trên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: TÀI KHOẢN NHÂN VIÊN (/admin) - PHÂN QUYỀN TÙY BIẾN
              ========================================================================= */}
          {activeTab === "staff" && (
            <div className="space-y-5">
              {/* Thông báo thông tin tài khoản vừa tạo */}
              {createdCredentials && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-sm">
                      <Sparkles className="w-4 h-4" />
                      <span>Đã tạo tài khoản cho nhân viên: {createdCredentials.fullName}</span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Vai trò: <strong>{createdCredentials.roleName}</strong> | Tên đăng nhập:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-bold">{createdCredentials.username}</code> | Mật khẩu:{" "}
                      <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 font-bold">{createdCredentials.password}</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyCredentials(createdCredentials)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao Chép Tài Khoản</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatedCredentials(null)}
                      className="p-2 text-emerald-700 hover:text-emerald-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Action bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                    Tài Khoản Nhân Viên Văn Phòng / Quản Trị (/admin)
                  </h4>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300/80">
                    Đăng nhập bằng Tên đăng nhập và Mật khẩu. Được phân quyền linh hoạt theo vai trò (Lễ tân, Kế toán...).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateStaff}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tạo Tài Khoản Nhân Viên</span>
                </button>
              </div>

              {/* Form Tạo / Sửa Nhân viên */}
              {isStaffFormOpen && (
                <form
                  onSubmit={handleSaveStaff}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>{editingStaffId ? "Chỉnh Sửa Tài Khoản Nhân Viên" : "Tạo Tài Khoản Nhân Viên Mới"}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsStaffFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Họ và tên nhân viên *
                      </label>
                      <input
                        type="text"
                        required
                        value={staffFullName}
                        onChange={(e) => setStaffFullName(e.target.value)}
                        placeholder="VD: Nguyễn Thị Mai"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        type="tel"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        placeholder="VD: 0909123456"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Vai trò / Nhóm quyền phân công *
                      </label>
                      {rolesList.filter((r) => r.is_system !== 1).length === 0 ? (
                        <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded-xl">
                          Chưa có nhóm quyền nào! Vui lòng sang tab <strong>&ldquo;Nhóm Quyền &amp; Vai Trò&rdquo;</strong> để tạo vai trò trước.
                        </div>
                      ) : (
                        <select
                          value={staffRoleId}
                          onChange={(e) => setStaffRoleId(e.target.value)}
                          className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">-- Chọn vai trò --</option>
                          {rolesList.filter((r) => r.is_system !== 1).map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên đăng nhập (Username) *
                      </label>
                      <input
                        type="text"
                        required
                        disabled={Boolean(editingStaffId)}
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        placeholder="VD: mai.letan"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {editingStaffId ? "Mật khẩu mới (Để trống nếu giữ nguyên)" : "Mật khẩu đăng nhập *"}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required={!editingStaffId}
                          value={staffPassword}
                          onChange={(e) => setStaffPassword(e.target.value)}
                          placeholder={editingStaffId ? "Nhập mật khẩu mới nếu muốn đổi..." : "Nhập mật khẩu hoặc bấm Tự sinh..."}
                          className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                          Tự sinh mã
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsStaffFormOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingStaff}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingStaff ? "Đang lưu..." : editingStaffId ? "Lưu Cập Nhật" : "Tạo Tài Khoản"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Bảng Danh Sách Tài Khoản Nhân Viên */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500 font-bold">
                      <th className="py-3 px-4">Họ Và Tên</th>
                      <th className="py-3 px-4">Tên Đăng Nhập</th>
                      <th className="py-3 px-4">Vai Trò Phân Quyền</th>
                      <th className="py-3 px-4 text-center">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staffList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span>{st.full_name}</span>
                            {st.is_owner === 1 && (
                              <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                CHỦ CƠ SỞ
                              </span>
                            )}
                          </div>
                          {st.phone && <span className="text-[11px] text-slate-400 block font-normal">{st.phone}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <code className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                            {st.username}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                              st.is_owner === 1
                                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                            }`}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{st.role_name}</span>
                          </span>
                          {st.is_owner !== 1 && (
                            <span className="ml-2 text-[11px] text-slate-400">
                              ({st.permissions?.length || 0} quyền được cấp)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {st.is_active === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                              <Check className="w-3 h-3" /> Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
                              <Lock className="w-3 h-3" /> Đã khóa
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {st.is_owner === 1 ? (
                            <span className="text-xs text-slate-400 italic">Mặc định toàn quyền</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditStaff(st)}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:text-slate-300 transition cursor-pointer"
                                title="Sửa thông tin / Đổi vai trò / Đổi mật khẩu"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStaffActive(st)}
                                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                  st.is_active === 1
                                    ? "border-amber-200 hover:bg-amber-50 text-amber-600"
                                    : "border-emerald-200 hover:bg-emerald-50 text-emerald-600"
                                }`}
                                title={st.is_active === 1 ? "Tạm khóa tài khoản này" : "Mở khóa tài khoản"}
                              >
                                {st.is_active === 1 ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(st)}
                                className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                                title="Xóa tài khoản nhân viên"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {staffList.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          Chưa có tài khoản nhân viên nào.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 3: QUẢN LÝ NHÓM QUYỀN (VAI TRÒ RBAC)
              ========================================================================= */}
          {activeTab === "roles" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    Thiết lập các Nhóm Quyền / Vai Trò (Ví dụ: Nhân viên Lễ tân, Kế toán...)
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                    Bạn tick chọn mục nào thì nhân viên thuộc vai trò đó mới nhìn thấy và thao tác được mục đó trên /admin.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenCreateRole}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 shrink-0 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Nhóm Quyền Mới</span>
                </button>
              </div>

              {/* Form Tạo / Sửa Nhóm Quyền */}
              {isRoleFormOpen && (
                <form
                  onSubmit={handleSaveRole}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-5 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>{editingRoleId ? "Chỉnh Sửa Nhóm Quyền" : "Tạo Nhóm Quyền (Vai Trò) Mới"}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsRoleFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Tên vai trò / nhóm quyền *
                      </label>
                      <input
                        type="text"
                        required
                        value={roleName}
                        onChange={(e) => setRoleName(e.target.value)}
                        placeholder="VD: Nhân viên Lễ tân, Kế toán, Giáo vụ..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Mô tả ngắn (Tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={roleDesc}
                        onChange={(e) => setRoleDesc(e.target.value)}
                        placeholder="VD: Chỉ tiếp nhận học sinh và xếp lịch bù, không xem doanh thu..."
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Thanh chọn nhanh tất cả */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tick chọn các chức năng mà vai trò này được phép thấy ({selectedPermissions.length}/{allPermissionKeys.length} quyền):
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions(allPermissionKeys)}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Chọn tất cả
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Danh sách 5 nhóm quyền hạn */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ADMIN_PERMISSION_GROUPS.map((group) => {
                      const groupItemIds = group.items.map((i) => i.id);
                      const isAllGroupSelected = groupItemIds.every((id) => selectedPermissions.includes(id));
                      const isSomeGroupSelected =
                        groupItemIds.some((id) => selectedPermissions.includes(id)) && !isAllGroupSelected;

                      return (
                        <div
                          key={group.id}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div>
                              <div className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                {group.name}
                              </div>
                              <p className="text-[11px] text-slate-400">{group.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSelectAllGroupPermissions(group.id)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                            >
                              {isAllGroupSelected ? "Bỏ chọn nhóm" : "Chọn hết nhóm"}
                            </button>
                          </div>

                          <div className="space-y-1.5">
                            {group.items.map((item) => {
                              const checked = selectedPermissions.includes(item.id);

                              return (
                                <label
                                  key={item.id}
                                  onClick={() => handleTogglePermission(item.id)}
                                  className={`flex items-start gap-2.5 p-2 rounded-xl border transition cursor-pointer select-none ${
                                    checked
                                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800"
                                      : "bg-slate-50/50 dark:bg-slate-800/30 border-transparent hover:border-slate-200"
                                  }`}
                                >
                                  <div className="mt-0.5 text-indigo-600 dark:text-indigo-400">
                                    {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-slate-400" />}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                      {item.label}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                      {item.description}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsRoleFormOpen(false)}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingRole}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingRole ? "Đang lưu..." : editingRoleId ? "Cập Nhật Nhóm Quyền" : "Lưu Nhóm Quyền"}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách các vai trò đã tạo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rolesList.map((role) => (
                  <div
                    key={role.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-2xs ${
                      role.is_system === 1
                        ? "border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                              {role.is_system === 1 ? (
                                <Lock className="w-4 h-4 text-amber-600" />
                              ) : (
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              )}
                              <span>{role.name}</span>
                            </h4>
                            {role.is_system === 1 && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                                Vai trò cố định
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{role.description}</p>
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {role.staff_count || 0} thành viên
                        </span>
                      </div>

                      {/* Chips hiển thị các quyền */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {role.is_system === 1 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold">
                            Chỉ Cổng Giáo Viên (/giao-vien): Điểm danh, Chấm sao, Nhận xét, Dặn bài tập, Báo nghỉ
                          </span>
                        ) : (
                          (role.permissions || []).map((permKey) => {
                            const foundItem = ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items).find((i) => i.id === permKey);
                            return (
                              <span
                                key={permKey}
                                className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-[11px] font-semibold"
                              >
                                {foundItem ? foundItem.label : permKey}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      {role.is_system === 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("teachers");
                            resetTeacherForm();
                            setIsTeacherFormOpen(true);
                          }}
                          className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Thêm giáo viên mới</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("staff");
                            handleOpenCreateStaff();
                            setStaffRoleId(role.id);
                          }}
                          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Tạo tài khoản nhân viên</span>
                        </button>
                      )}

                      <div className="flex items-center gap-1.5">
                        {role.is_system === 1 ? (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 px-2 py-1">
                            <Lock className="w-3 h-3" />
                            <span>Khóa cố định</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRole(role)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Sửa quyền</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition cursor-pointer"
                              title="Xóa nhóm quyền"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {rolesList.length === 0 && !isRoleFormOpen && (
                  <div className="md:col-span-2 py-10 px-4 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Chưa có nhóm quyền (vai trò) nào được tạo
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Hãy bấm nút <strong>&ldquo;+ Tạo Nhóm Quyền Mới&rdquo;</strong> để tạo vai trò (ví dụ: Nhân viên Lễ tân, Kế toán...) và tick chọn các mục được phép xem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              {activeTab === "teachers"
                ? "Giáo viên đăng nhập Cổng Giáo Viên (/giao-vien) bằng SĐT • Quyền hạn cố định an toàn"
                : activeTab === "staff"
                ? "Nhân viên văn phòng đăng nhập /admin bằng Username/Mật khẩu • Phân quyền tùy biến"
                : "Chủ trường có thể tạo vai trò mới và tích chọn 19 quyền hạn chi tiết"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng Cửa Sổ
          </button>
        </div>

      </div>

      {/* Confirmation Modal: Delete Teacher */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Xác nhận xóa giáo viên
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn có chắc chắn muốn xóa giáo viên <strong>{teacherToDelete.name}</strong> không?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingTeacher}
                onClick={handleConfirmDeleteTeacher}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {isDeletingTeacher ? "Đang xóa..." : "Xác Nhận Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
