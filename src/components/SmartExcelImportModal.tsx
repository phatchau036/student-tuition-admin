"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Subject, LevelSurcharge, Teacher } from "@/lib/types";
import { useToast } from "@/components/Toast";
import {
  FileSpreadsheet,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  HelpCircle,
  Layers,
  BookOpen,
  Eye,
  RefreshCw,
  GraduationCap,
} from "lucide-react";

interface SmartExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  subjects: Subject[];
  levels: LevelSurcharge[];
  teachers?: Teacher[];
  schoolId?: string;
}

interface ColumnMapping {
  name: string; // Tên cột trong file Excel
  phone: string;
  level: string;
  subject: string;
  teacher: string;
  startDate: string;
  studyTime: string;
  note: string;
}

export const SmartExcelImportModal: React.FC<SmartExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  subjects,
  levels,
  teachers = [],
  schoolId,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "mapping" | "preview">("upload");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [columns, setColumns] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Mapping state
  const [mapping, setMapping] = useState<ColumnMapping>({
    name: "",
    phone: "",
    level: "",
    subject: "",
    teacher: "",
    startDate: "",
    studyTime: "",
    note: "",
  });

  const [defaultSubjectId, setDefaultSubjectId] = useState<string>("");
  const [defaultLevelId, setDefaultLevelId] = useState<string>(levels[0]?.id || "");
  const [defaultTeacherId, setDefaultTeacherId] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  // 1. Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        setWorkbook(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0] || "";
        setSelectedSheet(firstSheet);
        parseSheet(wb, firstSheet);
      } catch (err) {
        showToast("Không thể đọc file Excel! Vui lòng kiểm tra định dạng .xlsx hoặc .xls", "error");
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. Parse sheet and auto-guess columns
  const parseSheet = (wb: XLSX.WorkBook, sName: string) => {
    const ws = wb.Sheets[sName];
    if (!ws) return;

    // Convert sheet to json with headers
    const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (data.length === 0) {
      showToast("Sheet này không có dữ liệu!", "error");
      return;
    }

    // Find header row (the first row with at least 2 non-empty strings)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const nonEmpties = data[i].filter((cell) => String(cell).trim() !== "");
      if (nonEmpties.length >= 2) {
        headerRowIdx = i;
        break;
      }
    }

    const headerCols = (data[headerRowIdx] || []).map((h, i) =>
      String(h).trim() ? String(h).trim() : `Cột ${i + 1}`
    );
    setColumns(headerCols);

    // Rows below header
    const rows = data.slice(headerRowIdx + 1).filter((r) => r.some((c) => String(c).trim() !== ""));
    setRawRows(rows);

    // AUTO GUESS COLUMNS (Cực kỳ thông minh dựa trên từ khóa phổ biến)
    const newMap: ColumnMapping = {
      name: "",
      phone: "",
      level: "",
      subject: "",
      teacher: "",
      startDate: "",
      studyTime: "",
      note: "",
    };

    headerCols.forEach((col) => {
      const lower = col.toLowerCase();
      if (!newMap.name && (lower.includes("họ và tên") || lower.includes("họ tên") || lower.includes("tên học") || lower === "tên")) {
        newMap.name = col;
      }
      if (!newMap.phone && (lower.includes("sđt") || lower.includes("điện thoại") || lower.includes("phone") || lower.includes("số đt"))) {
        newMap.phone = col;
      }
      if (!newMap.level && (lower.includes("lớp") || lower.includes("level") || lower.includes("trình độ") || lower.includes("grade"))) {
        newMap.level = col;
      }
      if (!newMap.subject && (lower.includes("môn") || lower.includes("nhạc cụ") || lower.includes("khóa học"))) {
        newMap.subject = col;
      }
      if (!newMap.teacher && (lower.includes("giáo viên") || lower.includes("thầy") || lower.includes("cô") || lower.includes("teacher") || lower.includes("gv"))) {
        newMap.teacher = col;
      }
      if (!newMap.startDate && (lower.includes("ngày bắt đầu") || lower.includes("bắt đầu") || lower.includes("ngày vào") || lower.includes("ngày học"))) {
        newMap.startDate = col;
      }
      if (!newMap.studyTime && (lower.includes("giờ vào") || lower.includes("thời gian") || lower.includes("ca học") || lower.includes("giờ học"))) {
        newMap.studyTime = col;
      }
      if (!newMap.note && (lower.includes("ghi chú") || lower.includes("chú thích") || lower.includes("note"))) {
        newMap.note = col;
      }
    });

    setMapping(newMap);
    setStep("mapping");
  };

  // 3. Switch sheet in multi-sheet workbook
  const handleSheetChange = (sName: string) => {
    setSelectedSheet(sName);
    if (workbook) {
      parseSheet(workbook, sName);
    }
  };

  // 4. Generate mapped preview rows
  const mappedPreviewStudents = rawRows.slice(0, 5).map((row) => {
    const getVal = (colName: string) => {
      const idx = columns.indexOf(colName);
      return idx >= 0 ? String(row[idx] || "").trim() : "";
    };

    return {
      name: getVal(mapping.name),
      phone: getVal(mapping.phone),
      level_name: getVal(mapping.level),
      subject_name: getVal(mapping.subject),
      teacher_name: getVal(mapping.teacher),
      start_date: getVal(mapping.startDate),
      study_time_detail: getVal(mapping.studyTime),
      note: getVal(mapping.note),
    };
  });

  // 5. Submit Import
  const handleExecuteImport = async () => {
    if (!mapping.name) {
      showToast("Vui lòng chọn cột tương ứng với Họ và tên học sinh!", "error");
      return;
    }

    try {
      setIsImporting(true);

      const allMappedStudents = rawRows.map((row) => {
        const getVal = (colName: string) => {
          const idx = columns.indexOf(colName);
          return idx >= 0 ? String(row[idx] || "").trim() : "";
        };

        return {
          name: getVal(mapping.name),
          phone: getVal(mapping.phone),
          level_name: getVal(mapping.level),
          subject_name: getVal(mapping.subject),
          teacher_name: getVal(mapping.teacher),
          start_date: getVal(mapping.startDate),
          study_time_detail: getVal(mapping.studyTime),
          note: getVal(mapping.note),
        };
      }).filter((s) => s.name.trim() !== "");

      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (schoolId) headers["x-school-id"] = schoolId;

      const res = await fetch("/api/students/import", {
        method: "POST",
        headers,
        body: JSON.stringify({
          students: allMappedStudents,
          default_subject_id: defaultSubjectId || undefined,
          default_level_id: defaultLevelId || undefined,
          default_teacher_id: defaultTeacherId || undefined,
          school_id: schoolId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        onSuccess();
        onClose();
      } else {
        showToast(data.message || "Nhập dữ liệu thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ khi nhập dữ liệu!", "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Nhập Học Viên Từ File Excel</span>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Ghép Cột Thông Minh
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Không cần sửa file cũ. Hệ thống tự động nhận diện cột và chuyển đổi dữ liệu
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: UPLOAD FILE */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-3xl p-8 sm:p-12 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/20 transition group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition shadow-sm">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Kéo thả file Excel vào đây, hoặc <span className="text-emerald-600 underline">bấm để chọn file</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                  Hỗ trợ định dạng .xlsx, .xls hoặc .csv của bất kỳ trung tâm nào (kể cả file có nhiều sheet như Piano, Guitar, Organ...)
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Bạn không cần chỉnh sửa lại file Excel cũ của trung tâm:
                </p>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                  Cứ để nguyên file hiện tại tải lên. Bước tiếp theo hệ thống sẽ cho bạn chọn cột tương ứng chỉ với vài cú nhấp chuột.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: MAPPING COLUMNS */}
          {step === "mapping" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Sheet selector if multiple sheets */}
              {sheetNames.length > 1 && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      File có nhiều Sheet. Chọn Sheet muốn nhập:
                    </span>
                    <span className="text-[11px] text-slate-400">Tìm thấy {sheetNames.length} sheet trong file</span>
                  </div>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-3 py-1.5 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 outline-none"
                  >
                    {sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ghép Cột Excel Vào Hệ Thống
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Hệ thống đã tự động đoán các cột khớp nhất. Bạn có thể kiểm tra và đổi lại nếu muốn:
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {rawRows.length} học viên
                </span>
              </div>

              {/* Mapping Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                {/* 1. Họ và tên */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Họ và tên học sinh <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn cột chứa Họ tên --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Số điện thoại */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Số điện thoại:
                  </label>
                  <select
                    value={mapping.phone}
                    onChange={(e) => setMapping({ ...mapping, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Bỏ qua / Tự sinh số liên lạc --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Level / Trình độ */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Level / Lớp học:
                  </label>
                  <select
                    value={mapping.level}
                    onChange={(e) => setMapping({ ...mapping, level: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Không có (Lấy mặc định) --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Bộ môn */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Môn học (hoặc chọn gán sẵn):
                  </label>
                  <select
                    value={mapping.subject}
                    onChange={(e) => setMapping({ ...mapping, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Không có trong cột (Gán sẵn bên dưới) --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Giáo viên phụ trách */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Giáo viên phụ trách:
                  </label>
                  <select
                    value={mapping.teacher}
                    onChange={(e) => setMapping({ ...mapping, teacher: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Tự động nhận diện hoặc Gán sẵn --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Ngày bắt đầu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Ngày bắt đầu học:
                  </label>
                  <select
                    value={mapping.startDate}
                    onChange={(e) => setMapping({ ...mapping, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 7. Giờ học / Ca học */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cột Khung giờ / Lịch học:
                  </label>
                  <select
                    value={mapping.studyTime}
                    onChange={(e) => setMapping({ ...mapping, studyTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Bỏ qua --</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Default Fallbacks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Môn học mặc định:
                  </label>
                  <select
                    value={defaultSubjectId}
                    onChange={(e) => setDefaultSubjectId(e.target.value)}
                    className="w-full px-3 py-1.5 font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Theo file Excel --</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Level mặc định:
                  </label>
                  <select
                    value={defaultLevelId}
                    onChange={(e) => setDefaultLevelId(e.target.value)}
                    className="w-full px-3 py-1.5 font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.level_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Giáo viên mặc định:
                  </label>
                  <select
                    value={defaultTeacherId}
                    onChange={(e) => setDefaultTeacherId(e.target.value)}
                    className="w-full px-3 py-1.5 font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Tự động theo file --</option>
                    {teachers.map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hướng dẫn định dạng "Giờ vào lớp" để tự động xếp lịch */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-850/60 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-950 dark:text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Hướng Dẫn Định Dạng Cột &quot;Giờ Vào Lớp&quot; Để Tự Động Xếp Lịch:</span>
                </div>
                <p className="text-[11.5px] leading-relaxed text-amber-900/90 dark:text-amber-300/90">
                  Hệ thống hỗ trợ tự động bóc tách ngày thứ, giờ học, thời lượng và giáo viên khi bạn ghi theo các mẫu sau trong file Excel:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">T2, T4 (18h-19h30)</span>
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">➔ Tự động xếp T2, T4 ca 18:00 - 19:30</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">T3, T5, T7 (19h-20h)</span>
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">➔ Tự động xếp T3, T5, T7 ca 19:00 - 20:00</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">T7 (9h30-11h), CN (9h30-11h)</span>
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">➔ Tự động xếp ca sáng cuối tuần 9:30</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/60">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">T2, T4 (18h-19h30) Cô Điệp</span>
                    <span className="block text-[10px] text-slate-500 font-sans mt-0.5">➔ Tự động gán Cô Điệp phụ trách</span>
                  </div>
                </div>
              </div>

              {/* Thông báo tính năng tự động khởi tạo Level & Bộ môn mới */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <span className="font-bold block">Tự động cấu hình danh mục mới vào Cài đặt:</span>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Bất kỳ <strong>Level / Lớp học</strong> nào (ví dụ: <em>Vỡ lòng, Grade 3, Grade 4...</em>) hoặc <strong>Bộ môn</strong> có trong file Excel mà hệ thống chưa có, sẽ được <strong>tự động tạo mới vào Cài đặt (Settings)</strong> ngay khi nhập. Bạn không cần phải tạo trước bằng tay!
                  </p>
                </div>
              </div>

              {/* Sample Preview Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-emerald-600" /> Xem trước 5 dòng đầu sau khi ghép:
                </span>
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                        <th className="p-2.5">Họ và tên</th>
                        <th className="p-2.5">Số điện thoại</th>
                        <th className="p-2.5">Level</th>
                        <th className="p-2.5">Lịch học</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {mappedPreviewStudents.map((st, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{st.name || "(Trống)"}</td>
                          <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{st.phone || "(Trống)"}</td>
                          <td className="p-2.5">{st.level_name || "(Mặc định)"}</td>
                          <td className="p-2.5 text-slate-500">{st.study_time_detail || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
          {step === "mapping" ? (
            <button
              type="button"
              onClick={() => setStep("upload")}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Chọn lại file khác
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Hủy bỏ
            </button>

            {step === "mapping" && (
              <button
                type="button"
                disabled={isImporting || !mapping.name}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang Nhập Dữ Liệu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Bắt Đầu Nhập ({rawRows.length} học viên)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
