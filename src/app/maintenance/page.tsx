"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, RefreshCw, Server, AlertTriangle } from "lucide-react";

export default function MaintenancePage() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  // Tự động kiểm tra định kỳ 5 giây, khi server hết nâng cấp sẽ tự reload về trang chủ
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/system/upgrade/status");
        const json = await res.json();
        if (json.maintenance === false) {
          window.location.href = "/";
        }
      } catch {
        // server đang khởi động lại, tiếp tục chờ
      }
    }, 4000);

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-6 p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-md">
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30">
          <Server className="w-10 h-10 animate-bounce" />
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Hệ Thống Đang Nâng Cấp Phiên Bản Mới</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Server Đang Được Cập Nhật{dots}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Hệ thống đang tự động tải và cài đặt phiên bản mới nhất từ kho mã nguồn GitHub để bổ sung tính năng và tối ưu hiệu năng.
          </p>
        </div>

        {/* Progress box */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5 text-left text-xs">
          <div className="flex items-center justify-between font-bold text-slate-300">
            <span>Tiến trình nâng cấp tự động:</span>
            <span className="text-purple-400 font-mono">Đang xử lý</span>
          </div>
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full w-2/3 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-400 italic text-center">
            Trang web sẽ tự động kết nối lại ngay khi quá trình hoàn tất. Quý vị vui lòng không tắt trình duyệt!
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tải Lại Trang Thử</span>
          </button>
        </div>
      </div>
    </div>
  );
}
