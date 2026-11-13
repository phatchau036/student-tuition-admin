"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  BarChart3,
  BookOpen,
  MessageSquare,
  ShieldCheck,
  Maximize2,
  Minimize2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/components/Toast";

interface AdminAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolName?: string;
  adminName?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const DEFAULT_PROMPT_CHIPS = [
  {
    icon: BarChart3,
    label: "Doanh thu & ai chưa đóng?",
    query: "Doanh thu tháng này của trường là bao nhiêu và còn những ai chưa đóng tiền?",
  },
  {
    icon: HelpCircle,
    label: "Web đã có chức năng này chưa?",
    query: "Phần mềm hiện tại đã có những chức năng nghiệp vụ nào?",
  },
  {
    icon: BookOpen,
    label: "Làm sao để thêm học sinh?",
    query: "Làm sao để thêm một học sinh mới và xếp lịch học trên phần mềm?",
  },
  {
    icon: MessageSquare,
    label: "Soạn thông báo Zalo",
    query: "Soạn giúp tôi một mẫu thông báo lịch nghỉ lễ sắp tới gửi cho phụ huynh qua Zalo thật lịch sự và trang trọng.",
  },
];

export const AdminAiAssistantModal: React.FC<AdminAiAssistantModalProps> = ({
  isOpen,
  onClose,
  schoolName = "Trung tâm",
  adminName = "Quản lý",
}) => {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState<boolean | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Check AI ready status
  useEffect(() => {
    if (isOpen) {
      checkAiStatus();
      if (messages.length === 0) {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Xin chào **${adminName}**! Em là **Trợ Lý AI** của **${schoolName}** 🌟\n\nEm có thể giúp anh/chị:\n• **Tra cứu dữ liệu tức thì**: Doanh thu tháng, ai chưa đóng học phí, sĩ số các lớp...\n• **Hướng dẫn sử dụng phần mềm**: Cách thêm học sinh, điểm danh, đổi ca, học bù, phân quyền...\n• **Soạn thảo văn bản**: Mẫu tin nhắn nhắc học phí, thông báo nghỉ lễ, lời giải thích khéo léo gửi phụ huynh.\n\n*Anh/chị cần em hỗ trợ điều gì hôm nay ạ?*`,
            timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    }
  }, [isOpen]);

  const checkAiStatus = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await res.json();
      setIsReady(Boolean(data.is_ready));
    } catch {
      setIsReady(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: "chat",
          message: text,
          history: historyPayload,
          sender_name: adminName,
        }),
      });

      const data = await res.json();
      const replyContent = data.answer || data.message || "Xin lỗi, em không thể xử lý câu trả lời lúc này.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Tính năng này hiện chưa được hỗ trợ.",
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast("Đã sao chép câu trả lời!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:w-[500px] h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-right duration-250">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 dark:from-purple-950/30 dark:to-indigo-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900 dark:text-white">
                  Trợ Lý AI Quản Trị
                </h3>
                {isReady === true && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="AI sẵn sàng" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {schoolName} • Phục vụ 24/7
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setMessages([]);
                showToast("Đã làm mới cuộc trò chuyện!", "info");
              }}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Xóa lịch sử chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === "user";

            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? "bg-indigo-600 text-white"
                      : "bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-xs"
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[85%] group ${isUser ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs whitespace-pre-line border border-slate-200/60 dark:border-slate-700/60"
                    }`}
                  >
                    {m.content}
                  </div>

                  {/* Actions for Assistant */}
                  {!isUser && (
                    <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                      <span>{m.timestamp}</span>
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition"
                        title="Sao chép nội dung"
                      >
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === m.id ? "Đã copy" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-100" />
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce delay-200" />
                <span className="ml-1 text-[11px] font-semibold">AI đang tra cứu dữ liệu...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* PROMPT CHIPS */}
        <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {DEFAULT_PROMPT_CHIPS.map((chip, idx) => {
            const IconComponent = chip.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(chip.query)}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 transition shrink-0 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <IconComponent className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* INPUT FORM */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Hỏi doanh thu, học phí hoặc cách dùng web..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 hover:opacity-95 transition disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400">
            📱 Mẹo: Bạn cũng có thể nhắn tin hỏi trực tiếp các câu này cho <strong>Zalo Bot</strong> trên điện thoại!
          </p>
        </div>

      </div>
    </div>
  );
};
