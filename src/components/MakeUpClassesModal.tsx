"use client";

import React, { useState, useEffect } from "react";
import { Student, MakeUpClass, TimeSlot } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  ArrowRight,
  Users,
  Lock,
  X,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Phone,
} from "lucide-react";

interface SlotOccupancyInfo {
  slot_id: string;
  slot_name: string;
  days: string;
  start_time: string;
  end_time: string;
  time_range: string;
  regular_count: number;
  makeup_count: number;
  total_count: number;
  max_capacity: number;
  occupancy_rate: number;
  is_crowded: boolean;
  is_full: boolean;
  is_day_supported: boolean;
}

interface MakeUpClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  timeSlots: TimeSlot[];
  initialStudentId?: string;
  onRefresh: () => void;
}

export const MakeUpClassesModal: React.FC<MakeUpClassesModalProps> = ({
  isOpen,
  onClose,
  students,
  timeSlots,
  initialStudentId,
  onRefresh,
}) => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"list" | "report">("list");
  const [makeups, setMakeups] = useState<MakeUpClass[]>([]);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>(initialStudentId || "all");

  // Report absence form state
  const [reportStudentId, setReportStudentId] = useState<string>(initialStudentId || (students[0]?.id ?? ""));
  const [absenceDate, setAbsenceDate] = useState<string>("");
  const [absenceReason, setAbsenceReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scheduling makeup state
  const [schedulingItem, setSchedulingItem] = useState<MakeUpClass | null>(null);
  const [makeupDate, setMakeupDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [makeupTime, setMakeupTime] = useState<string>("");
  const [makeupNote, setMakeupNote] = useState<string>("");

  // Custom Delete Confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Day occupancy query state
  const [dayOccupancy, setDayOccupancy] = useState<SlotOccupancyInfo[]>([]);
  const [isLoadingOccupancy, setIsLoadingOccupancy] = useState(false);
  const [dayNameVi, setDayNameVi] = useState("");
  const [thresholdPercent, setThresholdPercent] = useState(80);

  const loadMakeups = async () => {
    try {
      const url =
        selectedStudentFilter === "all"
          ? "/api/makeups"
          : `/api/makeups?student_id=${selectedStudentFilter}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setMakeups(json.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialStudentId) {
        setSelectedStudentFilter(initialStudentId);
        setReportStudentId(initialStudentId);
      }
      loadMakeups();
    }
  }, [isOpen, selectedStudentFilter, initialStudentId]);

  useEffect(() => {
    if (!makeupDate) {
      setDayOccupancy([]);
      setSelectedSlotId("");
      return;
    }

    const fetchOccupancy = async () => {
      try {
        setIsLoadingOccupancy(true);
        const res = await fetch(`/api/classes/occupancy?date=${makeupDate}`);
        const json = await res.json();
        if (json.success) {
          const supportedSlots = (json.data.slots as SlotOccupancyInfo[]).filter((s) => s.is_day_supported);
          setDayOccupancy(supportedSlots);
          setDayNameVi(json.data.day_name || "");
          setThresholdPercent(json.data.threshold_percent || 80);

          const firstAvailable = supportedSlots.find((s) => !s.is_full);
          if (firstAvailable) {
            setSelectedSlotId(firstAvailable.slot_id);
            setMakeupTime(firstAvailable.time_range);
          } else {
            setSelectedSlotId("");
            setMakeupTime("");
          }
        }
      } catch (err) {
        console.error("Failed to load occupancy:", err);
      } finally {
        setIsLoadingOccupancy(false);
      }
    };

    fetchOccupancy();
  }, [makeupDate]);

  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportStudentId) {
      showToast("Vui lòng chọn học sinh!", "error");
      return;
    }
    if (!absenceDate) {
      showToast("Vui lòng chọn ngày báo nghỉ!", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_absence",
          student_id: reportStudentId,
          absence_date: absenceDate,
          absence_reason: absenceReason.trim() || "Báo nghỉ có phép",
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setAbsenceDate("");
        setAbsenceReason("");
        setActiveTab("list");
        loadMakeups();
        onRefresh();
      } else {
        showToast(json.message || "Báo nghỉ thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedulingItem || !makeupDate) {
      showToast("Vui lòng chọn ngày học bù!", "error");
      return;
    }

    const selectedSlot = dayOccupancy.find((s) => s.slot_id === selectedSlotId);
    if (selectedSlot?.is_full) {
      showToast("Khung giờ này đã hết suất! Vui lòng chọn khung giờ khác.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule_makeup",
          makeup_id: schedulingItem.id,
          makeup_date: makeupDate,
          makeup_time: makeupTime || selectedSlot?.time_range || "18:00 - 19:00",
          makeup_slot_id: selectedSlotId || null,
          note: makeupNote.trim(),
        }),
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setSchedulingItem(null);
        setMakeupDate("");
        setSelectedSlotId("");
        setMakeupNote("");
        loadMakeups();
        onRefresh();
      } else {
        showToast(json.message || "Lỗi xếp lịch!", "error");
      }
    } catch {
      showToast("Lỗi kết nối tới máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMakeup = async (id: string) => {
    try {
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", makeup_id: id }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        loadMakeups();
        onRefresh();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      const res = await fetch("/api/makeups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", makeup_id: deleteConfirmId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, "success");
        setDeleteConfirmId(null);
        loadMakeups();
        onRefresh();
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Quản Lý Báo Nghỉ & Đăng Ký Học Bù
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tự động kiểm tra sĩ số lớp đông (&ge;{thresholdPercent}%) và khóa lịch khi kín chỗ
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

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-2.5 gap-2">
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "list"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Danh Sách Buổi Bù ({makeups.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === "report"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Báo Nghỉ Một Buổi</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: LIST MAKEUPS */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Học sinh:</span>
                  <select
                    value={selectedStudentFilter}
                    onChange={(e) => setSelectedStudentFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
                  >
                    <option value="all">Tất cả học sinh ({students.length})</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Chờ xếp lịch bù:{" "}
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    {makeups.filter((m) => m.status === "pending").length} buổi
                  </span>
                </div>
              </div>

              {/* Makeups List */}
              <div className="space-y-3">
                {makeups.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {item.student_name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">({item.student_phone})</span>

                        {item.status === "pending" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Chờ xếp lịch bù (+1 buổi)
                          </span>
                        )}
                        {item.status === "scheduled" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Đã xếp lịch bù
                          </span>
                        )}
                        {item.status === "completed" && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Đã học bù xong
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <span className="text-rose-500 font-bold">Nghỉ ngày: {item.absence_date}</span>
                        {item.absence_reason && (
                          <span className="text-slate-400 italic">(&ldquo;{item.absence_reason}&rdquo;)</span>
                        )}
                      </div>

                      {item.makeup_date && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5 pt-0.5">
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>
                            Lịch học bù: <strong>{item.makeup_date}</strong> (Giờ: {item.makeup_time})
                          </span>
                          {item.note && <span className="text-slate-400 italic font-normal"> - {item.note}</span>}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status === "pending" && (
                        <button
                          onClick={() => {
                            setSchedulingItem(item);
                            setMakeupDate("");
                            setSelectedSlotId("");
                            setMakeupNote("");
                          }}
                          className="px-3.5 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Xếp lịch bù</span>
                        </button>
                      )}

                      {item.status === "scheduled" && (
                        <>
                          <button
                            onClick={() => {
                              setSchedulingItem(item);
                              setMakeupDate(item.makeup_date || "");
                              setMakeupTime(item.makeup_time || "");
                              setSelectedSlotId(item.makeup_slot_id || "");
                              setMakeupNote(item.note || "");
                            }}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 rounded-xl transition"
                          >
                            Đổi lịch
                          </button>
                          <button
                            onClick={() => handleCompleteMakeup(item.id)}
                            className="px-3 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Đã học</span>
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                        title="Xóa lượt báo nghỉ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {makeups.length === 0 && (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    Hiện chưa có buổi báo nghỉ hay học bù nào. Bấm <strong>&quot;+ Báo Nghỉ Một Buổi&quot;</strong> để tạo mới.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REPORT ABSENCE FORM */}
          {activeTab === "report" && (
            <form onSubmit={handleReportAbsence} className="max-w-lg mx-auto p-6 bg-slate-50/70 dark:bg-slate-800/40 rounded-3xl border border-slate-200/80 dark:border-slate-800 space-y-4.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Ghi Nhận Học Sinh Báo Nghỉ
              </h3>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  Chọn học sinh báo nghỉ <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={reportStudentId}
                  onChange={(e) => setReportStudentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.phone}) - {s.registered_days} ({s.study_time_detail})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  Ngày học sinh nghỉ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={absenceDate}
                  onChange={(e) => setAbsenceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1.5">
                  Lý do xin nghỉ
                </label>
                <input
                  type="text"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  placeholder="Nhập lý do xin nghỉ học..."
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 font-medium">
                ⭐ Học sinh sẽ được tự động cộng <strong>+1 buổi học bù</strong>. Có thể xếp bù vào bất kỳ ngày nào trong tuần, tuần sau hoặc sang tháng sau tùy ý.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
                >
                  {isSubmitting ? "Đang ghi nhận..." : "Xác nhận báo nghỉ"}
                </button>
              </div>
            </form>
          )}

          {/* POPUP MODAL: XẾP LỊCH HỌC BÙ VỚI KIỂM TRA SĨ SỐ LỚP ĐÔNG & KHÓA KHI HẾT CHỖ */}
          {schedulingItem && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Xếp Lịch Học Bù: {schedulingItem.student_name}
                  </h4>
                  <button
                    onClick={() => setSchedulingItem(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl">
                  Buổi nghỉ: <strong className="text-rose-500 font-bold">{schedulingItem.absence_date}</strong>
                  {schedulingItem.absence_reason ? ` (${schedulingItem.absence_reason})` : ""}
                </div>

                <form onSubmit={handleScheduleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      1. Chọn ngày học bù <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={makeupDate}
                      onChange={(e) => setMakeupDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* 2. Choose Time Slot with Occupancy & Crowded / Full warning */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                        2. Chọn Khung Giờ ({dayNameVi || "Vui lòng chọn ngày trước"})
                      </label>
                      {isLoadingOccupancy && (
                        <span className="text-[10px] text-indigo-600 animate-pulse font-bold">
                          Đang kiểm tra sĩ số...
                        </span>
                      )}
                    </div>

                    {!makeupDate ? (
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                        Vui lòng chọn ngày học bù ở bước 1 để xem các khung giờ và sĩ số
                      </div>
                    ) : dayOccupancy.length === 0 ? (
                      <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-center text-xs text-amber-800 dark:text-amber-300 font-medium">
                        Ngày <strong>{dayNameVi} ({makeupDate})</strong> cơ sở không có ca mở cửa nào phù hợp. Vui lòng chọn ngày khác!
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {dayOccupancy.map((slot) => {
                          const isSelected = selectedSlotId === slot.slot_id;
                          return (
                            <div
                              key={slot.slot_id}
                              onClick={() => {
                                if (!slot.is_full) {
                                  setSelectedSlotId(slot.slot_id);
                                  setMakeupTime(slot.time_range);
                                }
                              }}
                              className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                slot.is_full
                                  ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-60 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 shadow-2xs"
                                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-600"
                                      : "border-slate-300 dark:border-slate-600"
                                  }`}
                                >
                                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>

                                <div>
                                  <div className="font-bold text-xs text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span>{slot.slot_name}</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                      ({slot.time_range})
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Sĩ số:{" "}
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                      {slot.total_count}/{slot.max_capacity} học sinh
                                    </span>{" "}
                                    ({slot.occupancy_rate}%)
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-right">
                                {slot.is_full ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    <Lock className="w-3 h-3" /> Hết suất ({slot.total_count}/{slot.max_capacity})
                                  </span>
                                ) : slot.is_crowded ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    <AlertTriangle className="w-3 h-3" /> Lớp đông ({slot.total_count}/{slot.max_capacity})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    Còn {Math.max(0, slot.max_capacity - slot.total_count)} chỗ ({slot.total_count}/{slot.max_capacity})
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      Giờ học bù cụ thể
                    </label>
                    <input
                      type="text"
                      value={makeupTime}
                      onChange={(e) => setMakeupTime(e.target.value)}
                      placeholder="18:00 - 19:00"
                      className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                      Ghi chú thêm (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={makeupNote}
                      onChange={(e) => setMakeupNote(e.target.value)}
                      placeholder="Ghi chú thêm nếu cần..."
                      className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSchedulingItem(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !makeupDate || !selectedSlotId}
                      className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
                    >
                      {isSubmitting ? "Đang lưu..." : "Xác Nhận Lịch Học Bù"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirm Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Xác nhận xóa bản ghi?
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Bạn có chắc chắn muốn xóa lượt báo nghỉ / học bù này?
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition disabled:opacity-50"
                  >
                    {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
