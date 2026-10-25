"use client";

import React, { useState, useEffect } from "react";
import { StudentStatusLog } from "@/lib/types";
import { formatMonthDisplay } from "@/lib/tuition";
import { History, Calendar, Clock, Filter, X, ArrowRight, UserCheck, PauseCircle, UserX, AlertCircle } from "lucide-react";

interface StatusLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
}

export const StatusLogModal: React.FC<StatusLogModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
}) => {
  const [logs, setLogs] = useState<StudentStatusLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(selectedMonth);

  const loadLogs = async (m: string) => {
    try {
      setIsLoading(true);
      const url = m ? `/api/status-logs?month=${m}` : "/api/status-logs";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
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
  }, [isOpen, selectedMonth]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "all" && log.action_type !== filterAction) return false;
    return true;
  });

  const reserveCount = logs.filter((l) => l.action_type === "reserve").length;
  const dropCount = logs.filter((l) => l.action_type === "drop").length;
  const resumeCount = logs.filter((l) => l.action_type === "resume").length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Nhật Ký & Thống Kê Biến Động Học Sinh</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thống kê chi tiết học sinh bảo lưu, nghỉ học và trở lại học theo tháng và giờ
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

        {/* Filters and KPI summary */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                  Bảo Lưu
                </span>
                <span className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-0.5 block">
                  {reserveCount} học sinh
                </span>
              </div>
              <PauseCircle className="w-7 h-7 text-amber-500 opacity-80" />
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                  Nghỉ Học
                </span>
                <span className="text-2xl font-black text-rose-900 dark:text-rose-200 mt-0.5 block">
                  {dropCount} học sinh
                </span>
              </div>
              <UserX className="w-7 h-7 text-rose-500 opacity-80" />
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                  Trở Lại Học Tiếp
                </span>
                <span className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5 block">
                  {resumeCount} học sinh
                </span>
              </div>
              <UserCheck className="w-7 h-7 text-emerald-500 opacity-80" />
            </div>
          </div>

          {/* Filter row */}
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
        </div>

        {/* Log table list */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-semibold">
              Đang tải lịch sử biến động...
            </div>
          ) : filteredLogs.length === 0 ? (
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/70 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
