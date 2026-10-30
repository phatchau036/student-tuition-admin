"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  Users,
  Plus,
  Trash2,
  KeyRound,
  GraduationCap,
  CalendarCheck,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
  LogOut,
  User,
  ArrowRight,
  Globe,
  ShieldAlert,
  Settings,
  Edit2,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Check,
  MessageSquare,
  Send,
  Inbox,
  Filter,
  UserCheck,
  Clock,
  CheckSquare,
  Square,
  UserPlus,
  Play,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { SystemFeedback, SystemTeamMember } from "@/lib/types";
import {
  generateAdminUsernameFromSchool,
  generateRandomPassword,
} from "@/lib/credentialGen";

interface School {
  id: string;
  name: string;
  code: string;
  school_type?: "TT" | "TH";
  street?: string;
  city?: string;
  branch_num?: string | number;
  address: string;
  phone: string;
  ip_restriction_enabled?: number;
  allowed_ips?: string;
  created_at: string;
  admin_count: number;
  student_count: number;
  teacher_count: number;
}

interface SchoolAdmin {
  id: string;
  school_id: string;
  username: string;
  password?: string;
  full_name: string;
  school_name: string;
  school_code: string;
  created_at: string;
}

export default function SystemAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Password visibility map for admins
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Modal create school
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSchoolCode, setNewSchoolCode] = useState("");
  const [newSchoolType, setNewSchoolType] = useState<"TT" | "TH">("TT");
  const [newSchoolStreet, setNewSchoolStreet] = useState("");
  const [newSchoolCity, setNewSchoolCity] = useState("TPHCM");
  const [newSchoolBranchNum, setNewSchoolBranchNum] = useState("1");
  const [newSchoolAddress, setNewSchoolAddress] = useState("");
  const [newSchoolPhone, setNewSchoolPhone] = useState("");

  // Modal edit school (Đổi tên & thông tin trung tâm)
  const [isEditSchoolModalOpen, setIsEditSchoolModalOpen] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState("");
  const [editSchoolName, setEditSchoolName] = useState("");
  const [editSchoolCode, setEditSchoolCode] = useState("");
  const [editSchoolType, setEditSchoolType] = useState<"TT" | "TH">("TT");
  const [editSchoolStreet, setEditSchoolStreet] = useState("");
  const [editSchoolCity, setEditSchoolCity] = useState("TPHCM");
  const [editSchoolBranchNum, setEditSchoolBranchNum] = useState("1");
  const [editSchoolAddress, setEditSchoolAddress] = useState("");
  const [editSchoolPhone, setEditSchoolPhone] = useState("");
  const [isSavingSchoolEdit, setIsSavingSchoolEdit] = useState(false);

  // Modal create admin với bộ sinh thông minh
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Feedbacks & Task Workflow (Chưa làm / Đang làm / Đã làm)
  const [systemFeedbacks, setSystemFeedbacks] = useState<SystemFeedback[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [feedbackTaskTab, setFeedbackTaskTab] = useState<"pending" | "in_progress" | "completed">("pending");
  const [activeFeedbackReplyId, setActiveFeedbackReplyId] = useState<string | null>(null);
  const [feedbackReplyText, setFeedbackReplyText] = useState("");
  const [feedbackStatusUpdate, setFeedbackStatusUpdate] = useState<"pending" | "in_progress" | "in_review" | "planned" | "completed">("in_progress");

  // TpTeam Members Management & Task Assignment Modal
  const [teamMembers, setTeamMembers] = useState<SystemTeamMember[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"developer" | "tester" | "manager" | "support">("developer");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);

  // Assign Task Modal (Bấm nhận việc chọn mình là ai)
  const [assignModalTask, setAssignModalTask] = useState<SystemFeedback | null>(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [customAssigneeName, setCustomAssigneeName] = useState("");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

  // Complete Task Modal (Tick hoàn thành nhiệm vụ)
  const [completeModalTask, setCompleteModalTask] = useState<SystemFeedback | null>(null);
  const [completeReplyNote, setCompleteReplyNote] = useState("");
  const [isSubmittingComplete, setIsSubmittingComplete] = useState(false);

  // Modal IP Whitelist for School
  const [isIpModalOpen, setIsIpModalOpen] = useState(false);
  const [editingSchoolForIp, setEditingSchoolForIp] = useState<School | null>(null);
  const [ipEnabled, setIpEnabled] = useState(false);
  const [allowedIpsText, setAllowedIpsText] = useState("");
  const [isSavingIp, setIsSavingIp] = useState(false);

  // Auto Upgrade from GitHub state
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeLogs, setUpgradeLogs] = useState<string[]>([]);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateCheckResult, setUpdateCheckResult] = useState<{
    has_update: boolean;
    commits_behind?: number;
    local_commit?: string;
    local_log?: string;
    remote_commit?: string;
    remote_log?: string;
    error_message?: string;
  } | null>(null);

  // Navigation Tab State for System Admin Page
  const [activeSystemTab, setActiveSystemTab] = useState<"schools" | "feedbacks" | "maintenance">("schools");

  // Custom Delete Confirmations
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [isDeletingSchool, setIsDeletingSchool] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<SchoolAdmin | null>(null);
  const [isDeletingAdmin, setIsDeletingAdmin] = useState(false);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string = "mật khẩu") => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label} vào clipboard!`, "success");
  };

  // 1. Kiểm tra xác thực token khi tải trang (Hỗ trợ truy cập cả localhost và qua IP Network)
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("system_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/system/auth", { headers });
      const json = await res.json();
      if (json.authenticated) {
        setIsAuthenticated(true);
        loadData();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUsername || !authPassword) {
      showToast("Vui lòng nhập tài khoản và mật khẩu hệ thống!", "error");
      return;
    }

    try {
      setIsSubmittingAuth(true);
      const res = await fetch("/api/system/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: authUsername.trim(),
          password: authPassword.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        if (data.token) {
          localStorage.setItem("system_token", data.token);
        }
        setIsAuthenticated(true);
        loadData();
      } else {
        showToast(data.message || "Đăng nhập thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("system_token");
    setIsAuthenticated(false);
    setAuthPassword("");
    showToast("Đã đăng xuất khỏi cổng Quản Trị Hệ Thống", "success");
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/system");
      const json = await res.json();
      if (json.success) {
        setSchools(json.data.schools);
        setAdmins(json.data.admins);
        if (json.data.schools.length > 0 && !selectedSchoolId) {
          setSelectedSchoolId(json.data.schools[0].id);
        }
      }
      loadSystemFeedbacks();
      loadTeamMembers();
    } catch {
      showToast("Lỗi kết nối khi tải dữ liệu hệ thống!", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      setIsLoadingTeam(true);
      const res = await fetch("/api/system/team");
      const json = await res.json();
      if (json.success) {
        setTeamMembers(json.data || []);
      }
    } catch {
      console.error("Lỗi khi tải thành viên team");
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      showToast("Vui lòng nhập tên thành viên!", "error");
      return;
    }
    try {
      setIsSavingMember(true);
      const res = await fetch("/api/system/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: newMemberName.trim(),
          role: newMemberRole,
          phone: newMemberPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setNewMemberName("");
        setNewMemberPhone("");
        loadTeamMembers();
      } else {
        showToast(data.message || "Lỗi khi thêm thành viên!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleDeleteTeamMember = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa thành viên "${name}" khỏi đội ngũ?`)) return;
    try {
      const res = await fetch("/api/system/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        loadTeamMembers();
      } else {
        showToast(data.message || "Lỗi khi xóa thành viên!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  // Xử lý Nhận Việc (Assign Task)
  const handleConfirmAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalTask) return;

    let assigneeName = customAssigneeName.trim();
    if (selectedAssigneeId) {
      const found = teamMembers.find((m) => m.id === selectedAssigneeId);
      if (found) assigneeName = found.name;
    }

    if (!assigneeName) {
      showToast("Vui lòng chọn hoặc nhập tên người nhận việc!", "error");
      return;
    }

    try {
      setIsSubmittingAssign(true);
      const res = await fetch("/api/feedbacks/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignModalTask.id,
          action: "assign",
          assignee_id: selectedAssigneeId || null,
          assignee_name: assigneeName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setAssignModalTask(null);
        setSelectedAssigneeId("");
        setCustomAssigneeName("");
        loadSystemFeedbacks();
      } else {
        showToast(data.message || "Lỗi khi nhận việc!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Xử lý Hủy nhận việc (Đưa về Chưa làm)
  const handleUnassignTask = async (id: string) => {
    try {
      const res = await fetch("/api/feedbacks/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "unassign",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "info");
        loadSystemFeedbacks();
      } else {
        showToast(data.message || "Lỗi khi hủy nhận!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  // Xử lý Hoàn Thành Việc (Complete Task)
  const handleConfirmCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalTask) return;

    try {
      setIsSubmittingComplete(true);
      const res = await fetch("/api/feedbacks/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: completeModalTask.id,
          action: "complete",
          admin_reply: completeReplyNote.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setCompleteModalTask(null);
        setCompleteReplyNote("");
        loadSystemFeedbacks();
      } else {
        showToast(data.message || "Lỗi khi hoàn thành!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  // Mở lại việc (Reopen)
  const handleReopenTask = async (id: string) => {
    try {
      const res = await fetch("/api/feedbacks/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "reopen",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "info");
        loadSystemFeedbacks();
      } else {
        showToast(data.message || "Lỗi khi mở lại nhiệm vụ!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const loadSystemFeedbacks = async () => {
    try {
      setIsLoadingFeedbacks(true);
      const res = await fetch("/api/feedbacks/system");
      const json = await res.json();
      if (json.success) {
        setSystemFeedbacks(json.data || []);
      }
    } catch {
      console.error("Lỗi khi tải danh sách góp ý");
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const handleUpdateFeedbackStatus = async (id: string) => {
    try {
      const res = await fetch("/api/feedbacks/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: feedbackStatusUpdate,
          admin_reply: feedbackReplyText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setActiveFeedbackReplyId(null);
        setFeedbackReplyText("");
        loadSystemFeedbacks();
      } else {
        showToast(data.message || "Không thể cập nhật góp ý", "error");
      }
    } catch {
      showToast("Lỗi mạng", "error");
    }
  };

  // Open Edit School Modal (Đổi tên trung tâm)
  const handleOpenEditSchool = (school: School) => {
    setEditingSchoolId(school.id);
    setEditSchoolName(school.name);
    setEditSchoolCode(school.code);
    setEditSchoolType((school.school_type as "TT" | "TH") || "TT");
    setEditSchoolStreet(school.street || "");
    setEditSchoolCity(school.city || "TPHCM");
    setEditSchoolBranchNum(String(school.branch_num || "1"));
    setEditSchoolAddress(school.address || "");
    setEditSchoolPhone(school.phone || "");
    setIsEditSchoolModalOpen(true);
  };

  // Save Edit School
  const handleSaveEditSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSchoolName.trim() || !editSchoolCode.trim()) {
      showToast("Vui lòng nhập tên và mã trường!", "error");
      return;
    }

    try {
      setIsSavingSchoolEdit(true);
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit_school",
          school_id: editingSchoolId,
          name: editSchoolName.trim(),
          code: editSchoolCode.trim().toUpperCase(),
          school_type: editSchoolType,
          street: editSchoolStreet.trim(),
          city: editSchoolCity,
          branch_num: editSchoolBranchNum,
          address: editSchoolAddress.trim(),
          phone: editSchoolPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsEditSchoolModalOpen(false);
        loadData();
      } else {
        showToast(data.message || "Cập nhật thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsSavingSchoolEdit(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim() || !newSchoolCode.trim()) {
      showToast("Vui lòng điền tên và mã trường!", "error");
      return;
    }

    try {
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_school",
          name: newSchoolName.trim(),
          code: newSchoolCode.trim().toUpperCase(),
          school_type: newSchoolType,
          street: newSchoolStreet.trim(),
          city: newSchoolCity,
          branch_num: newSchoolBranchNum,
          address: newSchoolAddress.trim(),
          phone: newSchoolPhone.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Thêm trường mới thành công!", "success");
        setIsSchoolModalOpen(false);
        setNewSchoolName("");
        setNewSchoolCode("");
        setNewSchoolType("TT");
        setNewSchoolStreet("");
        setNewSchoolCity("TPHCM");
        setNewSchoolBranchNum("1");
        setNewSchoolAddress("");
        setNewSchoolPhone("");
        loadData();
      } else {
        showToast(data.message || "Tạo trường thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    }
  };

  // Tự động sinh tài khoản & mật khẩu chuẩn khi chọn trường
  const applyAutoCredentialsForSchool = (schoolId: string, schoolList = schools, adminList = admins) => {
    setSelectedSchoolId(schoolId);
    const school = schoolList.find((s) => s.id === schoolId) || schoolList[0];
    if (school) {
      if (school.id !== schoolId) {
        setSelectedSchoolId(school.id);
      }
      // Đếm số admin hiện có của trường này
      const existingCount = adminList.filter((a) => a.school_id === school.id).length;
      const nextIndex = existingCount + 1;
      const autoUser = generateAdminUsernameFromSchool(school, nextIndex);
      const autoPass = generateRandomPassword(10);

      setAdminUsername(autoUser);
      setAdminPassword(autoPass);
      setAdminFullName(`Quản Trị Viên ${nextIndex} - ${school.name}`);
    } else {
      // Trường hợp dự phòng nếu chưa có trường nào
      const autoPass = generateRandomPassword(10);
      setAdminUsername("TT-ADMIN-QTV1");
      setAdminPassword(autoPass);
      setAdminFullName("Quản Trị Viên");
    }
  };

  // Mở modal tạo admin: tự động điền sẵn mọi thứ, người dùng chỉ việc bấm Cấp Tài Khoản
  const handleOpenCreateAdminModal = (schoolId?: string) => {
    const targetSchoolId = schoolId || selectedSchoolId || (schools[0]?.id ?? "");
    applyAutoCredentialsForSchool(targetSchoolId);
    setIsAdminModalOpen(true);
  };

  const handleGenerateOnlyPassword = () => {
    const pass = generateRandomPassword(10);
    setAdminPassword(pass);
    showToast("Đã sinh mật khẩu 10 ký tự mới!", "success");
  };

  const handleRegenerateUsername = () => {
    const school = schools.find((s) => s.id === selectedSchoolId) || schools[0];
    if (school) {
      const existingCount = admins.filter((a) => a.school_id === school.id).length;
      const autoUser = generateAdminUsernameFromSchool(school, existingCount + 1);
      setAdminUsername(autoUser);
      showToast("Đã tái tạo tên đăng nhập chuẩn!", "success");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchoolId || !adminUsername.trim() || !adminPassword.trim() || !adminFullName.trim()) {
      showToast("Vui lòng điền đầy đủ thông tin admin!", "error");
      return;
    }

    try {
      setIsSubmittingAdmin(true);
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_admin",
          school_id: selectedSchoolId,
          full_name: adminFullName.trim(),
          username: adminUsername.trim(),
          password: adminPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Tạo tài khoản quản trị viên cho trường thành công!", "success");
        setIsAdminModalOpen(false);
        setAdminFullName("");
        setAdminUsername("");
        setAdminPassword("");
        loadData();
      } else {
        showToast(data.message || "Tạo tài khoản thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  // Open IP Config Modal
  const handleOpenIpModal = (school: School) => {
    setEditingSchoolForIp(school);
    setIpEnabled(Number(school.ip_restriction_enabled || 0) === 1);
    setAllowedIpsText(school.allowed_ips || "");
    setIsIpModalOpen(true);
  };

  // Save IP Config
  const handleSaveIpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchoolForIp) return;

    try {
      setIsSavingIp(true);
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_school_ip",
          school_id: editingSchoolForIp.id,
          ip_restriction_enabled: ipEnabled ? 1 : 0,
          allowed_ips: allowedIpsText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsIpModalOpen(false);
        loadData();
      } else {
        showToast(data.message || "Cập nhật IP thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsSavingIp(false);
    }
  };

  const confirmDeleteSchool = async () => {
    if (!schoolToDelete) return;
    try {
      setIsDeletingSchool(true);
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_school", school_id: schoolToDelete.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setSchoolToDelete(null);
        loadData();
      } else {
        showToast(data.message || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsDeletingSchool(false);
    }
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    try {
      setIsDeletingAdmin(true);
      const res = await fetch("/api/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_admin", admin_id: adminToDelete.id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setAdminToDelete(null);
        loadData();
      } else {
        showToast(data.message || "Xóa thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ", "error");
    } finally {
      setIsDeletingAdmin(false);
    }
  };

  // Kiểm tra xem trên GitHub có bản cập nhật mới không
  const handleCheckUpdate = async (autoOpenModal: boolean = false) => {
    try {
      setIsCheckingUpdate(true);
      const res = await fetch("/api/system/upgrade/status?check_git=1");
      const json = await res.json();
      if (json.success) {
        setUpdateCheckResult(json);
        if (json.has_update) {
          showToast(`Phát hiện ${json.commits_behind || 1} bản cập nhật mới trên GitHub!`, "success");
          if (autoOpenModal) setIsUpgradeModalOpen(true);
        } else {
          showToast("Hệ thống hiện tại đã là phiên bản mới nhất!", "success");
        }
      } else {
        showToast("Không thể kiểm tra cập nhật GitHub", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi kiểm tra cập nhật", "error");
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Kích hoạt cập nhật tự động từ GitHub
  const handleTriggerUpgrade = async () => {
    try {
      setIsUpgrading(true);
      setUpgradeLogs([
        "Đang gửi yêu cầu nâng cấp tới máy chủ...",
        "Kích hoạt cờ bảo trì hệ thống (.maintenance)...",
      ]);

      const res = await fetch("/api/system/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã kích hoạt nâng cấp! Đang theo dõi tiến trình thời gian thực...", "success");

        // Bắt đầu vòng lặp polling log định kỳ từ upgrade.log
        let pollCount = 0;
        let isServerRestarting = false;
        const pollInterval = setInterval(async () => {
          pollCount++;
          try {
            const statusRes = await fetch("/api/system/upgrade/status");
            const statusJson = await statusRes.json();

            if (statusJson.upgrade_logs && Array.isArray(statusJson.upgrade_logs)) {
              setUpgradeLogs(statusJson.upgrade_logs);
            }

            // Nếu cờ bảo trì đã tắt và đã từng qua bước build
            if (statusJson.maintenance === false && pollCount > 8) {
              clearInterval(pollInterval);
              setIsUpgrading(false);
              showToast("Nâng cấp hệ thống thành công! Máy chủ đã hoạt động trở lại.", "success");
              handleCheckUpdate(false);
            }
          } catch {
            // Khi server restart, fetch sẽ tạm thời lỗi -> Đây là dấu hiệu server đang khởi động lại
            isServerRestarting = true;
            setUpgradeLogs((prev) => [
              ...prev,
              "Máy chủ đang giải phóng cổng và khởi động lại dịch vụ... Đang kết nối lại...",
            ]);
          }

          // Dừng sau tối đa 6 phút để tránh chạy vô tận
          if (pollCount > 120) {
            clearInterval(pollInterval);
            setIsUpgrading(false);
          }
        }, 3000);
      } else {
        showToast(data.message || "Kích hoạt nâng cấp thất bại", "error");
        setIsUpgrading(false);
      }
    } catch {
      showToast("Lỗi kết nối khi gửi yêu cầu nâng cấp", "error");
      setIsUpgrading(false);
    }
  };

  // Toggle reveal password for admin
  const togglePasswordVisibility = (adminId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  // CASE 1: Loading screen while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold">Đang kiểm tra quyền truy cập hệ thống...</span>
        </div>
      </div>
    );
  }

  // CASE 3: Unauthenticated: Super Admin Login Screen (Localhost only)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans relative">
        {toastMessage && (
          <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : toastMessage.type === "error" ? (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            ) : (
              <Sparkles className="w-5 h-5 text-indigo-600" />
            )}
            <span className="text-sm font-semibold">{toastMessage.text}</span>
          </div>
        )}

        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 backdrop-blur-md">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center shadow-lg shadow-purple-600/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-extrabold text-white">Cổng Quản Trị Hệ Thống</h1>
            <p className="text-xs text-slate-400">
              Khu vực đăng nhập dành riêng cho Chủ Hệ Thống quản lý toàn diện các cơ sở.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tài khoản Chủ Hệ Thống (.env):
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Tên đăng nhập hệ thống"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật khẩu:</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Mật khẩu bảo mật"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingAuth ? "Đang xác thực..." : "Đăng Nhập Hệ Thống"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Thông tin đăng nhập được lưu trữ an toàn trong biến môi trường file <code className="text-purple-400 font-mono">.env</code> của máy chủ.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // CASE 4: Authenticated: Full System Dashboard
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Quản Trị Hệ Thống Toàn Cục
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Chủ Hệ Thống (Network & Local)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Khởi tạo trường, đổi tên trung tâm, cấp tài khoản thông minh và xem mật khẩu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Nút Kiểm Tra Cập Nhật GitHub */}
            <button
              onClick={() => handleCheckUpdate(true)}
              disabled={isCheckingUpdate || isUpgrading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition"
              title="Kiểm tra xem trên GitHub có commit mới hay không"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
              <span>{isCheckingUpdate ? "Đang check..." : "Kiểm Tra Bản Mới"}</span>
            </button>

            {/* Nút Cập Nhật Phiên Bản Mới Từ GitHub */}
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-600/30"
              title="Tải mã nguồn mới nhất từ GitHub và tự động khởi động lại hệ thống"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpgrading ? "animate-spin" : ""}`} />
              <span>Cập Nhật GitHub</span>
            </button>

            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Truy cập Cổng Quản trị Cơ sở"
            >
              <span>Cổng Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/giao-vien"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              title="Truy cập Cổng Giáo viên"
            >
              <span>Cổng Giáo Viên</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm"
              title="Truy cập Cổng Phụ huynh"
            >
              <span>Cổng Phụ Huynh</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition"
              title="Đăng xuất khỏi Cổng Hệ Thống"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng Xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tổng số trường / trung tâm</p>
              <h3 className="text-3xl font-extrabold text-white mt-1">{schools.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tài khoản Quản trị cơ sở</p>
              <h3 className="text-3xl font-extrabold text-purple-400 mt-1">{admins.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <KeyRound className="w-6 h-6" />
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Học sinh toàn hệ thống</p>
              <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">
                {schools.reduce((acc, s) => acc + (s.student_count || 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Segmented Navigation Tab Bar */}
        <div className="flex items-center p-1.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setActiveSystemTab("schools")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeSystemTab === "schools"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Quản Lý Cơ Sở & Tài Khoản Admin ({schools.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSystemTab("feedbacks")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 relative ${
              activeSystemTab === "feedbacks"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Hòm Thư Góp Ý Từ Cơ Sở</span>
            {systemFeedbacks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-900">
                {systemFeedbacks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSystemTab("maintenance")}
            className={`flex-1 py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 ${
              activeSystemTab === "maintenance"
                ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Cập Nhật GitHub & Bảo Trì</span>
          </button>
        </div>

        {/* TAB 1: SCHOOLS & ADMIN MANAGEMENT */}
        {activeSystemTab === "schools" && (
          <div className="space-y-8 animate-in fade-in duration-150">
            {/* Schools Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    <span>Danh Sách Trường & Trung Tâm</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chủ Hệ Thống có thể đổi tên trung tâm, điều chỉnh mã cơ sở và thiết lập giới hạn IP bảo vệ
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSchoolModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm shadow-purple-600/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tạo Trường Mới</span>
                  </button>
                  <button
                    onClick={() => handleOpenCreateAdminModal()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    <KeyRound className="w-4 h-4 text-purple-400" />
                    <span>Cấp Tài Khoản Admin</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schools.map((school) => {
                  const hasIpRestriction = Number(school.ip_restriction_enabled || 0) === 1;
                  return (
                    <div
                      key={school.id}
                      className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 text-xs font-black uppercase rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {school.code}
                            </span>
                            {hasIpRestriction ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-emerald-400" /> Khóa IP
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-slate-700 text-slate-400 flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Mọi IP
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenCreateAdminModal(school.id)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600 hover:text-white transition flex items-center gap-1"
                              title="Cấp tài khoản Admin cho trường này"
                            >
                              <KeyRound className="w-3 h-3" />
                              <span>+ Cấp Admin</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditSchool(school)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-700 transition"
                              title="Đổi tên trường & sửa thông tin"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenIpModal(school)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition"
                              title="Cấu hình giới hạn IP mạng nội bộ"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSchoolToDelete(school)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                              title="Xóa trường này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-white mt-2 leading-snug">{school.name}</h3>

                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {school.address || "Chưa có địa chỉ"}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-700/60 grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="bg-slate-900/40 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Admin</span>
                          <span className="font-extrabold text-purple-400 text-sm">{school.admin_count}</span>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Học sinh</span>
                          <span className="font-extrabold text-emerald-400 text-sm">{school.student_count}</span>
                        </div>
                        <div className="bg-slate-900/40 p-2 rounded-xl">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Giáo viên</span>
                          <span className="font-extrabold text-blue-400 text-sm">{school.teacher_count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* School Admins Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-purple-400" />
                    <span>Danh Sách Tài Khoản Quản Trị Cơ Sở (Admin)</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Chủ Hệ Thống có toàn quyền bấm xem mật khẩu gốc, sao chép hoặc xóa tài khoản quản trị
                  </p>
                </div>
                <button
                  onClick={() => handleOpenCreateAdminModal()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-sm shadow-purple-600/30 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cấp Tài Khoản Mới</span>
                </button>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-700 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">Họ và tên Admin</th>
                        <th className="py-3 px-4">Tên đăng nhập (Username)</th>
                        <th className="py-3 px-4">Mật khẩu (Có nút xem & copy)</th>
                        <th className="py-3 px-4">Trường quản lý</th>
                        <th className="py-3 px-4">Mã trường</th>
                        <th className="py-3 px-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 text-slate-200">
                      {admins.map((adm) => {
                        const isRevealed = Boolean(revealedPasswords[adm.id]);
                        return (
                          <tr key={adm.id} className="hover:bg-slate-700/30 transition">
                            <td className="py-3.5 px-4 font-semibold text-white">{adm.full_name}</td>
                            <td className="py-3.5 px-4 font-mono text-purple-300 font-bold flex items-center gap-2">
                              <span>{adm.username}</span>
                              <button
                                onClick={() => copyToClipboard(adm.username, "tài khoản")}
                                className="p-1 text-slate-500 hover:text-purple-300 transition"
                                title="Sao chép tên tài khoản"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {isRevealed ? (
                                    <span className="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      {adm.password}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 tracking-widest">••••••••••</span>
                                  )}
                                </span>

                                <button
                                  onClick={() => togglePasswordVisibility(adm.id)}
                                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition"
                                  title={isRevealed ? "Ẩn mật khẩu" : "Xem mật khẩu của admin này"}
                                >
                                  {isRevealed ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                                </button>

                                <button
                                  onClick={() => copyToClipboard(String(adm.password), "mật khẩu")}
                                  className="p-1 rounded text-slate-400 hover:text-purple-300 hover:bg-slate-700 transition"
                                  title="Sao chép mật khẩu"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">{adm.school_name}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-400">{adm.school_code}</td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setAdminToDelete(adm)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="Xóa tài khoản admin này"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {admins.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500">
                            Chưa có tài khoản admin nào. Hãy bấm "Cấp Tài Khoản Admin" ở trên!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FEEDBACKS & TASK WORKFLOW FROM SCHOOLS */}
        {activeSystemTab === "feedbacks" && (() => {
          const pendingFeedbacks = systemFeedbacks.filter((fb) => fb.status === "pending" || !fb.status);
          const inProgressFeedbacks = systemFeedbacks.filter((fb) => fb.status === "in_progress" || fb.status === "in_review" || fb.status === "planned");
          const completedFeedbacks = systemFeedbacks.filter((fb) => fb.status === "completed");

          const currentList =
            feedbackTaskTab === "pending"
              ? pendingFeedbacks
              : feedbackTaskTab === "in_progress"
              ? inProgressFeedbacks
              : completedFeedbacks;

          return (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header Tab 2 & Nút quản lý đội ngũ */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-amber-400" />
                    <span>Nhiệm Vụ & Phản Hồi Từ Các Trung Tâm ({systemFeedbacks.length})</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Quy trình xử lý công việc: <strong>Chưa làm ➔ Đang làm ➔ Đã làm</strong> dành riêng cho đội ngũ phát triển TpTeam
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsTeamModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition cursor-pointer"
                    title="Quản lý thành viên đội ngũ hệ thống"
                  >
                    <Users className="w-3.5 h-3.5 text-purple-300" />
                    <span>Đội Ngũ TpTeam ({teamMembers.length})</span>
                  </button>

                  <button
                    onClick={loadSystemFeedbacks}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFeedbacks ? "animate-spin" : ""}`} />
                    <span>Làm mới</span>
                  </button>
                </div>
              </div>

              {/* Bộ 3 Tab Nhiệm Vụ: Chưa làm / Đang làm / Đã làm */}
              <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-800/90 border border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setFeedbackTaskTab("pending")}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                    feedbackTaskTab === "pending"
                      ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Chưa làm</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                    feedbackTaskTab === "pending" ? "bg-slate-950/20 text-slate-950" : "bg-slate-700 text-slate-300"
                  }`}>
                    {pendingFeedbacks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackTaskTab("in_progress")}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                    feedbackTaskTab === "in_progress"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Đang làm</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                    feedbackTaskTab === "in_progress" ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
                  }`}>
                    {inProgressFeedbacks.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeedbackTaskTab("completed")}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                    feedbackTaskTab === "completed"
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã làm xong</span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                    feedbackTaskTab === "completed" ? "bg-white/20 text-white" : "bg-slate-700 text-slate-300"
                  }`}>
                    {completedFeedbacks.length}
                  </span>
                </button>
              </div>

              {/* Danh sách nhiệm vụ theo Tab đã chọn */}
              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden">
                {isLoadingFeedbacks ? (
                  <div className="py-12 text-center text-xs text-slate-400">Đang tải danh sách nhiệm vụ...</div>
                ) : currentList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    {feedbackTaskTab === "pending" && "Không có nhiệm vụ nào đang chờ xử lý! Tuyệt vời!"}
                    {feedbackTaskTab === "in_progress" && "Chưa có nhiệm vụ nào đang được nhận làm."}
                    {feedbackTaskTab === "completed" && "Chưa có nhiệm vụ nào hoàn thành trong danh mục này."}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/60">
                    {currentList.map((fb) => (
                      <div key={fb.id} className="p-5 space-y-3.5 hover:bg-slate-700/20 transition">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {fb.school_name || fb.school_code}
                              </span>
                              <span className="text-sm font-bold text-white">{fb.title}</span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  fb.priority === "high"
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    : "bg-slate-700 text-slate-300"
                                }`}
                              >
                                {fb.priority === "high" ? "Ưu tiên cao" : "Bình thường"}
                              </span>
                            </div>
                            {fb.sender_contact && (
                              <p className="text-xs text-slate-400">
                                Người liên hệ: <strong className="text-slate-200">{fb.sender_contact}</strong>
                              </p>
                            )}
                          </div>

                          {/* Action Buttons: Nhận Việc, Đang làm bởi ai, Đánh dấu Đã xong */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Trạng thái 1: CHƯA LÀM => Nút BẤM NHẬN NHIỆM VỤ */}
                            {(fb.status === "pending" || !fb.status) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignModalTask(fb);
                                  setSelectedAssigneeId(teamMembers[0]?.id || "");
                                  setCustomAssigneeName("");
                                }}
                                className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Nhận Nhiệm Vụ Này</span>
                              </button>
                            )}

                            {/* Trạng thái 2: ĐANG LÀM => Hiển thị Người nhận + Nút HOÀN THÀNH */}
                            {(fb.status === "in_progress" || fb.status === "in_review" || fb.status === "planned") && (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Đang làm: {fb.assignee_name || "Thành viên TpTeam"}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCompleteModalTask(fb);
                                    setCompleteReplyNote(fb.admin_reply || "");
                                  }}
                                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                                  title="Bấm để đánh dấu đã làm xong nhiệm vụ này"
                                >
                                  <CheckSquare className="w-3.5 h-3.5" />
                                  <span>Đã Làm Xong</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUnassignTask(fb.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                  title="Hủy nhận việc (chuyển về Chưa làm)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Trạng thái 3: ĐÃ LÀM XONG => Hiển thị Badge + Nút Mở lại nếu cần */}
                            {fb.status === "completed" && (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Hoàn thành bởi: {fb.completed_by || fb.assignee_name || "TpTeam"}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleReopenTask(fb.id)}
                                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                  title="Mở lại nhiệm vụ"
                                >
                                  Mở lại
                                </button>
                              </div>
                            )}

                            {/* Nút gửi lời nhắn phản hồi lại cơ sở */}
                            <button
                              onClick={() => {
                                setActiveFeedbackReplyId(fb.id);
                                setFeedbackReplyText(fb.admin_reply || "");
                                setFeedbackStatusUpdate(fb.status);
                              }}
                              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 transition cursor-pointer"
                            >
                              Phản hồi cơ sở
                            </button>
                          </div>
                        </div>

                        {/* Nội dung chi tiết */}
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-3.5 rounded-xl border border-slate-700/50 whitespace-pre-wrap">
                          {fb.content}
                        </p>

                        {/* Hiển thị ảnh chụp màn hình cơ sở gửi lên */}
                        {fb.images && fb.images.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Ảnh đính kèm ({fb.images.length}):</span>
                            <div className="flex items-center gap-3 overflow-x-auto py-1">
                              {fb.images.map((imgUrl, i) => (
                                <a
                                  key={i}
                                  href={imgUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block rounded-xl overflow-hidden border border-slate-700 hover:border-purple-400 transition shrink-0"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={imgUrl}
                                    alt={`Ảnh đính kèm ${i + 1}`}
                                    className="w-24 h-16 object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {fb.admin_reply && (
                          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/40 text-xs text-purple-200">
                            <strong className="block text-[10px] uppercase tracking-wider text-purple-400">
                              Phản hồi của TpTeam đã gửi tới trung tâm:
                            </strong>
                            <p className="mt-0.5">{fb.admin_reply}</p>
                          </div>
                        )}

                        {/* Form phản hồi khi bấm nút */}
                        {activeFeedbackReplyId === fb.id && (
                          <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/40 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">Lời nhắn gửi lại trung tâm</span>
                              <button
                                onClick={() => setActiveFeedbackReplyId(null)}
                                className="text-xs text-slate-400 hover:text-white"
                              >
                                Đóng
                              </button>
                            </div>

                            <div>
                              <textarea
                                rows={3}
                                placeholder="Nhập nội dung giải đáp hoặc thông báo phiên bản cập nhật..."
                                value={feedbackReplyText}
                                onChange={(e) => setFeedbackReplyText(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white outline-none resize-none"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setActiveFeedbackReplyId(null)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateFeedbackStatus(fb.id)}
                                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-xs"
                              >
                                Lưu & Gửi Phản Hồi
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                          <span>Gửi lúc: {fb.created_at}</span>
                          {fb.assigned_at && fb.assignee_name && (
                            <span>Đã nhận: {fb.assigned_at.slice(0, 16).replace("T", " ")} ({fb.assignee_name})</span>
                          )}
                          {fb.completed_at && (
                            <span className="text-emerald-400 font-bold">Xong lúc: {fb.completed_at.slice(0, 16).replace("T", " ")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* TAB 3: AUTO UPGRADE & MAINTENANCE */}
        {activeSystemTab === "maintenance" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Hệ Thống Tự Động Hóa 1-Click</span>
                    </span>

                    {updateCheckResult && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                          updateCheckResult.has_update
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {updateCheckResult.has_update ? (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>Có {updateCheckResult.commits_behind || 1} bản cập nhật mới trên GitHub</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 text-blue-400" />
                            <span>Hệ thống đang ở bản mới nhất ({updateCheckResult.local_commit})</span>
                          </>
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white mt-1">
                    Tự Động Nâng Cấp Phiên Bản Mới Từ GitHub
                  </h3>
                  <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                    Quy trình tự động hóa độc lập: Kích hoạt màn hình bảo trì toàn hệ thống -&gt; Tải mã nguồn mới nhất từ kho GitHub -&gt; Tự động cài đặt thư viện thiếu -&gt; Tối ưu và biên dịch bản build Next.js -&gt; Tự khởi động lại dịch vụ ngay lập tức.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isCheckingUpdate || isUpgrading}
                    onClick={() => handleCheckUpdate(false)}
                    className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                    <span>{isCheckingUpdate ? "Đang kiểm tra..." : "Kiểm Tra Bản Mới"}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpgrading}
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isUpgrading ? "animate-spin" : ""}`} />
                    <span>{isUpgrading ? "Đang Nâng Cấp..." : "Cập Nhật GitHub Ngay"}</span>
                  </button>
                </div>
              </div>

              {/* Chi tiết phiên bản git */}
              {updateCheckResult && (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block text-[11px] mb-1">Bản đang chạy trên máy chủ:</span>
                    <p className="font-mono text-purple-300 font-bold">{updateCheckResult.local_log || updateCheckResult.local_commit}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[11px] mb-1">Bản mới nhất trên GitHub:</span>
                    <p className="font-mono text-emerald-400 font-bold">{updateCheckResult.remote_log || updateCheckResult.remote_commit}</p>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2 text-xs text-slate-300 font-mono">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Các lệnh thực thi trong quy trình tự động:
                </p>
                <p>1. <span className="text-purple-300">echo &quot;maintenance&quot; &gt; .maintenance</span> (Kích hoạt bảo trì)</p>
                <p>2. <span className="text-blue-300">git pull origin main</span> (Kéo code mới nhất)</p>
                <p>3. <span className="text-amber-300">npm install</span> (Tự cài thư viện bổ sung nếu có)</p>
                <p>4. <span className="text-emerald-300">npm run build</span> (Tối ưu biên dịch)</p>
                <p>5. <span className="text-purple-300">del .maintenance &amp;&amp; npm start</span> (Khởi động lại máy chủ)</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal: Đổi Tên Trung Tâm / Chỉnh Sửa Trường */}
      {isEditSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-400" />
                <span>Đổi Tên & Cập Nhật Thông Tin Trường</span>
              </h3>
              <button
                onClick={() => setIsEditSchoolModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSchool} className="space-y-4">
              {/* Loại cơ sở & Tên trường */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loại Cơ Sở *</label>
                  <select
                    value={editSchoolType}
                    onChange={(e) => setEditSchoolType(e.target.value as "TT" | "TH")}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="TT">TT - Trung Tâm</option>
                    <option value="TH">TH - Trường Học</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Trường / Trung Tâm *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hồng Ân, Sáng Tạo..."
                    value={editSchoolName}
                    onChange={(e) => setEditSchoolName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Tên đường riêng, Tỉnh thành & Chi nhánh số mấy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Đường Riêng *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hiền Vương, Quang Trung..."
                    value={editSchoolStreet}
                    onChange={(e) => setEditSchoolStreet(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tỉnh / Thành Phố *</label>
                  <select
                    value={editSchoolCity}
                    onChange={(e) => setEditSchoolCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="TPHCM">TP. Hồ Chí Minh (TPHCM)</option>
                    <option value="HN">Hà Nội (HN)</option>
                    <option value="DN">Đà Nẵng (DN)</option>
                    <option value="BD">Bình Dương (BD)</option>
                    <option value="DNAI">Đồng Nai (DNAI)</option>
                    <option value="CT">Cần Thơ (CT)</option>
                    <option value="HP">Hải Phòng (HP)</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chi Nhánh Số Mấy *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      required
                      value={editSchoolBranchNum}
                      onChange={(e) => setEditSchoolBranchNum(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">CN{editSchoolBranchNum || 1}</span>
                  </div>
                </div>
              </div>

              {/* Mã trường & Hotline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Trường (Viết tắt) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mã trường (TT-HA, TT-01...)"
                    value={editSchoolCode}
                    onChange={(e) => setEditSchoolCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm uppercase rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Số điện thoại hotline</label>
                  <input
                    type="text"
                    placeholder="Hotline liên hệ"
                    value={editSchoolPhone}
                    onChange={(e) => setEditSchoolPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Địa chỉ chi tiết */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ đầy đủ</label>
                <input
                  type="text"
                  placeholder="VD: 123 Hiền Vương, P. Phú Thạnh, Q. Tân Phú"
                  value={editSchoolAddress}
                  onChange={(e) => setEditSchoolAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Live Preview định dạng tài khoản Admin sẽ tạo */}
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Mẫu Tài Khoản Admin Sẽ Tự Sinh Chuẩn Xác:
                </span>
                <p className="font-mono text-sm font-black text-purple-200">
                  {generateAdminUsernameFromSchool(
                    {
                      name: editSchoolName || "Trung tâm",
                      school_type: editSchoolType,
                      street: editSchoolStreet || "Hiền Vương",
                      city: editSchoolCity || "TPHCM",
                      branch_num: editSchoolBranchNum || "1",
                    },
                    1
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditSchoolModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingSchoolEdit}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 disabled:opacity-50"
                >
                  {isSavingSchoolEdit ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cấp Tài Khoản Admin Với Bộ Sinh Thông Minh */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cấp Tài Khoản Quản Trị Viên (Admin)</h3>
                  <p className="text-xs text-slate-400">Tự động sinh tài khoản & mật khẩu 10 ký tự mạnh</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Thông tin tự động sinh theo trường đã chọn */}
            <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Hệ Thống Đã Tự Động Thiết Lập Tài Khoản & Mật Khẩu
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase bg-purple-600 text-white">
                  {`QTV${(admins.filter((a) => a.school_id === selectedSchoolId).length || 0) + 1}`}
                </span>
              </div>
              <p className="text-[11px] text-purple-200/80 leading-relaxed">
                Tài khoản và mật khẩu 10 ký tự mạnh đã được sinh sẵn theo thông tin trường và vị trí chi nhánh. Bạn chỉ việc bấm <strong>"Cấp Tài Khoản Admin"</strong> bên dưới là hoàn tất!
              </p>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Trường phân công *</label>
                <select
                  required
                  value={selectedSchoolId}
                  onChange={(e) => applyAutoCredentialsForSchool(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Họ tên quản trị viên *</label>
                <input
                  type="text"
                  required
                  placeholder="Họ và tên người quản lý"
                  value={adminFullName}
                  onChange={(e) => setAdminFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Tên đăng nhập */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Tên đăng nhập (Username) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRegenerateUsername}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Sinh lại theo trường</span>
                    </button>
                    {adminUsername && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(adminUsername, "tên đăng nhập")}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy username</span>
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Tên tài khoản quản trị"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono uppercase rounded-xl bg-slate-800 border border-slate-700 text-purple-300 font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Mật khẩu 10 ký tự */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Mật khẩu khởi tạo (10 ký tự mạnh) *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateOnlyPassword}
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Đổi mật khẩu khác</span>
                    </button>
                    {adminPassword && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(adminPassword, "mật khẩu")}
                        className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy mật khẩu</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Mật khẩu bảo mật"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-3 pr-20 py-2 text-sm font-mono rounded-xl bg-slate-800 border border-slate-700 text-amber-300 font-bold focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {adminPassword && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(adminPassword, "mật khẩu")}
                      className="absolute right-2 top-1.5 px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mật khẩu gồm 10 ký tự ngẫu nhiên (chữ hoa, chữ thường, số, ký tự đặc biệt). Bạn chỉ việc bấm Copy để gửi cho quản trị cơ sở!
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdmin}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white shadow-md shadow-purple-600/30 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingAdmin ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang tạo tài khoản...</span>
                    </>
                  ) : (
                    <span>Cấp Tài Khoản Admin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cấu hình Giới Hạn IP Cho Trường (IP Whitelist) */}
      {isIpModalOpen && editingSchoolForIp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cấu Hình Bảo Vệ IP Cho Trường</h3>
                  <p className="text-xs text-slate-400">{editingSchoolForIp.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsIpModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIpConfig} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ipEnabled}
                      onChange={(e) => setIpEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kích hoạt giới hạn IP truy cập Admin</span>
                  </label>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      ipEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {ipEnabled ? "Đang Bật" : "Đang Tắt"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Khi bật tính năng này, người dùng khi vào trang <code className="text-purple-300">/admin</code> sẽ được kiểm tra IP. Nếu không thuộc danh sách bên dưới, hệ thống sẽ báo <strong>Web Error</strong> ngay lập tức.
                </p>
              </div>

              {ipEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-300">
                      Danh sách IP được phép truy cập (IP Whitelist):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = allowedIpsText ? `${allowedIpsText}, 192.168.1.235, 127.0.0.1` : "192.168.1.235, 127.0.0.1";
                        setAllowedIpsText(current);
                      }}
                      className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                    >
                      + Thêm IP 192.168.1.235 & Localhost
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    required={ipEnabled}
                    placeholder="192.168.1.235, 127.0.0.1, 14.161.20.15"
                    value={allowedIpsText}
                    onChange={(e) => setAllowedIpsText(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    Phân tách nhiều địa chỉ IP bằng dấu phẩy (,) hoặc xuống dòng.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingIp}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 disabled:opacity-50"
                >
                  {isSavingIp ? "Đang lưu..." : "Lưu Cấu Hình IP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tạo trường mới */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <span>Thêm Trường / Trung Tâm Mới</span>
              </h3>
              <button
                onClick={() => setIsSchoolModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="space-y-4">
              {/* Loại cơ sở & Tên trường */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Loại Cơ Sở *</label>
                  <select
                    value={newSchoolType}
                    onChange={(e) => setNewSchoolType(e.target.value as "TT" | "TH")}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="TT">TT - Trung Tâm</option>
                    <option value="TH">TH - Trường Học</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Trường / Trung Tâm *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hồng Ân, Sáng Tạo..."
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Tên đường riêng, Tỉnh thành & Chi nhánh số mấy */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Đường Riêng *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Hiền Vương, Quang Trung..."
                    value={newSchoolStreet}
                    onChange={(e) => setNewSchoolStreet(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tỉnh / Thành Phố *</label>
                  <select
                    value={newSchoolCity}
                    onChange={(e) => setNewSchoolCity(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="TPHCM">TP. Hồ Chí Minh (TPHCM)</option>
                    <option value="HN">Hà Nội (HN)</option>
                    <option value="DN">Đà Nẵng (DN)</option>
                    <option value="BD">Bình Dương (BD)</option>
                    <option value="DNAI">Đồng Nai (DNAI)</option>
                    <option value="CT">Cần Thơ (CT)</option>
                    <option value="HP">Hải Phòng (HP)</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chi Nhánh Số Mấy *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      required
                      value={newSchoolBranchNum}
                      onChange={(e) => setNewSchoolBranchNum(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">CN{newSchoolBranchNum || 1}</span>
                  </div>
                </div>
              </div>

              {/* Mã trường & Hotline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Trường (Viết tắt) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Mã cơ sở (TT-HA, TT-01...)"
                    value={newSchoolCode}
                    onChange={(e) => setNewSchoolCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm uppercase rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Số điện thoại hotline</label>
                  <input
                    type="text"
                    placeholder="Hotline liên hệ"
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Địa chỉ chi tiết */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Địa chỉ đầy đủ</label>
                <input
                  type="text"
                  placeholder="VD: 123 Hiền Vương, P. Phú Thạnh, Q. Tân Phú"
                  value={newSchoolAddress}
                  onChange={(e) => setNewSchoolAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Live Preview định dạng tài khoản Admin sẽ tạo */}
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Mẫu Tài Khoản Admin Sẽ Tự Sinh Chuẩn Xác:
                </span>
                <p className="font-mono text-sm font-black text-purple-200">
                  {generateAdminUsernameFromSchool(
                    {
                      name: newSchoolName || "Trung tâm",
                      school_type: newSchoolType,
                      street: newSchoolStreet || "Hiền Vương",
                      city: newSchoolCity || "TPHCM",
                      branch_num: newSchoolBranchNum || "1",
                    },
                    1
                  )}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsSchoolModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30"
                >
                  Khởi Tạo Trường
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Xác Nhận Xóa Trường Học (Custom Modal - không bao giờ bị trình duyệt chặn) */}
      {schoolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-snug">Xác Nhận Xóa Trường Học</h3>
                <p className="text-xs text-rose-400 font-semibold">Hành động này không thể hoàn tác!</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5 text-xs text-slate-300">
              <p>
                Trường học: <span className="font-bold text-white">{schoolToDelete.name}</span> ({schoolToDelete.code})
              </p>
              <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-700/60 leading-relaxed">
                Khi xóa trường, tất cả các tài khoản Quản trị viên, danh sách học sinh, giáo viên và ca học thuộc trường này cũng sẽ được xóa sạch hoàn toàn khỏi hệ thống.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingSchool}
                onClick={() => setSchoolToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingSchool}
                onClick={confirmDeleteSchool}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingSchool ? "Đang xóa..." : "Xác Nhận Xóa Ngay"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Xác Nhận Xóa Admin (Custom Modal) */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-snug">Xóa Tài Khoản Quản Trị Viên</h3>
                <p className="text-xs text-rose-400 font-semibold">Tài khoản sẽ bị vô hiệu hóa vĩnh viễn</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5 text-xs text-slate-300">
              <p>
                Quản trị viên: <span className="font-bold text-white">{adminToDelete.full_name}</span>
              </p>
              <p>
                Tên đăng nhập: <span className="font-mono text-purple-300 font-bold">{adminToDelete.username}</span>
              </p>
              <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-700/60">
                Trường: {adminToDelete.school_name} ({adminToDelete.school_code})
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingAdmin}
                onClick={() => setAdminToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingAdmin}
                onClick={confirmDeleteAdmin}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingAdmin ? "Đang xóa..." : "Xác Nhận Xóa Admin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cập Nhật Hệ Thống Từ GitHub (Tự động tải & Khởi động lại) */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <RefreshCw className={`w-6 h-6 ${isUpgrading ? "animate-spin" : ""}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-snug">
                    Cập Nhật Hệ Thống Từ GitHub
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tự động kéo commit mới nhất, build và khởi động lại
                  </p>
                </div>
              </div>
              {!isUpgrading && (
                <button
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
              {updateCheckResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    updateCheckResult.has_update
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {updateCheckResult.has_update ? (
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span className="font-bold text-[11px]">
                      {updateCheckResult.has_update
                        ? `Phát hiện ${updateCheckResult.commits_behind || 1} bản cập nhật mới sẵn sàng tải về`
                        : "Máy chủ hiện đã ở phiên bản mới nhất!"}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40">
                    {updateCheckResult.remote_commit}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Chế độ bảo vệ & trải nghiệm người dùng:</span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                Khi bắt đầu nâng cấp, hệ thống sẽ <strong>tự động bật màn hình bảo trì</strong>. Bất kỳ ai vào web lúc này sẽ nhận được thông báo <em>&quot;Server Đang Được Nâng Cấp&quot;</em>. Khi quá trình hoàn tất, máy chủ tự gỡ bảo trì và cho người dùng truy cập bình thường.
              </p>

              {upgradeLogs.length > 0 && (
                <div className="pt-2 border-t border-slate-700/60 space-y-1 font-mono text-[11px] text-emerald-400 max-h-40 overflow-y-auto">
                  {upgradeLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-slate-500">&gt;</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isUpgrading}
                onClick={() => setIsUpgradeModalOpen(false)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={isUpgrading}
                onClick={handleTriggerUpgrade}
                className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isUpgrading ? "animate-spin" : ""}`} />
                <span>{isUpgrading ? "Đang Tải & Build..." : "Bắt Đầu Cập Nhật Ngay"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Quản lý Đội Ngũ TpTeam (Thêm / Xóa thành viên) */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Quản Lý Đội Ngũ TpTeam</span>
              </h3>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form thêm thành viên mới */}
            <form onSubmit={handleAddTeamMember} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
              <span className="text-xs font-bold text-white block">Thêm thành viên mới vào team</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Tên thành viên *</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Thầy Phát, Quang, Huy..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Vai trò</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                  >
                    <option value="developer">Lập trình viên (Developer)</option>
                    <option value="tester">Kiểm thử (Tester / QA)</option>
                    <option value="manager">Quản lý (Project Manager)</option>
                    <option value="support">Hỗ trợ kỹ thuật (Support)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Số điện thoại liên hệ (Tùy chọn)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="VD: 0901234567"
                    value={newMemberPhone}
                    onChange={(e) => setNewMemberPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSavingMember}
                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingMember ? "Đang thêm..." : "+ Thêm"}
                  </button>
                </div>
              </div>
            </form>

            {/* Danh sách thành viên */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 block">Danh sách thành viên hiện tại ({teamMembers.length})</span>
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
                {teamMembers.map((mem) => (
                  <div key={mem.id} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-black text-xs flex items-center justify-center">
                        {mem.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">{mem.name}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{mem.role} {mem.phone ? `• ${mem.phone}` : ""}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTeamMember(mem.id, mem.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      title="Xóa thành viên"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Nhận Nhiệm Vụ (Chọn Mình Là Ai) */}
      {assignModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-amber-400 fill-current" />
                <span>Nhận Xử Lý Nhiệm Vụ</span>
              </h3>
              <button
                onClick={() => setAssignModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                {assignModalTask.school_name || assignModalTask.school_code}
              </span>
              <p className="text-xs font-bold text-white">{assignModalTask.title}</p>
            </div>

            <form onSubmit={handleConfirmAssignTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Bạn là ai trong đội ngũ TpTeam? <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={selectedAssigneeId}
                    onChange={(e) => {
                      setSelectedAssigneeId(e.target.value);
                      if (e.target.value) setCustomAssigneeName("");
                    }}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  >
                    <option value="">-- Chọn thành viên trong danh sách --</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>

                  <div className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    — Hoặc nhập tên nhanh nếu chưa có trong danh sách —
                  </div>

                  <input
                    type="text"
                    placeholder="Nhập họ tên của bạn (VD: Thầy Phát...)"
                    value={customAssigneeName}
                    onChange={(e) => {
                      setCustomAssigneeName(e.target.value);
                      if (e.target.value) setSelectedAssigneeId("");
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 border border-slate-700 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalTask(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAssign}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingAssign ? "Đang lưu..." : "Xác Nhận Nhận Việc"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Đánh Dấu Làm Xong (Complete Task) */}
      {completeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Hoàn Thành Nhiệm Vụ</span>
              </h3>
              <button
                onClick={() => setCompleteModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-200 space-y-1">
              <span className="font-bold block">Bạn đã giải quyết xong yêu cầu này:</span>
              <p className="font-bold text-white">{completeModalTask.title}</p>
              <span className="text-[10px] text-emerald-400 block">Người thực hiện: {completeModalTask.assignee_name || "Thành viên team"}</span>
            </div>

            <form onSubmit={handleConfirmCompleteTask} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Lời nhắn phản hồi gửi cơ sở (Tùy chọn):
                </label>
                <textarea
                  rows={3}
                  placeholder="VD: Đã fix xong lỗi trên phiên bản v2.6.2, trung tâm vui lòng kiểm tra lại nhé!"
                  value={completeReplyNote}
                  onChange={(e) => setCompleteReplyNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCompleteModalTask(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>{isSubmittingComplete ? "Đang lưu..." : "Xác Nhận Đã Xong"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
