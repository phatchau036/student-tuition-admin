"use client";

import React, { useState } from "react";
import { Student } from "@/lib/types";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";
import { MessageSquare, Copy, ExternalLink, X, Check, Send, AlertCircle, Bot, Sparkles } from "lucide-react";
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
  const [isSendingBot, setIsSendingBot] = useState(false);

  if (!isOpen || !student) return null;

  const rawPhone = student.phone ? student.phone.replace(/\D/g, "") : "";
  const zaloChatUrl = `https://zalo.me/${rawPhone}`;
  const amountStr = formatVND(student.current_tuition);
  const monthDisplay = formatMonthDisplay(selectedMonth);

  // Parse breakdown of custom items if present
  let breakdownLines = "";
  try {
    const items = JSON.parse(student.monthly_override?.items_json || "[]");
    if (Array.isArray(items) && items.length > 0) {
      breakdownLines = "\n- Chi tiết điều chỉnh:\n" + items.map((it: any) => `  • ${it.type === "add" ? "+" : "-"}${formatVND(it.amount)} (${it.name})`).join("\n");
    }
  } catch {}

  // Mẫu tin nhắn nhắc học phí chuẩn mực, lịch sự và chuyên nghiệp
  const messageTemplate = `Kính gửi Quý phụ huynh học sinh ${student.name},
Trung tâm xin thông báo về kỳ đóng học phí ${monthDisplay}:
- Học sinh: ${student.name} (${student.level_name || "Lớp học"})
- Gói áp dụng: ${student.tuition_package_name || "Gói học phí chuẩn"}${breakdownLines}
- Tổng học phí cần thanh toán: ${amountStr}

Quý phụ huynh vui lòng hoàn tất học phí để trung tâm duy trì lịch học ổn định cho bé. Nếu quý phụ huynh đã thanh toán, xin vui lòng bỏ qua thông báo này.
Trung tâm xin trân trọng cảm ơn!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageTemplate);
    setCopied(true);
    showToast("Đã sao chép tin nhắn nhắc học phí vào clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendViaZaloBot = async () => {
    if (!student.zalo_chat_id) {
      showToast(
        "Học sinh chưa có Zalo Chat ID! Phụ huynh cần nhắn tin chào Bot trước để nhận Chat ID (hoặc nhập Chat ID trong hồ sơ học sinh).",
        "error"
      );
      return;
    }

    try {
      setIsSendingBot(true);
      const res = await fetch("/api/zalo-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          chat_id: student.zalo_chat_id,
          text: messageTemplate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Đã gửi tin nhắn nhắc nợ tự động qua Zalo Bot thành công!", "success");
        onClose();
      } else {
        showToast(data.message || "Gửi tin nhắn qua Bot thất bại!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ Zalo Bot!", "error");
    } finally {
      setIsSendingBot(false);
    }
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
                  {student.zalo_chat_id ? "Sẵn sàng Bot & Thủ công" : "Thủ công"}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi thông báo học phí đến Zalo phụ huynh {student.name}
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
              {student.zalo_chat_id && (
                <span className="text-[10px] text-emerald-600 font-bold block font-mono">
                  Zalo Chat ID: {student.zalo_chat_id}
                </span>
              )}
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

          {/* Gửi tự động qua Bot nếu có Chat ID */}
          {student.zalo_chat_id ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  Học sinh đã liên kết Zalo Bot. Bạn có thể gửi tin nhắn tự động 1-Click!
                </span>
              </div>
              <button
                type="button"
                disabled={isSendingBot}
                onClick={handleSendViaZaloBot}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 transition shadow-2xs disabled:opacity-50 flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSendingBot ? "Đang gửi..." : "Bấm Gửi Bot"}</span>
              </button>
            </div>
          ) : (
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-600 dark:text-slate-400">
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p>
                Bấm <strong>&quot;Mở Zalo Ngay&quot;</strong> để hệ thống tự động copy nội dung vào clipboard và chuyển thẳng vào phòng chat Zalo với phụ huynh số <strong>{student.phone}</strong>.
              </p>
            </div>
          )}
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
              <span>Mở Zalo Chat</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

