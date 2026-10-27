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

    // Quy trình tự động hóa độc lập thông qua script:
    // 1. Kéo code mới nhất từ GitHub: git pull origin main
    // 2. Tự động cài thư viện mới nếu có: npm install
    // 3. Tối ưu và biên dịch bản build Next.js: npm run build
    // 4. Gỡ cờ bảo trì: del .maintenance
    // 5. Giải phóng port 3000 và khởi động lại dịch vụ máy chủ mới: npm start
    const isWindows = process.platform === "win32";
    const scriptPath = isWindows
      ? join(cwd, "scripts", "auto-upgrade.bat")
      : join(cwd, "scripts", "auto-upgrade.sh");

    // Khởi chạy tiến trình nền độc lập (detached)
    const child = isWindows
      ? spawn("cmd.exe", ["/c", scriptPath], {
          cwd,
          detached: true,
          stdio: "ignore",
          windowsHide: true,
        })
      : spawn("bash", [scriptPath], {
          cwd,
          detached: true,
          stdio: "ignore",
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
