import Link from "next/link";
import { ShieldAlert } from "lucide-react";

interface IpBlockedScreenProps {
  clientIp?: string;
  schoolName?: string;
}

/**
 * Màn hình 403 khi cơ sở bật IP Whitelist và IP hiện tại không nằm trong danh sách cho phép.
 */
export function IpBlockedScreen({ clientIp, schoolName }: IpBlockedScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 font-sans text-center">
      <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-rose-500/30 shadow-2xl space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <span className="px-2.5 py-1 text-xs font-black uppercase rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 tracking-wider">
            Web Error • 403 Forbidden
          </span>
          <h1 className="text-xl font-extrabold text-white mt-3">Truy Cập Bị Từ Chối</h1>
          <p className="text-xs text-rose-300 font-semibold mt-1">
            Trường học đã bật tính năng Bảo Vệ Giới Hạn IP
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1.5 text-left font-mono">
          <p>
            • IP của bạn:{" "}
            <span className="text-rose-400 font-bold">{clientIp || "Không xác định"}</span>
          </p>
          <p>
            • Trường quản lý:{" "}
            <span className="text-white font-semibold">{schoolName || "Trung tâm"}</span>
          </p>
          <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 font-sans">
            Địa chỉ IP này chưa được cấp phép trong danh sách IP Whitelist của trường.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          Vui lòng liên hệ <strong>Chủ Hệ Thống</strong> để thêm IP của bạn vào danh sách cho phép
          truy cập.
        </p>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Về Cổng Phụ Huynh
          </Link>
        </div>
      </div>
    </div>
  );
}
