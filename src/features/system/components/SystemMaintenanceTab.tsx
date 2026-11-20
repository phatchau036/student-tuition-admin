"use client";

import { Check, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";

export interface UpdateCheckResult {
  has_update?: boolean;
  commits_behind?: number;
  local_commit?: string;
  remote_commit?: string;
  local_log?: string;
  remote_log?: string;
  message?: string;
}

interface SystemMaintenanceTabProps {
  isCheckingUpdate: boolean;
  isUpgrading: boolean;
  updateCheckResult: UpdateCheckResult | null;
  onCheckUpdate: (silent?: boolean) => void;
  onOpenUpgradeModal: (open: boolean) => void;
}

/**
 * Tab tự động nâng cấp & bảo trì hệ thống — tách trong Giai đoạn 2.
 */
export function SystemMaintenanceTab({
  isCheckingUpdate,
  isUpgrading,
  updateCheckResult,
  onCheckUpdate,
  onOpenUpgradeModal,
}: SystemMaintenanceTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hệ Thống Tự Động Hóa 1-Click</span>
              </span>

              {updateCheckResult && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                    updateCheckResult.has_update
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}
                >
                  {updateCheckResult.has_update ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Có {updateCheckResult.commits_behind || 1} bản cập nhật mới trên GitHub
                      </span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-blue-400" />
                      <span>Hệ thống đang ở bản mới nhất ({updateCheckResult.local_commit})</span>
                    </>
                  )}
                </span>
              )}
            </div>

            <h3 className="text-xl font-black text-white mt-1">
              Tự Động Nâng Cấp Phiên Bản Mới Từ GitHub
            </h3>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Quy trình tự động hóa độc lập: Kích hoạt màn hình bảo trì toàn hệ thống -&gt; Tải mã
              nguồn mới nhất từ kho GitHub -&gt; Tự động cài đặt thư viện thiếu -&gt; Tối ưu và biên
              dịch bản build Next.js -&gt; Tự khởi động lại dịch vụ ngay lập tức.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isCheckingUpdate || isUpgrading}
              onClick={() => onCheckUpdate(false)}
              className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
              <span>{isCheckingUpdate ? "Đang kiểm tra..." : "Kiểm Tra Bản Mới"}</span>
            </button>

            <button
              type="button"
              disabled={isUpgrading}
              onClick={() => onOpenUpgradeModal(true)}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isUpgrading ? "animate-spin" : ""}`} />
              <span>{isUpgrading ? "Đang Nâng Cấp..." : "Cập Nhật GitHub Ngay"}</span>
            </button>
          </div>
        </div>

        {/* Chi tiết phiên bản git */}
        {updateCheckResult && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 font-bold block text-[11px] mb-1">
                Bản đang chạy trên máy chủ:
              </span>
              <p className="font-mono text-purple-300 font-bold">
                {updateCheckResult.local_log || updateCheckResult.local_commit}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-bold block text-[11px] mb-1">
                Bản mới nhất trên GitHub:
              </span>
              <p className="font-mono text-emerald-400 font-bold">
                {updateCheckResult.remote_log || updateCheckResult.remote_commit}
              </p>
            </div>
          </div>
        )}

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-2 text-xs text-slate-300 font-mono">
          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            Các lệnh thực thi trong quy trình tự động:
          </p>
          <p>
            1.{" "}
            <span className="text-purple-300">echo &quot;maintenance&quot; &gt; .maintenance</span>{" "}
            (Kích hoạt bảo trì)
          </p>
          <p>
            2. <span className="text-blue-300">git pull origin main</span> (Kéo code mới nhất)
          </p>
          <p>
            3. <span className="text-amber-300">npm install</span> (Tự cài thư viện bổ sung nếu có)
          </p>
          <p>
            4. <span className="text-emerald-300">npm run build</span> (Tối ưu biên dịch)
          </p>
          <p>
            5. <span className="text-purple-300">del .maintenance &amp;&amp; npm start</span> (Khởi
            động lại máy chủ)
          </p>
        </div>
      </div>
    </div>
  );
}
