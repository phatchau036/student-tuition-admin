"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Student, MonthFormat } from "@/lib/types";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import {
  X,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Copy,
  ExternalLink,
  Search,
  RefreshCw,
  Filter,
  User,
  Phone,
  DollarSign,
  Bot,
  Sparkles,
  Check,
  Eye,
  Calendar,
  QrCode,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { MonthPicker } from "./MonthPicker";

interface TuitionReminderQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialMonth: string;
  monthFormat?: MonthFormat;
  schoolId?: string;
  schoolName?: string;
  sepayBankName?: string;
  sepayAccountNumber?: string;
  sepayPrefix?: string;
  currentAdminName?: string;
  onRefreshData?: () => void;
}

interface StudentReminderData {
  student_id: string;
  last_reminded_at: string;
  remind_count: number;
  is_reminded_today: boolean;
  last_channel: "zalo_bot" | "zalo_manual";
  last_reminded_by?: string;
}

export const TuitionReminderQueueModal: React.FC<TuitionReminderQueueModalProps> = ({
  isOpen,
  onClose,
  students,
  initialMonth,
  monthFormat = "vietnamese",
  schoolId = "school-default",
  schoolName = "Trung Tâm Đào Tạo",
  sepayBankName = "",
  sepayAccountNumber = "",
  sepayPrefix = "HP",
  currentAdminName = "Lễ tân",
  onRefreshData,
}) => {
  const { showToast } = useToast();

  const getAuthHeaders = (): Record<string, string> => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [remindersMap, setRemindersMap] = useState<Record<string, StudentReminderData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pending_today" | "reminded_today" | "overdue">("all");
  
  // Custom message preview state
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSendingBotSingle, setIsSendingBotSingle] = useState<string | null>(null);
  const [isSendingBotBatch, setIsSendingBotBatch] = useState<boolean>(false);

  // Sync initial month
  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
    }
  }, [initialMonth]);

  // Fetch reminder status from backend
  const fetchReminders = async (monthToFetch: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/tuition-reminders?month=${monthToFetch}&school_id=${schoolId}`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.reminders_map) {
        setRemindersMap(json.reminders_map);
      }
    } catch (err: any) {
      console.error("Fetch reminders error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders(selectedMonth);
    }
  }, [isOpen, selectedMonth]);

  // Lọc danh sách học sinh cần đóng học phí (chưa đóng hoặc nợ dồn)
  const unpaidStudents = useMemo(() => {
    return students.filter((s) => {
      // Chỉ tính học sinh đang học (hoặc có nợ)
      const isStudying = (s.status || "studying") === "studying";
      const isUnpaid = s.payment_status === "unpaid";
      const hasDebt = (s.total_tuition_due && s.total_tuition_due > 0) || (s.previous_debt_amount && s.previous_debt_amount > 0);
      return (isStudying && isUnpaid) || hasDebt;
    });
  }, [students]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let remindedToday = 0;
    let overdueCount = 0;
    let totalDebt = 0;
    let botAvailableCount = 0;

    for (const st of unpaidStudents) {
      const due = st.is_overdue && st.total_tuition_due ? st.total_tuition_due : st.current_tuition || 0;
      totalDebt += due;

      if (st.is_overdue) {
        overdueCount++;
      }
      if (st.zalo_chat_id) {
        botAvailableCount++;
      }
      if (remindersMap[st.id]?.is_reminded_today) {
        remindedToday++;
      }
    }

    return {
      totalUnpaid: unpaidStudents.length,
      remindedToday,
      pendingToday: unpaidStudents.length - remindedToday,
      overdueCount,
      totalDebt,
      botAvailableCount,
    };
  }, [unpaidStudents, remindersMap]);

  // Lọc theo tìm kiếm và tab
  const filteredStudents = useMemo(() => {
    return unpaidStudents.filter((st) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = st.name.toLowerCase().includes(q);
        const matchPhone = (st.phone || "").includes(q);
        const matchCode = (st.student_code || "").toLowerCase().includes(q);
        const matchClass = (st.class_name || "").toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchCode && !matchClass) {
          return false;
        }
      }

      const reminder = remindersMap[st.id];
      const isRemindedToday = !!reminder?.is_reminded_today;

      if (activeFilter === "pending_today" && isRemindedToday) return false;
      if (activeFilter === "reminded_today" && !isRemindedToday) return false;
      if (activeFilter === "overdue" && !st.is_overdue) return false;

      return true;
    });
  }, [unpaidStudents, searchQuery, activeFilter, remindersMap]);

  // Hàm tạo link VietQR
  const getVietQrUrl = (amount: number, studentCodeOrPhone: string) => {
    if (!sepayBankName || !sepayAccountNumber) return "";
    const cleanBank = sepayBankName.trim().toLowerCase();
    const cleanAccount = sepayAccountNumber.trim();
    const addInfo = `${sepayPrefix || "HP"}+${studentCodeOrPhone}`.replace(/\s+/g, "+");
    const accountName = encodeURIComponent(schoolName || "TRUNG TAM");
    return `https://img.vietqr.io/image/${cleanBank}-${cleanAccount}-compact2.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
  };

  // Hàm tạo mẫu tin nhắn chuẩn
  const generateMessage = (student: Student) => {
    const monthDisplay = formatMonthDisplay(selectedMonth, monthFormat);
    const amount = student.is_overdue && student.total_tuition_due ? student.total_tuition_due : student.current_tuition || 0;
    const amountStr = formatVND(amount);
    const codeOrPhone = student.student_code || student.phone || "";
    const vietQrLink = getVietQrUrl(amount, codeOrPhone);

    const overdueLine = student.is_overdue && student.unpaid_months_count && student.unpaid_months_count > 1
      ? `  (Đã bao gồm nợ cũ ${student.unpaid_months_count - 1} tháng: ${formatVND(student.previous_debt_amount)})\n`
      : "";

    let bankBlock = "";
    if (sepayBankName && sepayAccountNumber) {
      bankBlock = `\n- Thông tin chuyển khoản học phí:
  • Ngân hàng: ${sepayBankName.toUpperCase()}
  • Số tài khoản: ${sepayAccountNumber}
  • Chủ tài khoản: ${schoolName}
  • Cú pháp CK: ${sepayPrefix || "HP"} ${codeOrPhone}`;
      if (vietQrLink) {
        bankBlock += `\n  • Quét mã QR thanh toán nhanh: ${vietQrLink}`;
      }
    }

    return `Kính gửi Quý phụ huynh học sinh ${student.name},
${schoolName} xin thông báo về kỳ đóng học phí ${monthDisplay}:
- Học sinh: ${student.name} (${student.class_name || student.level_name || "Lớp học"})
- Tổng học phí cần thanh toán: ${amountStr}
${overdueLine}${bankBlock}

Quý phụ huynh vui lòng hoàn tất học phí để trung tâm chuẩn bị tốt nhất cho buổi học của bé. Nếu quý phụ huynh đã thanh toán, xin vui lòng bỏ qua thông báo này.
${schoolName} xin trân trọng cảm ơn!`;
  };

  // Xử lý gửi Zalo thủ công (Nút bấm chính 2 giây)
  const handleSendZaloManual = async (student: Student, overrideText?: string) => {
    const message = overrideText || generateMessage(student);
    const amount = student.is_overdue && student.total_tuition_due ? student.total_tuition_due : student.current_tuition || 0;
    const rawPhone = student.phone ? student.phone.replace(/\D/g, "") : "";

    // 1. Sao chép nội dung vào clipboard
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Fallback nếu browser chặn
      const textArea = document.createElement("textarea");
      textArea.value = message;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    // 2. Mở Zalo chat
    if (rawPhone) {
      window.open(`https://zalo.me/${rawPhone}`, "_blank");
    }

    // 3. Optimistic update trạng thái
    setRemindersMap((prev) => ({
      ...prev,
      [student.id]: {
        student_id: student.id,
        last_reminded_at: new Date().toISOString(),
        remind_count: (prev[student.id]?.remind_count || 0) + 1,
        is_reminded_today: true,
        last_channel: "zalo_manual",
        last_reminded_by: currentAdminName,
      },
    }));

    // 4. Lưu vết vào backend
    try {
      await fetch("/api/admin/tuition-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          action: "log",
          school_id: schoolId,
          student_id: student.id,
          month: selectedMonth,
          amount,
          channel: "zalo_manual",
          reminded_by: currentAdminName,
        }),
      });
    } catch (err) {
      console.error("Log reminder error:", err);
    }

    showToast(`Đã sao chép tin nhắn & mở Zalo phụ huynh ${student.name}!`, "success");
    if (previewStudent?.id === student.id) {
      setPreviewStudent(null);
    }
  };

  // Xử lý gửi Zalo Bot cho 1 học sinh
  const handleSendZaloBotSingle = async (student: Student, overrideText?: string) => {
    if (!student.zalo_chat_id) {
      showToast("Học sinh này chưa có Zalo Chat ID!", "error");
      return;
    }

    const message = overrideText || generateMessage(student);
    const amount = student.is_overdue && student.total_tuition_due ? student.total_tuition_due : student.current_tuition || 0;

    try {
      setIsSendingBotSingle(student.id);
      const res = await fetch("/api/admin/tuition-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          action: "send_bot",
          school_id: schoolId,
          student_id: student.id,
          month: selectedMonth,
          amount,
          text: message,
          reminded_by: currentAdminName,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRemindersMap((prev) => ({
          ...prev,
          [student.id]: {
            student_id: student.id,
            last_reminded_at: new Date().toISOString(),
            remind_count: (prev[student.id]?.remind_count || 0) + 1,
            is_reminded_today: true,
            last_channel: "zalo_bot",
            last_reminded_by: currentAdminName,
          },
        }));
        showToast(`Đã gửi tin nhắn qua Zalo Bot cho ${student.name}!`, "success");
        if (previewStudent?.id === student.id) {
          setPreviewStudent(null);
        }
      } else {
        showToast(data.message || "Gửi Bot thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi gửi Bot!", "error");
    } finally {
      setIsSendingBotSingle(null);
    }
  };

  // Xử lý gửi Bot hàng loạt cho tất cả các em có Chat ID trong danh sách đang xem
  const handleSendBotBatch = async () => {
    const candidates = filteredStudents.filter((st) => st.zalo_chat_id);
    if (candidates.length === 0) {
      showToast("Không có học sinh nào trong danh sách hiện tại có Zalo Chat ID!", "info");
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn gửi tin nhắn Zalo Bot tự động cho ${candidates.length} học sinh có Chat ID trong danh sách này không?`
      )
    ) {
      return;
    }

    try {
      setIsSendingBotBatch(true);
      const items = candidates.map((st) => {
        const amount = st.is_overdue && st.total_tuition_due ? st.total_tuition_due : st.current_tuition || 0;
        return {
          student_id: st.id,
          chat_id: st.zalo_chat_id,
          amount,
          text: generateMessage(st),
        };
      });

      const res = await fetch("/api/admin/tuition-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          action: "send_bot_batch",
          school_id: schoolId,
          month: selectedMonth,
          reminded_by: currentAdminName,
          items,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || "Đã hoàn tất gửi tin nhắn qua Zalo Bot!", "success");
        fetchReminders(selectedMonth);
      } else {
        showToast(data.message || "Gửi Bot hàng loạt thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối khi gửi Bot hàng loạt!", "error");
    } finally {
      setIsSendingBotBatch(false);
    }
  };

  // Format thời gian nhắc
  const formatTimeAgo = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      return `${hours}:${mins} (${day}/${month})`;
    } catch {
      return isoStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Hàng Đợi Nhắc Học Phí Nhanh Qua Zalo
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {unpaidStudents.length} em cần thu
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tập trung danh sách học sinh chưa đóng & nợ cũ, gửi tin nhắn Zalo kèm mã VietQR tự động chỉ trong 2 giây
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Bộ chọn tháng */}
            <div className="w-44">
              <MonthPicker
                value={selectedMonth}
                onChange={(m) => setSelectedMonth(m)}
                monthFormat={monthFormat}
              />
            </div>

            <button
              onClick={() => fetchReminders(selectedMonth)}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
              title="Làm mới trạng thái nhắc"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 STAT CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 sm:p-4 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
              Tổng Học Sinh Cần Thu
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {stats.totalUnpaid}
              </span>
              <span className="text-xs text-slate-500">học sinh</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block">
              Chưa Nhắc Hôm Nay
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {stats.pendingToday}
              </span>
              <span className="text-xs text-amber-600/70 font-semibold">em cần gửi</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
              Đã Nhắc Hôm Nay
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.remindedToday}
              </span>
              <span className="text-xs text-emerald-600/70 font-semibold">em đã nhận</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/80 p-3 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 shadow-2xs">
            <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider block">
              Tổng Tiền Cần Thu
            </span>
            <div className="mt-0.5">
              <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                {formatVND(stats.totalDebt)}
              </span>
            </div>
          </div>
        </div>

        {/* TOOLBAR & FILTER TABS */}
        <div className="p-3 sm:px-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-none pb-1 md:pb-0">
            <button
              onClick={() => setActiveFilter("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                activeFilter === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              Tất cả ({stats.totalUnpaid})
            </button>

            <button
              onClick={() => setActiveFilter("pending_today")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === "pending_today"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Chưa nhắc hôm nay ({stats.pendingToday})</span>
            </button>

            <button
              onClick={() => setActiveFilter("reminded_today")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === "reminded_today"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã nhắc hôm nay ({stats.remindedToday})</span>
            </button>

            <button
              onClick={() => setActiveFilter("overdue")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1.5 ${
                activeFilter === "overdue"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Nợ dồn &gt; 1 tháng ({stats.overdueCount})</span>
            </button>
          </div>

          {/* Right Actions: Search & Batch Bot Button */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tên, SĐT, mã bé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {stats.botAvailableCount > 0 && (
              <button
                type="button"
                onClick={handleSendBotBatch}
                disabled={isSendingBotBatch}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 shrink-0 transition disabled:opacity-50"
                title="Gửi tin nhắn qua Zalo Bot cho tất cả các em có Chat ID"
              >
                <Bot className="w-3.5 h-3.5 text-blue-600" />
                <span>{isSendingBotBatch ? "Đang gửi..." : `Gửi Bot (${stats.botAvailableCount} em)`}</span>
              </button>
            )}
          </div>
        </div>

        {/* STUDENT LIST TABLE */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {activeFilter === "pending_today"
                  ? "Tuyệt vời! Tất cả học sinh cần thu đều đã được nhắc trong ngày hôm nay."
                  : "Không tìm thấy học sinh nào phù hợp với bộ lọc."}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {activeFilter !== "all" ? "Thử chuyển sang tab 'Tất cả' hoặc tìm từ khóa khác." : "Toàn bộ học sinh đã hoàn tất học phí kỳ này."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((st, idx) => {
                const reminder = remindersMap[st.id];
                const isRemindedToday = !!reminder?.is_reminded_today;
                const dueAmount = st.is_overdue && st.total_tuition_due ? st.total_tuition_due : st.current_tuition || 0;
                const isOverdue = !!st.is_overdue;

                return (
                  <div
                    key={st.id}
                    className={`p-3 sm:p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isRemindedToday
                        ? "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-85 hover:opacity-100"
                        : "bg-white dark:bg-slate-800/90 border-amber-200/80 dark:border-amber-900/50 shadow-2xs hover:border-blue-400"
                    }`}
                  >
                    {/* Left: Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="text-xs font-black text-slate-400 w-6 pt-1 text-center shrink-0">
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {st.name}
                          </span>
                          {st.student_code && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {st.student_code}
                            </span>
                          )}
                          {st.class_name && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                              {st.class_name}
                            </span>
                          )}
                          {st.zalo_chat_id && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                              <Bot className="w-3 h-3" />
                              <span>Có Bot Chat ID</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{st.phone || "Chưa có SĐT"}</span>
                          </span>
                          {st.tuition_package_name && (
                            <span className="text-slate-400">
                              • {st.tuition_package_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Amount & Status Badge */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-9 md:pl-0">
                      <div className="text-left md:text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          {formatVND(dueAmount)}
                        </div>
                        {isOverdue && st.previous_debt_amount ? (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Nợ {st.unpaid_months_count} tháng ({formatVND(st.previous_debt_amount)})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Kỳ {formatMonthDisplay(selectedMonth, monthFormat)}
                          </span>
                        )}
                      </div>

                      {/* Reminder status badge */}
                      <div className="w-36 text-right shrink-0">
                        {isRemindedToday ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Đã nhắc hôm nay</span>
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">
                              {formatTimeAgo(reminder.last_reminded_at)} ({reminder.remind_count} lần)
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Chưa nhắc hôm nay</span>
                            </span>
                            {reminder && reminder.remind_count > 0 && (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                Đã nhắc {reminder.remind_count} lần trước đó
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Nút Gửi Zalo (Sao chép + Mở chat Zalo trong 2 giây) */}
                        <button
                          type="button"
                          onClick={() => handleSendZaloManual(st)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer ${
                            isRemindedToday
                              ? "bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
                          }`}
                          title="Sao chép tin nhắn chuẩn kèm VietQR và mở cửa sổ chat Zalo với phụ huynh"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Gửi Zalo</span>
                        </button>

                        {/* Nút gửi Bot trực tiếp (nếu có Chat ID) */}
                        {st.zalo_chat_id && (
                          <button
                            type="button"
                            disabled={isSendingBotSingle === st.id}
                            onClick={() => handleSendZaloBotSingle(st)}
                            className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition"
                            title="Bắn tin nhắn tự động qua Zalo Bot"
                          >
                            <Bot className={`w-4 h-4 ${isSendingBotSingle === st.id ? "animate-spin" : ""}`} />
                          </button>
                        )}

                        {/* Nút xem trước / sửa nội dung tin nhắn */}
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewStudent(st);
                            setCustomMessage(generateMessage(st));
                          }}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="Xem trước & sửa lời nhắn"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-3 sm:px-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Mẹo: Bấm <strong>&quot;Gửi Zalo&quot;</strong> hệ thống tự động copy tin nhắn và mở app Zalo tới phụ huynh. Lễ tân chỉ cần dán (Ctrl+V) là xong!</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>

      {/* POPUP XEM TRƯỚC & TÙY CHỈNH NỘI DUNG TIN NHẮN */}
      {previewStudent && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Xem Trước & Tùy Chỉnh Tin Nhắn Nhắc Học Phí</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Học sinh: <strong>{previewStudent.name}</strong> • SĐT: {previewStudent.phone}
                </p>
              </div>
              <button
                onClick={() => setPreviewStudent(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Nội dung tin nhắn sẽ gửi đến phụ huynh:
              </label>
              <textarea
                rows={11}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 text-xs font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
              />

              {sepayBankName && sepayAccountNumber && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Đã tích hợp sẵn link VietQR thanh toán đúng cú pháp của ngân hàng <strong>{sepayBankName}</strong>.</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCustomMessage(generateMessage(previewStudent))}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Khôi phục mẫu gốc</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewStudent(null)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSendZaloManual(previewStudent, customMessage)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Copy & Mở Zalo Ngay</span>
                </button>
                {previewStudent.zalo_chat_id && (
                  <button
                    type="button"
                    onClick={() => handleSendZaloBotSingle(previewStudent, customMessage)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Gửi Qua Bot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
