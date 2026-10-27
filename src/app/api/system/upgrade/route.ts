import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";

// API Kích hoạt nâng cấp tự động từ GitHub
export async function POST(req: Request) {
  try {
    const cwd = process.cwd();
    const flagPath = join(cwd, ".maintenance");

    // 1. Kích hoạt cờ bảo trì ngay lập tức để bất kỳ ai truy cập vào đều thấy trang Server Đang Nâng Cấp
    writeFileSync(flagPath, JSON.stringify({ started_at: new Date().toISOString() }), "utf-8");

    // Khởi chạy tiến trình nâng cấp nền qua Node.js (tương thích 100% mọi hệ điều hành)
    const scriptPath = join(cwd, "scripts", "run-upgrade.js");

    const child = spawn(process.execPath, [scriptPath], {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });

    child.unref();

    return NextResponse.json({
      success: true,
      message: "Hệ thống đã nhận lệnh và bắt đầu tự động nâng cấp: Kéo code -> Cài thư viện -> Build -> Khởi động lại. Bạn chỉ cần ngồi chờ khoảng 1-2 phút là xong!",
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
