import { NextResponse } from "next/server";
import { exec, spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

// API Kích hoạt nâng cấp tự động từ GitHub
export async function POST(req: Request) {
  try {
    const cwd = process.cwd();
    const flagPath = join(cwd, ".maintenance");

    // 1. Kích hoạt cờ bảo trì ngay lập tức để bất kỳ ai truy cập vào đều thấy trang Server Đang Nâng Cấp
    writeFileSync(flagPath, JSON.stringify({ started_at: new Date().toISOString() }), "utf-8");

    // Chạy quy trình git pull && npm run build && restart server ở tiến trình tách biệt
    // Trên Windows, dùng cmd.exe /c để chạy chuỗi lệnh tự động
    const isWindows = process.platform === "win32";
    
    // Script hoàn tất: gỡ cờ .maintenance và khởi động lại
    const updateScript = isWindows
      ? `git pull origin main && npm run build && (if exist .maintenance del .maintenance) && npm start`
      : `git pull origin main && npm run build && rm -f .maintenance && npm start`;

    // Khởi chạy tiến trình nền độc lập (detached)
    const child = isWindows
      ? spawn("cmd.exe", ["/c", updateScript], {
          cwd,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        })
      : spawn("sh", ["-c", updateScript], {
          cwd,
          detached: true,
          stdio: "ignore",
        });

    child.unref();

    return NextResponse.json({
      success: true,
      message: "Hệ thống đã nhận lệnh và bắt đầu tải bản cập nhật mới nhất từ GitHub. Quá trình nâng cấp đang diễn ra!",
    });
  } catch (error: unknown) {
    console.error("System Upgrade Error:", error);
    try {
      const flagPath = join(process.cwd(), ".maintenance");
      if (existsSync(flagPath)) unlinkSync(flagPath);
    } catch {}

    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi khi kích hoạt nâng cấp" },
      { status: 500 }
    );
  }
}
