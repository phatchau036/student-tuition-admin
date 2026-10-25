"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Calendar,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Building2,
  Search,
  Filter,
  UserCheck,
  CalendarCheck,
  Award,
  Layers,
  ArrowRight,
  LogOut,
  User,
} from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  phone: string;
  email?: string;
  color?: string;
  specialty?: string;
  school_id?: string;
  school_name?: string;
  school_code?: string;
  student_count?: number;
}

interface Student {
  id: string;
  name: string;
  phone: string;
  zalo_link?: string;
  level_id: string;
  level_name: string;
  level_surcharge: number;
  duration_mode: string;
  sessions_per_week: number;
  hours_per_week: number;
  registered_days: string;
  study_time_detail?: string;
  schedule_details_json?: string;
  is_makeup?: boolean;
}

interface MakeupClass {
  id: string;
  student_id: string;
  student_name: string;
  student_phone: string;
  level_id: string;
  level_name: string;
  absence_date: string;
  absence_reason?: string;
  makeup_date: string;
  makeup_time?: string;
  status: string;
  note?: string;
}

interface Level {
  id: string;
  level_name: string;
  surcharge_amount: number;
  sort_order: number;
}

export default function TeacherPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inputPhone, setInputPhone] = useState("");
  const [activeTeacher, setActiveTeacher] = useState<Teacher | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [makeups, setMakeups] = useState<MakeupClass[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "makeups">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Level Upgrade Modal State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | MakeupClass | null>(null);
  const [newLevelId, setNewLevelId] = useState("");
  const [isSubmittingLevel, setIsSubmittingLevel] = useState(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check saved session on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem("teacher_phone");
    if (savedPhone) {
      setInputPhone(savedPhone);
      handleLoginWithPhone(savedPhone);
    }
  }, []);

  // Login with phone number
  const handleLoginWithPhone = async (phoneToAuth: string) => {
    if (!phoneToAuth || !phoneToAuth.trim()) {
      showToast("Vui lòng nhập số điện thoại giáo viên!", "error");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login_by_phone",
          phone: phoneToAuth.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.teacher) {
        setActiveTeacher(data.teacher);
        setIsLoggedIn(true);
        localStorage.setItem("teacher_phone", phoneToAuth.trim());
        localStorage.setItem("active_teacher_id", data.teacher.id);
        await loadTeacherDetails(data.teacher.id);
      } else {
        showToast(data.message || "Không tìm thấy giáo viên với số điện thoại này!", "error");
        setIsLoggedIn(false);
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
      setIsLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("teacher_phone");
    localStorage.removeItem("active_teacher_id");
    setIsLoggedIn(false);
    setActiveTeacher(null);
    setStudents([]);
    setMakeups([]);
    setInputPhone("");
    showToast("Đã đăng xuất khỏi Cổng Giáo Viên", "success");
  };

  // Load teacher details (students, makeups, levels)
  const loadTeacherDetails = async (teacherId: string) => {
    if (!teacherId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/teacher?teacher_id=${teacherId}`);
      const json = await res.json();
      if (json.success) {
        setActiveTeacher(json.data.teacher);
        setStudents(json.data.students || []);
        setMakeups(json.data.makeups || []);
        setLevels(json.data.levels || []);
      } else {
        showToast(json.message || "Lỗi tải thông tin giáo viên", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi tải dữ liệu lớp học", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Level Upgrade
  const handleOpenUpgrade = (st: Student | MakeupClass) => {
    setTargetStudent(st);
    setNewLevelId(st.level_id || (levels[0]?.id ?? ""));
    setIsUpgradeModalOpen(true);
  };

  const handleSubmitLevelUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent || !newLevelId) return;

    try {
      setIsSubmittingLevel(true);
      const studentId = "student_id" in targetStudent ? targetStudent.student_id : targetStudent.id;
      const res = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_level",
          student_id: studentId,
          new_level_id: newLevelId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setIsUpgradeModalOpen(false);
        if (activeTeacher) {
          loadTeacherDetails(activeTeacher.id);
        }
      } else {
        showToast(data.message || "Cập nhật thất bại", "error");
      }
    } catch {
      showToast("Lỗi kết nối mạng", "error");
    } finally {
      setIsSubmittingLevel(false);
    }
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    return (
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      (s.level_name && s.level_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const filteredMakeups = makeups.filter((m) => {
    return (
      m.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.student_phone.includes(searchQuery) ||
      (m.level_name && m.level_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans pb-16 sm:pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Mobile-Friendly Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-md sm:max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Cổng Giáo Viên
                </span>
                {activeTeacher?.school_name && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Building2 className="w-3 h-3" />
                    <span className="line-clamp-1">{activeTeacher.school_name}</span>
                  </span>
                )}
              </div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {isLoggedIn && activeTeacher ? `Thầy/Cô: ${activeTeacher.name}` : "Đăng Nhập Giảng Dạy"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Thoát</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md sm:max-w-2xl w-full mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* LOGIN SCREEN IF NOT AUTHENTICATED */}
        {!isLoggedIn ? (
          <div className="mt-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 mx-auto flex items-center justify-center">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Đăng Nhập Giáo Viên</h2>
              <p className="text-xs text-slate-500">
                Nhập số điện thoại giáo viên đã đăng ký với trung tâm để kiểm tra ca dạy, xem học sinh học bù và nâng level.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLoginWithPhone(inputPhone);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số điện thoại giáo viên:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0903648788"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-base font-semibold tracking-wider rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Đang đăng nhập...</span>
                ) : (
                  <>
                    <span>Vào Không Gian Giảng Dạy</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-slate-400">
                Nếu số điện thoại chưa được đăng ký trong hệ thống, vui lòng báo Quản Trị Viên thêm giáo viên.
              </p>
            </div>
          </div>
        ) : (
          /* TEACHER DASHBOARD AFTER LOGIN */
          <div className="space-y-4">
            {/* Teacher Overview Card */}
            {activeTeacher && (
              <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-blue-100">
                      {activeTeacher.school_name || "Trung Tâm Đào Tạo"} • Mã: {activeTeacher.school_code || "TT-01"}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-black mt-0.5">{activeTeacher.name}</h2>
                    <p className="text-xs text-blue-100 flex items-center gap-2 mt-1">
                      <span>Chuyên môn: {activeTeacher.specialty || "Giáo viên trung tâm"}</span>
                      <span>•</span>
                      <span>SĐT: {activeTeacher.phone}</span>
                    </p>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-2xl font-black leading-none">{students.length}</span>
                    <span className="text-[10px] uppercase font-bold tracking-tight text-blue-100">Học sinh</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center justify-between">
                    <span className="text-blue-100">Lớp chính khóa:</span>
                    <span className="font-extrabold text-sm">{students.length} HS</span>
                  </div>
                  <div className="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs flex items-center justify-between">
                    <span className="text-blue-100">Lịch học bù:</span>
                    <span className="font-extrabold text-sm text-amber-300">{makeups.length} Buổi</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs (Mobile Optimized) */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-slate-800/80 text-xs font-bold">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Học Sinh Của Tôi ({students.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("makeups")}
                className={`flex-1 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "makeups"
                    ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarCheck className="w-4 h-4 text-amber-500" />
                <span>Lịch Học Bù ({makeups.length})</span>
                {makeups.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px]">
                    {makeups.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên học sinh, số điện thoại, trình độ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* TAB 1: Regular Students List */}
            {activeTab === "all" && (
              <div className="space-y-3">
                {filteredStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400/50 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{st.name}</h3>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {st.level_name || "Chưa phân loại"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{st.phone}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenUpgrade(st)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition shrink-0"
                        title="Nâng cấp hoặc thay đổi Level/Grade"
                      >
                        <Award className="w-3.5 h-3.5 text-purple-600" />
                        <span>Nâng Level</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white">Lịch học:</span>
                        <span>
                          {st.duration_mode === "by_hours"
                            ? `${st.hours_per_week}h/tuần (${st.registered_days || "Chưa chọn ngày"})`
                            : `${st.sessions_per_week} buổi/tuần (${st.registered_days || "Chưa chọn ngày"})`}
                        </span>
                      </div>

                      {st.study_time_detail && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                          {st.study_time_detail}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                      {st.zalo_link && (
                        <a
                          href={st.zalo_link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 font-semibold transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chat Zalo</span>
                        </a>
                      )}
                      <a
                        href={`tel:${st.phone}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gọi Điện</span>
                      </a>
                    </div>
                  </div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">Chưa có học sinh nào được phân công cho giáo viên này.</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Makeups List (ĐÁNH DẤU HỌC SINH HỌC BÙ) */}
            {activeTab === "makeups" && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <CalendarCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Danh sách học sinh đăng ký HỌC BÙ:</p>
                    <p className="text-[11px] opacity-90">
                      Học sinh tham gia lớp học bù được đánh dấu huy hiệu nổi bật màu cam để giáo viên dễ dàng theo dõi và kèm cặp.
                    </p>
                  </div>
                </div>

                {filteredMakeups.map((mk) => (
                  <div
                    key={mk.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400/70 shadow-md shadow-amber-500/5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{mk.student_name}</h3>
                          {/* PROMINENT MAKEUP BADGE */}
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs flex items-center gap-1 animate-pulse">
                            <Sparkles className="w-3 h-3" />
                            HỌC BÙ
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
                            {mk.level_name || "Chưa phân loại"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{mk.student_phone}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => handleOpenUpgrade(mk)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 shrink-0"
                        title="Nâng cấp Level"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Đổi Grade</span>
                      </button>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                        <Calendar className="w-4 h-4 text-amber-600" />
                        <span>Ngày học bù:</span>
                        <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">
                          {mk.makeup_date} {mk.makeup_time ? `(${mk.makeup_time})` : ""}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-6 space-y-0.5">
                        <p>
                          Bù cho ngày nghỉ: <span className="font-semibold text-slate-800 dark:text-slate-200">{mk.absence_date}</span>
                        </p>
                        {mk.absence_reason && <p>Lý do nghỉ: {mk.absence_reason}</p>}
                        {mk.note && <p className="italic text-amber-700">Ghi chú: {mk.note}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                      <a
                        href={`tel:${mk.student_phone}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Liên Hệ Học Sinh</span>
                      </a>
                    </div>
                  </div>
                ))}

                {filteredMakeups.length === 0 && (
                  <div className="py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <CalendarCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm">Hiện chưa có học sinh nào đăng ký học bù.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal: Upgrade Level / Grade */}
      {isUpgradeModalOpen && targetStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    Nâng Cấp Level / Trình Độ
                  </h3>
                  <p className="text-xs text-slate-500">Giáo viên cập nhật trực tiếp sau đánh giá</p>
                </div>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <p className="text-slate-500">Học sinh:</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {"student_name" in targetStudent ? targetStudent.student_name : targetStudent.name}
              </p>
              <p className="text-slate-500">
                Trình độ hiện tại:{" "}
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  {targetStudent.level_name || "Chưa phân loại"}
                </span>
              </p>
            </div>

            <form onSubmit={handleSubmitLevelUpgrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn Trình Độ / Level Mới:
                </label>
                <select
                  required
                  value={newLevelId}
                  onChange={(e) => setNewLevelId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-2xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                >
                  {levels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.level_name} ({Number(lvl.surcharge_amount).toLocaleString("vi-VN")} đ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLevel}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/30 disabled:opacity-50"
                >
                  {isSubmittingLevel ? "Đang lưu..." : "Xác Nhận Nâng Level"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
