"use client";

import React, { useState, useEffect } from "react";
import { StudentStatusLog, MonthFormat } from "@/lib/types";
import { formatMonthDisplay } from "@/lib/tuition";
import { useToast } from "@/components/Toast";
import {
  History,
  Calendar,
  Clock,
  Filter,
  X,
  ArrowRight,
  UserCheck,
  PauseCircle,
  UserX,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface StatusLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  monthFormat?: MonthFormat;
  schoolId?: string;
  onRefreshData?: () => void;
}

export const StatusLogModal: React.FC<StatusLogModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  monthFormat = "vietnamese",
  schoolId,
  onRefreshData,
}) => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<StudentStatusLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(selectedMonth);

  // Danh sách học sinh đang thực sự Bảo lưu & Nghỉ học thời gian thực
  const [summaryData, setSummaryData] = useState<{
    active_reserved_count: number;
    active_dropped_count: number;
    active_reserved: Array<{
      id: string;
      name: string;
      phone: string;
      status_date: string;
      expected_return_date: string;
      status_note: string;
    }>;
    active_dropped: Array<{
      id: string;
      name: string;
      phone: string;
      status_date: string;
      status_note: string;
    }>;
  }>({
    active_reserved_count: 0,
    active_dropped_count: 0,
    active_reserved: [],
    active_dropped: [],
  });

  const [activeTab, setActiveTab] = useState<"logs" | "current_reserved" | "current_dropped">("logs");

  const loadLogs = async (m: string) => {
    try {
      setIsLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (schoolId) headers["x-school-id"] = schoolId;

      const params = new URLSearchParams();
      if (m) params.set("month", m);
      if (schoolId) params.set("school_id", schoolId);

      const url = `/api/status-logs?${params.toString()}`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        if (json.summary) {
          setSummaryData(json.summary);
        }
      }
    } catch (error) {
      console.error("Failed to load status logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFilterMonth(selectedMonth);
      loadLogs(selectedMonth);
    }
  }, [isOpen, selectedMonth, schoolId]);

  // Cho học sinh học lại ngay từ modal
  const handleResumeStudent = async (studentId: string, studentName: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (schoolId) headers["x-school-id"] = schoolId;

      const res = await fetch("/api/students/status", {
        method: "POST",
        headers,
        body: JSON.stringify({
          student_id: studentId,
          action_type: "resume",
          effective_date: new Date().toISOString().slice(0, 10),
          reason: "Cho học tiếp từ cửa sổ Quản lý Bảo lưu",
          school_id: schoolId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Học sinh ${studentName} đã trở lại học tiếp!`, "success");
        loadLogs(filterMonth);
        onRefreshData?.();
      } else {
        showToast(data.message || "Không thể chuyển trạng thái!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all" && log.action_type !== filterAction) return false;
    return true;
  });

  const reserveLogCount = logs.filter((l) => l.action_type === "reserve").length;
  const dropLogCount = logs.filter((l) => l.action_type === "drop").length;
  const resumeLogCount = logs.filter((l) => l.action_type === "resume").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Nhật Ký & Thống Kê Biến Động Học Sinh</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Theo dõi chi tiết học sinh đang bảo lưu, nghỉ học và lịch sử thay đổi trạng thái
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Cards: Hiển thị song song số lượng đang bảo lưu thực tế và số lượt chuyển */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Thẻ 1: Học sinh đang bảo lưu */}
            <div
              onClick={() => setActiveTab("current_reserved")}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "current_reserved"
                  ? "bg-amber-100/80 border-amber-400 ring-2 ring-amber-500/30 dark:bg-amber-950/60 dark:border-amber-700"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/40 hover:border-amber-300"
              }`}
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  Đang Bảo Lưu Hiện Tại
                </span>
                <span className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-0.5 block">
                  {summaryData.active_reserved_count} học sinh
                </span>
                <span className="text-[10px] text-amber-700/80 font-bold">
                  ({reserveLogCount} lượt chuyển trong kỳ)
                </span>
              </div>
              <PauseCircle className="w-7 h-7 text-amber-500 opacity-90" />
            </div>

            {/* Thẻ 2: Học sinh đã nghỉ học */}
            <div
              onClick={() => setActiveTab("current_dropped")}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "current_dropped"
                  ? "bg-rose-100/80 border-rose-400 ring-2 ring-rose-500/30 dark:bg-rose-950/60 dark:border-rose-700"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300"
              }`}
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                  Đã Nghỉ Học
                </span>
                <span className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-0.5 block">
                  {summaryData.active_dropped_count} học sinh
                </span>
                <span className="text-[10px] text-rose-700/80 font-bold">
                  ({dropLogCount} lượt chuyển trong kỳ)
                </span>
              </div>
              <UserX className="w-7 h-7 text-rose-500 opacity-90" />
            </div>

            {/* Thẻ 3: Trở lại học tiếp */}
            <div
              onClick={() => setActiveTab("logs")}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                activeTab === "logs"
                  ? "bg-emerald-100/80 border-emerald-400 ring-2 ring-emerald-500/30 dark:bg-emerald-950/60 dark:border-emerald-700"
                  : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/40 hover:border-emerald-300"
              }`}
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Trở Lại Học Tiếp
                </span>
                <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 block">
                  {resumeLogCount} học sinh
                </span>
                <span className="text-[10px] text-emerald-700/80 font-bold">
                  (Xem toàn bộ lịch sử log)
                </span>
              </div>
              <UserCheck className="w-7 h-7 text-emerald-500 opacity-90" />
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === "logs"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              📜 Toàn Bộ Nhật Ký Biến Động ({logs.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("current_reserved")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === "current_reserved"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>Danh Sách Đang Bảo Lưu ({summaryData.active_reserved_count})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("current_dropped")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                activeTab === "current_dropped"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Danh Sách Nghỉ Học ({summaryData.active_dropped_count})</span>
            </button>
          </div>

          {/* Filter row for Logs */}
          {activeTab === "logs" && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Lọc thao tác:
                </span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setFilterAction("all")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterAction === "all" ? "bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Tất cả ({logs.length})
                  </button>
                  <button
                    onClick={() => setFilterAction("reserve")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterAction === "reserve" ? "bg-amber-500 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Bảo lưu
                  </button>
                  <button
                    onClick={() => setFilterAction("drop")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterAction === "drop" ? "bg-rose-500 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Nghỉ học
                  </button>
                  <button
                    onClick={() => setFilterAction("resume")}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      filterAction === "resume" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Học tiếp
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Tháng:</span>
                <input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => {
                    setFilterMonth(e.target.value);
                    loadLogs(e.target.value);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none"
                />
                <button
                  onClick={() => {
                    setFilterMonth("");
                    loadLogs("");
                  }}
                  className="text-xs font-bold text-indigo-600 hover:underline px-1"
                >
                  Xem tất cả các tháng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading && (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              Đang tải dữ liệu...
            </div>
          )}

          {!isLoading && activeTab === "current_reserved" && (
            summaryData.active_reserved.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Hiện tại cơ sở không có học sinh nào đang ở trạng thái Bảo Lưu.
              </div>
            ) : (
              <div className="space-y-3">
                {summaryData.active_reserved.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {st.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500">({st.phone})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Đang bảo lưu
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        {st.status_date && (
                          <span>
                            Bắt đầu từ: <strong className="text-slate-700 dark:text-slate-300">{st.status_date}</strong>
                          </span>
                        )}
                        {st.expected_return_date && (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">
                            Dự kiến học lại: {st.expected_return_date}
                          </span>
                        )}
                        {st.status_note && (
                          <span className="italic text-slate-500">&ldquo;{st.status_note}&rdquo;</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResumeStudent(st.id, st.name)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Cho Học Lại Ngay</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {!isLoading && activeTab === "current_dropped" && (
            summaryData.active_dropped.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Hiện tại cơ sở không có học sinh nào ở trạng thái Nghỉ Học.
              </div>
            ) : (
              <div className="space-y-3">
                {summaryData.active_dropped.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {st.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500">({st.phone})</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          Đã nghỉ học
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        {st.status_date && (
                          <span>
                            Nghỉ từ ngày: <strong className="text-slate-700 dark:text-slate-300">{st.status_date}</strong>
                          </span>
                        )}
                        {st.status_note && (
                          <span className="italic text-slate-500">&ldquo;{st.status_note}&rdquo;</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResumeStudent(st.id, st.name)}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Kích Hoạt Học Lại</span>
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {!isLoading && activeTab === "logs" && (
            filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Chưa có lịch sử bảo lưu, nghỉ học hay trở lại học nào trong thời gian này.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  let badgeBg = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200";
                  let actionLabel = "Bảo Lưu";
                  if (log.action_type === "drop") {
                    badgeBg = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200";
                    actionLabel = "Nghỉ Học";
                  } else if (log.action_type === "resume") {
                    badgeBg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200";
                    actionLabel = "Trở Lại Học Tiếp";
                  }

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`px-2.5 py-1 text-[11px] font-black uppercase rounded-xl border shrink-0 ${badgeBg}`}>
                          {actionLabel}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {log.student_name}
                            </span>
                            <span className="font-mono text-xs text-slate-500">({log.student_phone})</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                            <span>
                              Ngày áp dụng: <strong className="text-slate-700 dark:text-slate-200">{log.effective_date}</strong>
                            </span>
                            {log.return_date && (
                              <span className="text-amber-700 dark:text-amber-400 font-bold">
                                Dự kiến học lại: <strong>{log.return_date}</strong>
                              </span>
                            )}
                            {log.reason && (
                              <span className="italic text-slate-500">
                                &ldquo;{log.reason}&rdquo;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-1 sm:justify-end">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.logged_at}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Kỳ tháng {log.month}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
