"use client";

import type { FormEvent } from "react";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";

interface PasswordTabProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isChangingPassword: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * Tab đổi mật khẩu quản trị viên — tách ra trong Giai đoạn 2.
 */
export function PasswordTab({
  currentPassword,
  newPassword,
  confirmPassword,
  isChangingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: PasswordTabProps) {
  return (
    <div className="space-y-5 max-w-md mx-auto py-4">
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center shadow-xs">
          <KeyRound className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          Đổi Mật Khẩu Quản Trị Viên
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cập nhật mật khẩu đăng nhập vào cổng Quản trị cơ sở này
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Mật khẩu hiện tại *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu đang sử dụng"
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Mật khẩu mới (Tối thiểu 6 ký tự) *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              required
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Xác nhận mật khẩu mới *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="password"
              required
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isChangingPassword ? "Đang cập nhật..." : "Cập Nhật Mật Khẩu Mới"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
