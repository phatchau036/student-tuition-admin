"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Student } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  X,
  Wallet,
  Clock,
  ArrowDownToLine,
  ArrowUpFromLine,
  Zap,
  History,
  RefreshCw,
  Phone,
  CalendarPlus,
  TrendingDown,
  Sparkles,
  ChevronDown,
} from "lucide-react";

/* =========================================================================
 * HOUR WALLET MODAL — Ví Giờ Học của 1 học sinh
 * - 3 ô thống kê: Số dư / Đã xếp bù chưa học / Khả dụng
 * - Sổ cái hour_ledger phân trang
 * - Tác vụ: Cấp giờ chu kỳ (preview công thức) / Điều chỉnh tay
 * ========================================================================= */

interface LedgerEntry {
  id: string;
  type: string; // GRANT | CONSUME | ADJUST | REFUND | EXPIRE
  minutes: number;
  ref_type: string;
  note: string;
  created_by: string;
  created_at: string;
}

interface WalletData {
  balance_minutes: number;
  scheduled_makeup_minutes: number;
  available_minutes: number;
  ledger: LedgerEntry[];
  pagination: { page: number; page_size: number; total: number };
}

interface HourWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  schoolId?: string;
  onOpenMakeup?: (studentId: string) => void;
  onRefresh?: () => void;
}

// Format phút -> "7h30"
function fmtMin(total: number): string {
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(Math.round(total));
  if (abs === 0) return "0 phút";
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} phút`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h${String(m).padStart(2, "0")}`;
}

