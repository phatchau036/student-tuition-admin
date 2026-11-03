"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Giao Vien Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-900 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 p-6 rounded-3xl border border-rose-200 dark:border-rose-900 shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center font-bold text-xl">
          ⚠️
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Đã xảy ra sự cố khi tải dữ liệu Cổng Giáo Viên
        </h2>
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 text-left font-mono text-xs overflow-auto max-h-40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800">
          <p className="font-bold">{error?.name}: {error?.message}</p>
          {error?.stack && <pre className="text-[10px] mt-1 whitespace-pre-wrap opacity-80">{error.stack}</pre>}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("teacher_phone");
                localStorage.removeItem("active_teacher_id");
              }
              window.location.reload();
            }}
            className="flex-1 py-2.5 px-3 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition shadow-md shadow-rose-600/20"
          >
            Đăng xuất phiên cũ & Tải lại
          </button>
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-3 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
          >
            Thử lại
          </button>
        </div>
      </div>
    </div>
  );
}
