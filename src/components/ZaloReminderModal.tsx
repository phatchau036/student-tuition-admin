"use client";

import React, { useState } from "react";
import { Student } from "@/lib/types";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { MessageSquare, Copy, ExternalLink, X, Check, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/components/Toast";

interface ZaloReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  selectedMonth: string;
}

export const ZaloReminderModal: React.FC<ZaloReminderModalProps> = ({
  isOpen,
  onClose,
  student,
  selectedMonth,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !student) return null;

  const rawPhone = student.phone ? student.phone.replace(/\D/g, "") : "";
  const zaloChatUrl = `https://zalo.me/${rawPhone}`;
  const amountStr = formatVND(student.current_tuition);
  const monthDisplay = formatMonthDisplay(selectedMonth);

  // Mẫu tin nhắn nhắc học phí chuẩn mực, lịch sự và chuyên nghiệp
  const messageTemplate = `Kính gửi Quý phụ huynh học sinh ${student.name},
Trung tâm xin thông báo về kỳ đóng học phí ${monthDisplay}:
- Học sinh: ${student.name} (${student.level_name || "Lớp học"})
- Gói áp dụng: ${student.tuition_package_name || "Gói học phí chuẩn"}
- Học phí cần thanh toán: ${amountStr}

Quý phụ huynh vui lòng hoàn tất học phí để trung tâm duy trì lịch học ổn định cho bé. Nếu quý phụ huynh đã thanh toán, xin vui lòng bỏ qua thông báo này.
Trung tâm xin trân trọng cảm ơn!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageTemplate);
    setCopied(true);
    showToast("Đã sao chép tin nhắn nhắc học phí vào clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-blue-50/60 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Nhắc Học Phí Qua Zalo</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                  Thủ công
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi tin nhắn mẫu đã soạn sẵn đến Zalo phụ huynh {student.name}
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Student summary banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Học sinh</span>
              <span className="font-black text-slate-900 dark:text-white text-sm">{student.name}</span>
              <span className="text-slate-500 block font-mono mt-0.5">{student.phone}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 font-semibold block text-[10px] uppercase">Công nợ tháng</span>
              <span className="font-black text-rose-600 dark:text-rose-400 text-base">{amountStr}</span>
              <span className="inline-block mt-0.5 px-2 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Cần đóng tiền
              </span>
            </div>
          </div>

          {/* Message Template textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Nội dung tin nhắn mẫu:
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Đã copy!" : "Copy nội dung"}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={6}
              value={messageTemplate}
              className="w-full p-3.5 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none resize-none leading-relaxed focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Bấm <strong>&quot;Copy & Mở Zalo&quot;</strong> để hệ thống tự động copy nội dung vào clipboard và mở ngay phòng chat Zalo với phụ huynh số <strong>{student.phone}</strong>.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Đã copy" : "Copy tin nhắn"}</span>
            </button>

            <a
              href={zaloChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCopy}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/25 transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mở Zalo Ngay</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
