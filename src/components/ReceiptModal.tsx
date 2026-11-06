"use client";

import React, { useRef, useState, useEffect } from "react";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { Student, StudentMonthlyTuition, StudentPayment, MonthFormat } from "@/lib/types";
import { X, Download, CheckCircle2, Building2, MapPin, Phone } from "lucide-react";
import html2canvas from "html2canvas";
import { useToast } from "@/components/Toast";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  paymentRecord: StudentPayment | null;
  monthFormat?: MonthFormat;
  centerInfo?: {
    name: string;
    address: string;
    phone: string;
  };
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  student,
  paymentRecord,
  monthFormat = "vietnamese",
  centerInfo = {
    name: "Trung Tâm Âm Nhạc TpTeam",
    address: "123 Đường Điện Biên Phủ, TP.HCM",
    phone: "0909.123.456",
  },
}) => {
  const { showToast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setCurrentDateStr(
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")} - ${String(
          now.getDate()
        ).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
      );
    }
  }, [isOpen]);

  if (!isOpen || !student || !paymentRecord) return null;

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    try {
      setIsDownloading(true);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const image = canvas.toDataURL("image/jpeg", 1.0);
      const link = document.createElement("a");
      link.href = image;
      const safeName = student.name.replace(/\s+/g, "_");
      link.download = `BienLai_${safeName}_${paymentRecord.start_period}.jpg`;
      link.click();
      showToast("Đã tải ảnh biên lai thành công!", "success");
    } catch (err) {
      console.error("Lỗi khi tạo ảnh biên lai:", err);
      showToast("Lỗi khi tạo ảnh biên lai!", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  const periodDesc =
    paymentRecord.start_period === paymentRecord.end_period
      ? `Tháng ${formatMonthDisplay(paymentRecord.start_period, monthFormat)}`
      : `${formatMonthDisplay(paymentRecord.start_period, monthFormat)} đến ${formatMonthDisplay(
          paymentRecord.end_period,
          monthFormat
        )}`;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-[420px] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Actions */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Biên Lai Điện Tử
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-950 flex justify-center">
          
          {/* THE RECEIPT ELEMENT TO CAPTURE */}
          <div
            ref={receiptRef}
            className="bg-white text-slate-800 w-[360px] p-6 rounded-xl shadow-lg relative overflow-hidden font-sans border-t-[8px] border-indigo-600"
          >
            {/* Watermark/Background decoration */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-indigo-50 rounded-full opacity-50 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
              <CheckCircle2 className="w-48 h-48" />
            </div>

            {/* Center Info */}
            <div className="text-center mb-6">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
              <h2 className="text-[17px] font-black tracking-tight text-indigo-900">{centerInfo.name}</h2>
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mt-1">
                <MapPin className="w-3 h-3" />
                <span>{centerInfo.address}</span>
              </div>
              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 mt-0.5">
                <Phone className="w-3 h-3" />
                <span>Hotline: {centerInfo.phone}</span>
              </div>
            </div>

            {/* Success Icon */}
            <div className="flex flex-col items-center justify-center mb-5 border-b border-dashed border-slate-300 pb-5">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Thanh toán thành công</div>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{formatVND(paymentRecord.amount)}</div>
              {paymentRecord.receipt_number && (
                <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded-full text-[10px] font-mono text-slate-600 font-bold border border-slate-200">
                  Số BL giấy: {paymentRecord.receipt_number}
                </div>
              )}
            </div>

            {/* Details Table */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-slate-500 font-medium">Học sinh:</span>
                <span className="text-[12px] font-black text-slate-900 text-right uppercase">{student.name}</span>
              </div>
              
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-slate-500 font-medium">Lớp / Bộ môn:</span>
                <span className="text-[12px] font-bold text-slate-900 text-right">{student.class_name || student.level_name || "Lớp học"}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-[11px] text-slate-500 font-medium">Gói áp dụng:</span>
                <span className="text-[12px] font-bold text-slate-900 text-right">{paymentRecord.package_name || "Gói chuẩn"}</span>
              </div>

              <div className="flex justify-between items-start">
                <span className="text-[11px] text-slate-500 font-medium">Kỳ đóng phí:</span>
                <span className="text-[12px] font-bold text-slate-900 text-right">{periodDesc}</span>
              </div>

              {paymentRecord.note && (
                <div className="flex justify-between items-start">
                  <span className="text-[11px] text-slate-500 font-medium">Nội dung:</span>
                  <span className="text-[12px] font-medium text-slate-800 text-right max-w-[180px] break-words">
                    {paymentRecord.note}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between items-start">
                <span className="text-[11px] text-slate-500 font-medium">Ngày thanh toán:</span>
                <span className="text-[11px] font-mono font-bold text-slate-900 text-right">{paymentRecord.paid_date}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-slate-300 pt-4 mt-2">
              <div className="flex justify-between items-end">
                <div className="text-[9px] text-slate-400 font-mono">
                  Mã GD: {paymentRecord.id.replace("pay-", "").slice(0, 10).toUpperCase()}
                </div>
                <div className="text-[9px] text-slate-400 italic">
                  In lúc: {currentDateStr}
                </div>
              </div>
            </div>
            
            {/* Absolute bottom decoration */}
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-80" />
          </div>
        </div>

        {/* Action Bottom */}
        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-center">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md shadow-indigo-600/25 transition disabled:opacity-70"
          >
            <Download className="w-4 h-4" />
            {isDownloading ? "Đang tạo ảnh..." : "Lưu Ảnh Biên Lai"}
          </button>
        </div>

      </div>
    </div>
  );
};
