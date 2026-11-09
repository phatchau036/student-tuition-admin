"use client";

import React, { useState, useEffect } from "react";
import { SchoolAdmin, AdminRole, ADMIN_PERMISSION_GROUPS } from "@/lib/types";
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
} from "lucide-react";

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string;
  schoolName?: string;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  schoolId,
  schoolName = "Trung tâm",
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"staff" | "roles">("staff");

  // Data state
  const [staffList, setStaffList] = useState<SchoolAdmin[]>([]);
  const [rolesList, setRolesList] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Staff Form State
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

  // Role Form State
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
      const [staffRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/staff${q}`, { headers: getHeaders() }),
        fetch(`/api/admin/roles${q}`, { headers: getHeaders() }),
      ]);
      const staffJson = await staffRes.json();
      const rolesJson = await rolesRes.json();

      if (staffJson.success) setStaffList(staffJson.data || []);
      if (rolesJson.success) setRolesList(rolesJson.data || []);
    } catch {
      showToast("Không thể tải danh sách tài khoản & vai trò!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      setIsStaffFormOpen(false);
      setIsRoleFormOpen(false);
      setCreatedCredentials(null);
    }
  }, [isOpen, schoolId]);

  if (!isOpen) return null;

  // All available permission keys
  const allPermissionKeys = ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items.map((it) => it.id));

  // Generate random safe password
  const handleGeneratePassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setStaffPassword(pass);
  };

  // Open create staff form
  const handleOpenCreateStaff = () => {
    setEditingStaffId(null);
    setStaffFullName("");
    setStaffUsername("");
    setStaffPassword("");
    setStaffPhone("");
    setStaffRoleId(rolesList.length > 0 ? rolesList[0].id : "");
    setCreatedCredentials(null);
    setIsStaffFormOpen(true);
  };

  // Open edit staff form
  const handleOpenEditStaff = (st: SchoolAdmin) => {
    setEditingStaffId(st.id);
    setStaffFullName(st.full_name || "");
    setStaffUsername(st.username || "");
    setStaffPassword("");
    setStaffPhone(st.phone || "");
    setStaffRoleId(st.role_id || "");
    setCreatedCredentials(null);
    setIsStaffFormOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFullName.trim()) {
      showToast("Vui lòng nhập họ và tên nhân viên!", "error");
      return;
    }
    if (!editingStaffId && (!staffUsername.trim() || !staffPassword.trim())) {
      showToast("Vui lòng nhập tên đăng nhập và mật khẩu cho nhân viên mới!", "error");
      return;
    }
    if (!staffRoleId && rolesList.length > 0) {
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
          full_name: staffFullName.trim(),
          username: staffUsername.trim(),
          password: staffPassword.trim() || undefined,
          phone: staffPhone.trim(),
          role_id: staffRoleId || null,
          school_id: schoolId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        const matchedRole = rolesList.find((r) => r.id === staffRoleId);
        if (!editingStaffId) {
          setCreatedCredentials({
            fullName: staffFullName.trim(),
            username: staffUsername.trim().toLowerCase(),
            password: staffPassword.trim(),
            roleName: matchedRole ? matchedRole.name : "Nhân viên",
          });
        }
        setIsStaffFormOpen(false);
        loadData();
      } else {
        showToast(data.message || "Lưu thông tin thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingStaff(false);
    }
  };

  const handleToggleStaffActive = async (st: SchoolAdmin) => {
    if (st.is_owner === 1) {
      showToast("Không thể khóa tài khoản Chủ cơ sở!", "error");
      return;
    }
    try {
      const nextActive = st.is_active === 1 ? 0 : 1;
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "toggle_active",
          id: st.id,
          is_active: nextActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadData();
      } else {
        showToast(data.message || "Không thể thay đổi trạng thái!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleDeleteStaff = async (st: SchoolAdmin) => {
    if (st.is_owner === 1) {
      showToast("Không thể xóa tài khoản Chủ cơ sở!", "error");
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản nhân viên "${st.full_name}" (${st.username})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/staff?id=${encodeURIComponent(st.id)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadData();
      } else {
        showToast(data.message || "Xóa thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  // Open create role form
  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleName("");
    setRoleDesc("");
    setSelectedPermissions(["students.view", "makeups.manage", "schedule.matrix", "schedule.consult"]);
    setIsRoleFormOpen(true);
  };

  // Open edit role form
  const handleOpenEditRole = (role: AdminRole) => {
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

  const handleToggleGroupPermissions = (groupKeys: string[]) => {
    const allSelected = groupKeys.every((k) => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((p) => !groupKeys.includes(p)));
    } else {
      const next = Array.from(new Set([...selectedPermissions, ...groupKeys]));
      setSelectedPermissions(next);
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showToast("Vui lòng nhập tên vai trò (VD: Nhân viên Lễ tân, Kế toán)!", "error");
      return;
    }
    if (selectedPermissions.length === 0) {
      showToast("Vui lòng tick chọn ít nhất 1 quyền cho vai trò này!", "error");
      return;
    }

    try {
      setIsSavingRole(true);
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          id: editingRoleId || undefined,
          name: roleName.trim(),
          description: roleDesc.trim(),
          permissions: selectedPermissions,
          school_id: schoolId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsRoleFormOpen(false);
        loadData();
      } else {
        showToast(data.message || "Lưu vai trò thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleDeleteRole = async (role: AdminRole) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/roles?id=${encodeURIComponent(role.id)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadData();
      } else {
        showToast(data.message || "Không thể xóa vai trò!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleCopyCredentials = (info: { fullName: string; username: string; password: string; roleName: string }) => {
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/admin` : "/admin";
    const text = `📋 THÔNG TIN TÀI KHOẢN NHÂN VIÊN (${schoolName})\n- Họ và tên: ${info.fullName}\n- Vai trò: ${info.roleName}\n- Link đăng nhập: ${loginUrl}\n- Tên đăng nhập: ${info.username}\n- Mật khẩu: ${info.password}`;
    navigator.clipboard.writeText(text);
    showToast("Đã sao chép thông tin đăng nhập để gửi cho nhân viên!", "success");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Quản Lý Tài Khoản Nhân Viên & Phân Quyền
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tạo nhóm quyền (tick chọn mục được xem) và cấp tài khoản đăng nhập riêng cho nhân viên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("staff");
                setIsRoleFormOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === "staff"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>1. Tài Khoản Nhân Viên ({staffList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("roles");
                setIsStaffFormOpen(false);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
                activeTab === "roles"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>2. Nhóm Quyền / Vai Trò ({rolesList.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-indigo-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
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
                  <span>Sao chép gửi nhân viên</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreatedCredentials(null)}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: QUẢN LÝ TÀI KHOẢN NHÂN VIÊN */}
          {activeTab === "staff" && (
            <div className="space-y-5">
              {/* Banner hướng dẫn */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/60">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-extrabold text-indigo-950 dark:text-indigo-200">
                    Danh sách tài khoản đăng nhập hệ thống Quản trị (/admin)
                  </h4>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300/80">
                    Để phân quyền chi tiết, trước tiên hãy tạo vai trò ở tab <strong>&ldquo;2. Nhóm Quyền / Vai Trò&rdquo;</strong>, sau đó bấm <strong>&ldquo;+ Tạo Tài Khoản Nhân Viên&rdquo;</strong> và gán vai trò đó.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("roles");
                      handleOpenCreateRole();
                    }}
                    className="px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition cursor-pointer"
                  >
                    + Tạo Nhóm Quyền
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateStaff}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Tài Khoản Nhân Viên</span>
                  </button>
                </div>
              </div>

              {/* Form Tạo / Sửa Nhân Viên */}
              {isStaffFormOpen && (
                <form
                  onSubmit={handleSaveStaff}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>{editingStaffId ? "Cập Nhật Tài Khoản Nhân Viên" : "Tạo Tài Khoản Nhân Viên Mới"}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsStaffFormOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Họ và tên nhân viên *
                      </label>
                      <input
                        type="text"
                        required
                        value={staffFullName}
                        onChange={(e) => setStaffFullName(e.target.value)}
                        placeholder="VD: Nguyễn Thị Mai (Lễ tân)"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Số điện thoại liên hệ
                      </label>
                      <input
                        type="text"
                        value={staffPhone}
                        onChange={(e) => setStaffPhone(e.target.value)}
                        placeholder="VD: 0909123456"
                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Chọn Nhóm Quyền (Vai trò) *
                      </label>
                      {rolesList.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                            Chưa có nhóm quyền nào!
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("roles");
                              handleOpenCreateRole();
                            }}
                            className="text-xs font-bold text-indigo-600 underline cursor-pointer"
                          >
                            + Tạo nhóm quyền ngay
                          </button>
                        </div>
                      ) : (
                        <select
                          value={staffRoleId}
                          onChange={(e) => setStaffRoleId(e.target.value)}
                          required
                          className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">-- Chọn vai trò cho nhân viên --</option>
                          {rolesList.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} ({r.permissions?.length || 0} quyền)
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

              {/* Bảng danh sách nhân viên */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4">Nhân viên</th>
                      <th className="py-3 px-4">Tên đăng nhập</th>
                      <th className="py-3 px-4">Vai trò / Nhóm quyền</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs sm:text-sm">
                    {staffList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{st.full_name}</span>
                            {st.is_owner === 1 && (
                              <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                                Chủ cơ sở
                              </span>
                            )}
                          </div>
                          {st.phone && <div className="text-xs text-slate-500">{st.phone}</div>}
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
                              ({st.permissions?.length || 0} mục được xem)
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

          {/* TAB 2: QUẢN LÝ NHÓM QUYỀN (VAI TRÒ) */}
          {activeTab === "roles" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60">
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-200">
                    Thiết lập các Nhóm Quyền / Vai Trò (Ví dụ: Nhân viên, Kế toán, Lễ tân)
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80">
                    Bạn tick chọn mục nào thì nhân viên thuộc vai trò đó mới nhìn thấy và thao tác được mục đó.
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
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPermissions([])}
                        className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Danh sách 5 nhóm quyền */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ADMIN_PERMISSION_GROUPS.map((group) => {
                      const groupKeys = group.items.map((it) => it.id);
                      const isAllGroupSelected = groupKeys.every((k) => selectedPermissions.includes(k));

                      return (
                        <div
                          key={group.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div>
                              <h5 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
                                {group.name}
                              </h5>
                              <p className="text-[11px] text-slate-400">{group.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleGroupPermissions(groupKeys)}
                              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                            >
                              {isAllGroupSelected ? "Bỏ nhóm" : "Chọn nhóm"}
                            </button>
                          </div>

                          <div className="space-y-2">
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
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            <span>{role.name}</span>
                          </h4>
                          {role.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {role.staff_count || 0} nhân viên
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(role.permissions || []).map((permKey) => {
                          const foundItem = ADMIN_PERMISSION_GROUPS.flatMap((g) => g.items).find((i) => i.id === permKey);
                          return (
                            <span
                              key={permKey}
                              className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800 text-[11px] font-semibold"
                            >
                              {foundItem ? foundItem.label : permKey}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("staff");
                          handleOpenCreateStaff();
                          setStaffRoleId(role.id);
                        }}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        + Tạo tài khoản cho vai trò này
                      </button>

                      <div className="flex items-center gap-1.5">
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
                      Hãy bấm nút <strong>&ldquo;+ Tạo Nhóm Quyền Mới&rdquo;</strong> để tạo vai trò (ví dụ: Nhân viên, Lễ tân, Kế toán) và tick chọn các mục được phép xem.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
