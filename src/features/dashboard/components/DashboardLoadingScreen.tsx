/**
 * Màn hình chờ trong lúc xác thực phiên quản trị.
 */
export function DashboardLoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900/5 dark:bg-slate-950 flex items-center justify-center text-slate-500">
      <div className="flex items-center gap-2.5 bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Đang kiểm tra quyền quản trị cơ sở...
        </span>
      </div>
    </div>
  );
}
