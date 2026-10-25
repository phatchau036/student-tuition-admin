"use client";

import React, { useState, useEffect } from "react";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { MonthFormat, SePayTransaction } from "@/lib/types";
import {
  X,
  TrendingUp,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Calendar,
  Layers,
  ArrowDownLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
} from "lucide-react";
import { MonthPicker } from "./MonthPicker";

interface MonthlySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonth: string;
  monthFormat?: MonthFormat;
  onRefreshData?: () => void;
}

interface SummaryData {
  summary: {
    month: string;
    total_students: number;
    studying_students: number;
    reserved_students: number;
    dropped_students: number;
    paid_count: number;
    unpaid_count: number;
    total_expected_revenue: number;
    total_actual_revenue: number;
    total_unpaid_revenue: number;
    sepay_matched_count: number;
    sepay_matched_revenue: number;
  };
  students: Array<{
    id: string;
    student_code: string;
    name: string;
    phone: string;
    status: string;
    package_name: string;
    fee: number;
    is_paid: boolean;
    payment_info?: any;
  }>;
  sepay_transactions: SePayTransaction[];
}

export const MonthlySummaryModal: React.FC<MonthlySummaryModalProps> = ({
  isOpen,
  onClose,
  initialMonth,
  monthFormat = "vietnamese",
  onRefreshData,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [data, setData] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "sepay_logs">("overview");
  const [studentFilter, setStudentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadSummary(selectedMonth);
    }
  }, [isOpen, selectedMonth]);

  const loadSummary = async (m: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/reconciliation/summary?month=${m}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load summary:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const s = data?.summary;
  const filteredStudents = (data?.students || []).filter((st) => {
    if (studentFilter === "paid" && !st.is_paid) return false;
    if (studentFilter === "unpaid" && st.is_paid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = st.name.toLowerCase().includes(q);
      const matchPhone = st.phone.includes(q);
      const matchCode = st.student_code.toLowerCase().includes(q);
      return matchName || matchPhone || matchCode;
    }
    return true;
  });

  const percentCollected =
    s && s.total_expected_revenue > 0
      ? Math.min(100, Math.round((s.total_actual_revenue / s.total_expected_revenue) * 100))
      : s && s.paid_count > 0
      ? 100
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/25">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Báo Cáo & Tổng Kết Học Phí Tháng
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {formatMonthDisplay(selectedMonth, monthFormat)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Đối soát tài chính, tỷ lệ thu học phí và lịch sử biến động SePay tự động
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MonthPicker
              value={selectedMonth}
              onChange={(m) => setSelectedMonth(m)}
              monthFormat={monthFormat}
            />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Pills Navigation */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-2.5 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Tổng Quan Tài Chính</span>
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "students"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Chi Tiết Học Sinh ({data?.students.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("sepay_logs")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "sepay_logs"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Giao Dịch SePay Tự Động ({data?.sepay_transactions.length || 0})</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isLoading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Đang tổng hợp dữ liệu báo cáo...</span>
            </div>
          ) : activeTab === "overview" ? (
            <div className="space-y-6">
              {/* Top 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Tổng Dự Thu */}
                <div className="p-4.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Tổng Dự Thu</span>
                    <DollarSign className="w-4 h-4 text-indigo-500" />
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatVND(s?.total_expected_revenue)}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Từ {s?.studying_students || 0} học sinh đang học
                    </p>
                  </div>
                </div>

                {/* 2. Thực Thu Đã Đóng */}
                <div className="p-4.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                    <span>Đã Thu Thực Tế</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                      {formatVND(s?.total_actual_revenue)}
                    </span>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 font-bold">
                      {s?.paid_count || 0} học sinh đã đóng ({percentCollected}%)
                    </p>
                  </div>
                </div>

                {/* 3. Công Nợ Còn Lại */}
                <div className="p-4.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center justify-between">
                    <span>Công Nợ Chưa Thu</span>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                      {formatVND(s?.total_unpaid_revenue)}
                    </span>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5 font-bold">
                      {s?.unpaid_count || 0} học sinh cần đóng tiền
                    </p>
                  </div>
                </div>

                {/* 4. Đối Soát Qua SePay */}
                <div className="p-4.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 shadow-xs flex flex-col justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center justify-between">
                    <span>SePay Tự Động</span>
                    <QrCode className="w-4 h-4 text-purple-600" />
                  </span>
                  <div className="mt-2">
                    <span className="text-2xl font-black text-purple-700 dark:text-purple-300 tracking-tight">
                      {formatVND(s?.sepay_matched_revenue)}
                    </span>
                    <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5 font-bold">
                      {s?.sepay_matched_count || 0} giao dịch khớp tự động
                    </p>
                  </div>
                </div>
              </div>

              {/* Tiến độ hoàn thành học phí */}
              <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Tiến độ hoàn tất học phí kỳ {formatMonthDisplay(selectedMonth, monthFormat)}:
                  </span>
                  <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                    {percentCollected}% ({s?.paid_count}/{s?.studying_students} học sinh)
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentCollected}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Đã đóng: {formatVND(s?.total_actual_revenue)}</span>
                  <span>Chưa đóng: {formatVND(s?.total_unpaid_revenue)}</span>
                </div>
              </div>

              {/* Tình hình sĩ số học sinh */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Đang theo học</span>
                    <span className="text-xl font-black text-emerald-600">{s?.studying_students || 0} HS</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    🟢
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Đang bảo lưu</span>
                    <span className="text-xl font-black text-amber-600">{s?.reserved_students || 0} HS</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    🟡
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Đã nghỉ học</span>
                    <span className="text-xl font-black text-rose-600">{s?.dropped_students || 0} HS</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                    🔴
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "students" ? (
            /* TAB 2: Danh sách chi tiết đối soát học sinh */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên, mã HS, SĐT..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none"
                  />
                </div>

                {/* Filter */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setStudentFilter("all")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      studentFilter === "all"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    Tất cả ({data?.students.length || 0})
                  </button>
                  <button
                    onClick={() => setStudentFilter("paid")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      studentFilter === "paid"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    Đã đóng ({s?.paid_count || 0})
                  </button>
                  <button
                    onClick={() => setStudentFilter("unpaid")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                      studentFilter === "unpaid"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    Chưa đóng ({s?.unpaid_count || 0})
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-black uppercase text-slate-400">
                      <th className="py-2.5 px-3">Mã & Học sinh</th>
                      <th className="py-2.5 px-3">SĐT</th>
                      <th className="py-2.5 px-3">Trạng thái học</th>
                      <th className="py-2.5 px-3">Gói áp dụng</th>
                      <th className="py-2.5 px-3 text-right">Học phí cần thu</th>
                      <th className="py-2.5 px-3 text-center">Tình trạng phí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400">
                          Không có học sinh nào phù hợp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mr-1.5">
                              {st.student_code}
                            </span>
                            {st.name}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{st.phone}</td>
                          <td className="py-2.5 px-3">
                            {st.status === "studying" ? (
                              <span className="text-emerald-600 font-bold">🟢 Đang học</span>
                            ) : st.status === "reserved" ? (
                              <span className="text-amber-600 font-bold">🟡 Bảo lưu</span>
                            ) : (
                              <span className="text-rose-600 font-bold">🔴 Nghỉ học</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{st.package_name}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                            {formatVND(st.fee)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {st.is_paid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> Đã đóng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                <AlertCircle className="w-3 h-3" /> Cần đóng
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAB 3: Lịch sử giao dịch SePay */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
                <span>
                  Các giao dịch chuyển khoản tự động được gửi qua Webhook từ cổng SePay và đối soát vào hệ thống:
                </span>
                <button
                  onClick={() => loadSummary(selectedMonth)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold flex items-center gap-1 hover:bg-indigo-700 transition"
                >
                  <RefreshCw className="w-3 h-3" /> Làm mới
                </button>
              </div>

              <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-black uppercase text-slate-400">
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Ngân hàng & Số tiền</th>
                      <th className="py-2.5 px-3">Nội dung chuyển</th>
                      <th className="py-2.5 px-3">Học sinh khớp</th>
                      <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(data?.sepay_transactions || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400">
                          Chưa có giao dịch SePay nào được ghi nhận trong tháng này.
                        </td>
                      </tr>
                    ) : (
                      data?.sepay_transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                            {tx.transaction_date || tx.created_at}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-extrabold text-emerald-600 block">
                              +{formatVND(tx.transfer_amount)}
                            </span>
                            <span className="text-[10px] text-slate-400">{tx.gateway}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 max-w-xs break-all">
                            {tx.content}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {tx.student_name ? (
                              <span className="flex items-center gap-1 text-indigo-600">
                                <span>{tx.student_name}</span>
                                <span className="text-[10px] font-normal text-slate-400">
                                  ({tx.matched_period})
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Chưa khớp được HS</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {tx.status === "matched" ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Đã khớp tự động
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Chưa khớp
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 text-xs">
          <span className="text-slate-400 font-medium">
            Dữ liệu tổng kết được tính toán thời gian thực theo kỳ {formatMonthDisplay(selectedMonth, monthFormat)}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            Đóng Báo Cáo
          </button>
        </div>
      </div>
    </div>
  );
};
