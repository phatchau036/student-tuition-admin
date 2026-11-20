"use client";

import type { FormEvent } from "react";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Sparkles } from "lucide-react";

export interface AiTestResult {
  success: boolean;
  message: string;
  reply?: string;
  elapsed_ms?: number;
}

interface AiConfigTabProps {
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiIsActive: boolean;
  showApiKey: boolean;
  isSavingAi: boolean;
  isTestingAi: boolean;
  aiTestResult: AiTestResult | null;
  onBaseUrlChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onActiveChange: (value: boolean) => void;
  onToggleShowApiKey: (visible: boolean) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onTest: () => void;
}

/**
 * Tab cấu hình Trợ lý AI toàn hệ thống (OpenAI-compatible) — tách trong Giai đoạn 2.
 */
export function AiConfigTab({
  aiBaseUrl,
  aiApiKey,
  aiModel,
  aiIsActive,
  showApiKey,
  isSavingAi,
  isTestingAi,
  aiTestResult,
  onBaseUrlChange,
  onApiKeyChange,
  onModelChange,
  onActiveChange,
  onToggleShowApiKey,
  onSave,
  onTest,
}: AiConfigTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-700/80 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Cấu Hình Trợ Lý AI Toàn Hệ Thống (OpenAI / Gemini Proxy)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Hỗ trợ mọi endpoint tương thích chuẩn OpenAI API (Google Gemini 3.8 Flash, ChatGPT,
              v.v.). Trí tuệ nhân tạo sẽ tự động tiếp sức cho: (1) Cửa sổ Trợ lý AI trên Dashboard
              Admin, (2) Chat trực tiếp với Zalo Bot của Admin, (3) Gợi ý nhận xét buổi học cho Giáo
              viên.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={aiIsActive}
                onChange={(e) => onActiveChange(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded-md focus:ring-purple-500"
              />
              <span>{aiIsActive ? "AI Đang Bật" : "AI Đang Tắt"}</span>
            </label>
          </div>
        </div>

        <form onSubmit={onSave} className="space-y-4 max-w-3xl">
          {/* Endpoint Base URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">AI Endpoint Base URL *</label>
            <input
              type="text"
              required
              placeholder="https://chat.4uai.tech/v1 hoặc https://api.openai.com/v1"
              value={aiBaseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-[11px] text-slate-400">
              Đường dẫn máy chủ API proxy (chuẩn OpenAI Chat Completions). Ví dụ:{" "}
              <code>https://chat.4uai.tech/v1</code>
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">AI API Key *</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                required
                placeholder="sk-aistudio-... hoặc sk-..."
                value={aiApiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="w-full pl-4 pr-11 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={() => onToggleShowApiKey(!showApiKey)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                title={showApiKey ? "Ẩn mã khóa" : "Hiện mã khóa"}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Mã khóa bí mật của mô hình. Được bảo mật an toàn trên máy chủ nội bộ.
            </p>
          </div>

          {/* Model ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Mã Mô Hình (Model ID) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="gemini-3.8-flash hoặc gpt-4o-mini"
                value={aiModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="flex-1 px-4 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex items-center gap-1">
                {["gemini-3.8-flash", "gpt-4o-mini", "gemini-2.0-flash"].map((quickModel) => (
                  <button
                    key={quickModel}
                    type="button"
                    onClick={() => onModelChange(quickModel)}
                    className={`px-2.5 py-2 text-[10px] font-bold rounded-lg border transition ${
                      aiModel === quickModel
                        ? "bg-purple-600 text-white border-purple-500"
                        : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    {quickModel}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Result Banner */}
          {aiTestResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 animate-in fade-in ${
                aiTestResult.success
                  ? "bg-emerald-950/40 border-emerald-800 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800 text-rose-300"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {aiTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{aiTestResult.success ? "Kết Nối Thành Công!" : "Kết Nối Thất Bại"}</span>
                </span>
                {aiTestResult.elapsed_ms !== undefined && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40">
                    {aiTestResult.elapsed_ms}ms
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{aiTestResult.message}</p>
              {aiTestResult.reply && (
                <div className="mt-1.5 p-2 rounded-xl bg-black/40 font-mono text-[11px] text-slate-300">
                  Phản hồi từ AI: &quot;{aiTestResult.reply}&quot;
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              disabled={isTestingAi}
              onClick={onTest}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-amber-400 ${isTestingAi ? "animate-spin" : ""}`} />
              <span>{isTestingAi ? "Đang Thử Nghiệm..." : "Kiểm Tra Kết Nối AI"}</span>
            </button>

            <button
              type="submit"
              disabled={isSavingAi}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-md shadow-purple-600/30 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSavingAi ? "Đang Lưu..." : "Lưu Cấu Hình AI"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
