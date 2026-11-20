"use client";

import type { FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";

export interface SystemToastMessage {
  type: "success" | "error" | "info";
  text: string;
}

interface SystemLoginScreenProps {
  username: string;
  password: string;
  isSubmitting: boolean;
  toastMessage: SystemToastMessage | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/** Toast dùng chung cho phân hệ Super Admin (dark-only UI). */
export function SystemToast({ message }: { message: SystemToastMessage | null }) {
  if (!message) return null;
  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-white text-slate-900 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
      {message.type === "success" ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      ) : message.type === "error" ? (
        <AlertCircle className="w-5 h-5 text-rose-600" />
      ) : (
        <Sparkles className="w-5 h-5 text-indigo-600" />
      )}
      <span className="text-sm font-semibold">{message.text}</span>
    </div>
  );
}

/** Màn hình đăng nhập Super Admin (`/he-thong`, chỉ localhost). */
export function SystemLoginScreen({
  username,
  password,
  isSubmitting,
  toastMessage,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: SystemLoginScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans relative">
      <SystemToast message={toastMessage} />

      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 backdrop-blur-md">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center shadow-lg shadow-purple-600/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Cổng Quản Trị Hệ Thống</h1>
          <p className="text-xs text-slate-400">
            Khu vực đăng nhập dành riêng cho Chủ Hệ Thống quản lý toàn diện các cơ sở.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tài khoản Chủ Hệ Thống (.env):
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                placeholder="Tên đăng nhập hệ thống"
                value={username}
                onChange={(e) => onUsernameChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Mật khẩu:</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                placeholder="Mật khẩu bảo mật"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? "Đang xác thực..." : "Đăng Nhập Hệ Thống"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            Thông tin đăng nhập được lưu trữ an toàn trong biến môi trường file{" "}
            <code className="text-purple-400 font-mono">.env</code> của máy chủ.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Màn hình chờ khi đang xác thực phiên Super Admin. */
export function SystemLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold">Đang kiểm tra quyền truy cập hệ thống...</span>
      </div>
    </div>
  );
}