// Thời gian hiển thị gọn: "29/10 14:30"
function fmtTime(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

function getLedgerStyle(type: string): { icon: React.ReactNode; bg: string; label: string } {
  switch (type) {
    case "GRANT":
      return {
        icon: <ArrowDownToLine className="w-3.5 h-3.5" />,
        bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
        label: "Cấp giờ",
      };
    case "CONSUME":
      return {
        icon: <ArrowUpFromLine className="w-3.5 h-3.5" />,
        bg: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
        label: "Trừ giờ",
      };
    case "ADJUST":
      return {
        icon: <Zap className="w-3.5 h-3.5" />,
        bg: "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300",
        label: "Điều chỉnh",
      };
    case "REFUND":
      return {
        icon: <History className="w-3.5 h-3.5" />,
        bg: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
        label: "Hoàn giờ",
      };
    case "EXPIRE":
      return {
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        bg: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
        label: "Hết hạn",
      };
    default:
      return {
        icon: <History className="w-3.5 h-3.5" />,
        bg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        label: type,
      };
  }
}

export const HourWalletModal: React.FC<HourWalletModalProps> = ({
  isOpen,
  onClose,
  student,
  schoolId,
  onOpenMakeup,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Grant cycle state
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [grantMonth, setGrantMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [grantPreview, setGrantPreview] = useState<{
    breakdown: string;
    sessions: number;
    formatted: string;
    fullWeeks: number;
    leftoverDays: number;
  } | null>(null);
  const [isGrantLoading, setIsGrantLoading] = useState(false);

  // Adjust state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustMinutes, setAdjustMinutes] = useState<number>(30);
  const [adjustNote, setAdjustNote] = useState<string>("");
  const [isAdjustLoading, setIsAdjustLoading] = useState(false);

  const getHeaders = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (schoolId) headers["x-school-id"] = schoolId;
    return headers;
  }, [schoolId]);

  const loadWallet = useCallback(
    async (targetPage: number, append: boolean) => {
      if (!student) return;
      try {
        if (append) setIsLoadingMore(true);
        else setIsLoading(true);
        const res = await fetch(
          `/api/wallet?action=get_wallet&student_id=${student.id}&page=${targetPage}&page_size=15`,
          { headers: getHeaders() }
        );
        const json = await res.json();
        if (json.success) {
          const incoming = json.data as WalletData;
          setWallet((prev) => {
            if (append && prev) {
              return {
                ...incoming,
                ledger: [...prev.ledger, ...incoming.ledger],
              };
            }
            return incoming;
          });
          setPage(targetPage);
        } else {
          showToast(json.message || "Không thể tải ví giờ!", "error");
        }
      } catch {
        showToast("Lỗi kết nối máy chủ!", "error");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [student, getHeaders, showToast]
  );

  // Reset panels khi mở modal — dùng key remount thay cho setState trong effect
  const modalKey = `${student?.id || "none"}-${isOpen ? "open" : "closed"}`;

  useEffect(() => {
    if (!isOpen || !student) return;
    let cancelled = false;
    const init = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/wallet?action=get_wallet&student_id=${student.id}&page=1&page_size=15`,
          { headers: getHeaders() }
        );
        const json = await res.json();
        if (!cancelled && json.success) {
          setWallet(json.data as WalletData);
          setPage(1);
        }
      } catch {
        if (!cancelled) showToast("Lỗi kết nối máy chủ!", "error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [isOpen, student, getHeaders, showToast]);

  const handlePreviewGrant = async () => {
    if (!student) return;
    try {
      setIsGrantLoading(true);
      const res = await fetch(
        `/api/wallet?action=preview_cycle&student_id=${student.id}&cycle_month=${grantMonth}`,
        { headers: getHeaders() }
      );
      const json = await res.json();
      if (json.success) {
        setGrantPreview(json.data);
      } else {
        showToast(json.message || "Không thể xem trước công thức!", "error");
        setGrantPreview(null);
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsGrantLoading(false);
    }
  };

  const handleConfirmGrant = async () => {
    if (!student) return;
    try {
      setIsGrantLoading(true);
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ action: "grant_cycle", student_id: student.id, cycle_month: grantMonth }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setIsGrantOpen(false);
        setGrantPreview(null);
        loadWallet(1, false);
        onRefresh?.();
      } else {
        showToast(json.message || "Cấp giờ thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsGrantLoading(false);
    }
  };

  const handleAdjust = async () => {
    if (!student) return;
    if (!adjustNote.trim()) {
      showToast("Vui lòng nhập ghi chú cho lần điều chỉnh!", "error");
      return;
    }
    try {
      setIsAdjustLoading(true);
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          action: "adjust_hours",
          student_id: student.id,
          minutes: adjustMinutes,
          note: adjustNote.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setIsAdjustOpen(false);
        setAdjustNote("");
        loadWallet(1, false);
        onRefresh?.();
      } else {
        showToast(json.message || "Điều chỉnh thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsAdjustLoading(false);
    }
  };

  if (!isOpen || !student) return null;

  const balance = wallet?.balance_minutes ?? 0;
  const scheduled = wallet?.scheduled_makeup_minutes ?? 0;
  const available = wallet?.available_minutes ?? 0;
  const isNegative = available < 0;

  const hasNextPage = wallet ? wallet.ledger.length < wallet.pagination.total : false;

  return (
    <div key={modalKey} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header: Student + Balance Badge */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-indigo-500 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
              {student.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Ví Giờ Học
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                  ⏱️ HOUR WALLET
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1 truncate">
                <span className="font-bold text-slate-700 dark:text-slate-200">{student.name}</span>
                <span className="flex items-center gap-0.5">
                  <Phone className="w-3 h-3" /> {student.phone}
                </span>
              </p>
            </div>
          </div>

          {/* Balance badge */}
          <div
            className={`px-4 py-2 rounded-2xl text-center shrink-0 shadow-sm ${
              isNegative
                ? "bg-rose-600 text-white animate-pulse"
                : "bg-linear-to-br from-indigo-600 to-indigo-700 text-white"
            }`}
            title={isNegative ? "Số dư khả dụng âm" : "Số dư khả dụng"}
          >
            <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">Khả dụng</div>
            <div className="text-xl font-black leading-tight">{fmtMin(available)}</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* 3 Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Số dư</div>
              <div className={`text-base font-black mt-0.5 ${balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                {fmtMin(balance)}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bù đã xếp</div>
              <div className="text-base font-black mt-0.5 text-amber-600 dark:text-amber-400">{fmtMin(scheduled)}</div>
            </div>
            <div
              className={`p-3 rounded-2xl border text-center ${
                isNegative
                  ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800"
                  : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                Khả dụng
              </div>
              <div className={`text-base font-black mt-0.5 ${isNegative ? "text-rose-600 dark:text-rose-400" : "text-indigo-700 dark:text-indigo-300"}`}>
                {fmtMin(available)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setIsGrantOpen(!isGrantOpen);
                setIsAdjustOpen(false);
                if (!isGrantOpen) setGrantPreview(null);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Cấp giờ chu kỳ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdjustOpen(!isAdjustOpen);
                setIsGrantOpen(false);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Điều chỉnh tay</span>
            </button>
            {onOpenMakeup && (
              <button
                type="button"
                onClick={() => onOpenMakeup(student.id)}
                className="px-3 py-1.5 text-xs font-black rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95 ml-auto"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                <span>Xếp lịch học bù</span>
              </button>
            )}
          </div>

          {/* GRANT panel */}
          {isGrantOpen && (
            <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Chọn chu kỳ tháng cần cấp giờ:
                </label>
                <input
                  type="month"
                  value={grantMonth}
                  onChange={(e) => {
                    setGrantMonth(e.target.value);
                    setGrantPreview(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 outline-none cursor-pointer"
                />
              </div>

              {!grantPreview ? (
                <button
                  type="button"
                  onClick={handlePreviewGrant}
                  disabled={isGrantLoading}
                  className="w-full py-2 text-xs font-bold rounded-xl border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGrantLoading ? "Đang tính..." : "Xem trước công thức cấp giờ"}</span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-indigo-900 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Chu kỳ:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {grantPreview.fullWeeks} tuần + {grantPreview.leftoverDays} ngày
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số buổi học:</span>
                      <span className="font-black text-indigo-700 dark:text-indigo-300">{grantPreview.sessions} buổi</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-indigo-100 dark:border-indigo-900">
                      <span className="text-slate-500 font-bold">Giờ được cấp:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {grantPreview.formatted}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmGrant}
                    disabled={isGrantLoading}
                    className="w-full py-2 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isGrantLoading ? "Đang cấp..." : `Xác nhận cấp ${grantPreview.formatted}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ADJUST panel */}
          {isAdjustOpen && (
            <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 shrink-0">Số phút:</span>
                <input
                  type="number"
                  step="5"
                  value={adjustMinutes}
                  onChange={(e) => setAdjustMinutes(Number(e.target.value) || 0)}
                  className="w-24 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <div className="flex gap-1">
                  {[-30, 30, -60, 60].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAdjustMinutes(v)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition cursor-pointer ${
                        adjustMinutes === v
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400"
                      }`}
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                required
                placeholder="Ghi chú bắt buộc (VD: Tặng 30 phút khuyến mãi...)"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleAdjust}
                disabled={isAdjustLoading || !adjustNote.trim() || adjustMinutes === 0}
                className="w-full py-2 text-xs font-black uppercase tracking-wider text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isAdjustLoading ? "Đang lưu..." : `Xác nhận ${adjustMinutes > 0 ? "+" : ""}${fmtMin(adjustMinutes)}`}
              </button>
            </div>
          )}

          {/* Ledger */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                Sổ cái ví giờ
              </h3>
              <button
                type="button"
                onClick={() => loadWallet(1, false)}
                disabled={isLoading}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                Làm mới
              </button>
            </div>

            {isLoading && !wallet ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : !wallet || wallet.ledger.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 text-xs space-y-2">
                <Wallet className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <p>Ví giờ chưa có giao dịch nào.</p>
                <p className="text-[11px]">Cấp giờ khi học sinh đóng tiền hoặc dùng nút &quot;Cấp giờ chu kỳ&quot; ở trên.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {wallet.ledger.map((entry) => {
                  const style = getLedgerStyle(entry.type);
                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 flex items-center gap-3 hover:border-slate-300 transition"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${style.bg}`}>
                        {style.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800 dark:text-slate-100">{style.label}</span>
                          <span
                            className={`font-mono font-black text-xs ${
                              entry.minutes >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {entry.minutes > 0 ? "+" : ""}
                            {fmtMin(entry.minutes)}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5" title={entry.note}>
                            {entry.note}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {fmtTime(entry.created_at)} · {entry.created_by}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {hasNextPage && (
                  <button
                    type="button"
                    onClick={() => loadWallet(page + 1, true)}
                    disabled={isLoadingMore}
                    className="w-full py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {isLoadingMore ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isLoadingMore ? "Đang tải..." : `Xem thêm (${wallet.ledger.length}/${wallet.pagination.total})`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Giờ được cấp khi đóng tiền, trừ theo phút học thật. Nghỉ có phép giữ nguyên giờ để xếp bù.
          </p>
        </div>
      </div>
    </div>
  );
};
