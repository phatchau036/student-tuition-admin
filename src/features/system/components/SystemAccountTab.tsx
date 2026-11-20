"use client";

import type { FormEvent } from "react";
import { Check, KeyRound } from "lucide-react";

interface SystemAccountTabProps {
  authUsername: string;
  currentPass: string;
  newUsername: string;
  newPass: string;
  confirmPass: string;
  isChanging: boolean;
  onCurrentPassChange: (value: string) => void;
  onNewUsernameChange: (value: string) => void;
  onNewPassChange: (value: string) => void;
  onConfirmPassChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

/**
 * Tab đổi tài khoản & mật khẩu Super Admin — tách trong Giai đoạn 2.
 */
export function SystemAccountTab({
  authUsername,
  currentPass,
  newUsername,
  newPass,
  confirmPass,
  isChanging,
  onCurrentPassChange,
  onNewUsernameChange,
  onNewPassChange,
  onConfirmPassChange,
  onSubmit,
  onCancel,
}: SystemAccountTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 shadow-xl space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-700/60">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Đổi Tài Khoản & Mật Khẩu Chủ Hệ Thống</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Super Admin
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Thay đổi thông tin đăng nhập quản trị cao nhất của trang /he-thong. Mật khẩu được mã
              hóa và lưu trữ an toàn.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Thông tin tài khoản hiện tại */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">Tài khoản hệ thống đang đăng nhập:</span>
            <span className="font-mono font-bold text-purple-300 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/50">
              {authUsername || "hethong"}
            </span>
          </div>

          {/* Tên đăng nhập mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên đăng nhập hệ thống mới
            </label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => onNewUsernameChange(e.target.value)}
              placeholder={`Giữ nguyên (${authUsername || "hethong"}) hoặc nhập tên mới`}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Bạn có thể giữ nguyên tên đăng nhập hiện tại hoặc đổi sang tên mới (tối thiểu 3 ký
              tự).
            </p>
          </div>

          {/* Mật khẩu hiện tại */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Mật khẩu hệ thống hiện tại <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) => onCurrentPassChange(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại để xác thực..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Mật khẩu mới & Xác nhận */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Mật khẩu mới <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => onNewPassChange(e.target.value)}
                placeholder="Tối thiểu 6 ký tự..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Xác nhận mật khẩu mới <span className="text-rose-400">*</span>
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => onConfirmPassChange(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-700/60">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isChanging}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-600/30 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isChanging ? "Đang Cập Nhật..." : "Lưu Thông Tin Đăng Nhập Mới"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
