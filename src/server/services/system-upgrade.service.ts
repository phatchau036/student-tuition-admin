/**
 * system-upgrade.service.ts - Tang nghiep vu & truy cap du lieu cho endpoint tuong ung.
 *
 * Toan bo truy van SQL cua endpoint nam tai day. Cac file route handler
 * chi con lop chuyen tiep mong (nhan Request -> goi handler -> tra Response).
 *
 * Tu dong tach tu route handler trong Giai doan 2.
 */
import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { createLogger } from "@/lib/logger";
import { getSystemAdminFromRequest } from "@/lib/authHelper";

const log = createLogger("api/system/upgrade");

// API Kích hoạt nâng cấp tự động từ GitHub
export async function handleSystemUpgradePost(req: Request) {
  try {
    const systemAdmin = await getSystemAdminFromRequest(req);
    if (!systemAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền kích hoạt nâng cấp hệ thống!" },
        { status: 401 }
      );
    }
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
      message:
        "Hệ thống đã nhận lệnh và bắt đầu tự động nâng cấp: Kéo code -> Cài thư viện -> Build -> Khởi động lại. Bạn chỉ cần ngồi chờ khoảng 1-2 phút là xong!",
    });
  } catch (error: unknown) {
    log.error("System Upgrade Error:", { error: error });
    try {
      const flagPath = join(process.cwd(), ".maintenance");
      if (existsSync(flagPath)) unlinkSync(flagPath);
    } catch (err) {
      log.debug("Bỏ qua lỗi không ảnh hưởng luồng chính (route)", { error: err });
    }

    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi khi kích hoạt nâng cấp" },
      { status: 500 }
    );
  }
}
