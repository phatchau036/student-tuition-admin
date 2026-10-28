const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const flagPath = path.join(cwd, ".maintenance");
const logPath = path.join(cwd, "upgrade.log");
const isWindows = process.platform === "win32";

// Hàm ghi log thời gian thực
function log(msg) {
  const time = new Date().toLocaleTimeString("vi-VN", { hour12: false });
  const line = `[${time}] ${msg}\n`;
  console.log(line.trim());
  try {
    fs.appendFileSync(logPath, line, "utf-8");
  } catch {}
}

// Xóa file log cũ khi bắt đầu lượt nâng cấp mới
try {
  fs.writeFileSync(logPath, `=== BẮT ĐẦU NÂNG CẤP HỆ THỐNG [${new Date().toISOString()}] ===\n`, "utf-8");
} catch {}

function runCmd(cmd, ignoreError = false) {
  try {
    log(`[EXEC] ${cmd}`);
    const output = execSync(cmd, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
    if (output && output.trim()) {
      log(`[STDOUT] ${output.trim()}`);
    }
    return true;
  } catch (err) {
    const errOutput = (err.stdout ? err.stdout.toString() : "") + (err.stderr ? err.stderr.toString() : "") + (err.message || "");
    log(`[LỖI] Lệnh thất bại: ${cmd}\n${errOutput.trim()}`);
    if (!ignoreError) {
      if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
      log("=== NÂNG CẤP THẤT BẠI! ĐÃ HỦY CỜ BẢO TRÌ ===");
      process.exit(1);
    }
    return false;
  }
}

// 1. Kích hoạt cờ bảo trì
fs.writeFileSync(flagPath, JSON.stringify({ started_at: new Date().toISOString() }), "utf-8");
log("[1/5] Đã bật chế độ bảo trì hệ thống (.maintenance)");

// 2. Kéo code mới nhất từ GitHub
log("[2/5] Đang kéo mã nguồn mới nhất từ GitHub (git pull origin main)...");
// Tự động bỏ qua thay đổi file tạm để không bị xung đột git pull
runCmd("git checkout package-lock.json", true);
runCmd("git pull origin main");

// 3. Cài đặt thư viện nếu có thay đổi
log("[3/5] Đang kiểm tra và cài đặt thư viện phụ thuộc (npm install)...");
runCmd("npm install");

// 4. Biên dịch ứng dụng Next.js (next build)
log("[4/5] Đang tối ưu và biên dịch hệ thống (npm run build)...");
runCmd("npm run build");

// 5. Build thành công -> Gỡ bỏ cờ bảo trì ngay lập tức
log("[5/5] Biên dịch hoàn tất thành công 100%! Gỡ bỏ cờ bảo trì...");
if (fs.existsSync(flagPath)) {
  fs.unlinkSync(flagPath);
}

// 6. Giải phóng port 3000 an toàn (Chỉ diệt tiến trình Next.js cũ đang chiếm port 3000)
log("Đang giải phóng cổng 3000 để chuyển giao cho phiên bản mới...");
try {
  if (isWindows) {
    let netstatOutput = "";
    try {
      netstatOutput = execSync("netstat -ano", { cwd, encoding: "utf-8" });
    } catch {}

    const lines = netstatOutput.split(/[\r\n]+/).filter((l) => l.includes(":3000") && l.includes("LISTENING"));
    const pids = [...new Set(lines.map((l) => l.trim().split(/\s+/).pop()).filter(Boolean))];

    for (const pid of pids) {
      if (pid && pid !== String(process.pid)) {
        try {
          // KHÔNG dùng cờ /T (Tree) để không diệt nhầm script upgrader
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          log(`Đã đóng tiến trình cũ (PID: ${pid}) trên port 3000`);
        } catch {}
      }
    }
  } else {
    execSync("fuser -k 3000/tcp 2>/dev/null || true", { stdio: "ignore" });
  }
} catch (e) {
  log(`Ghi chú giải phóng port: ${e.message}`);
}

// Chờ 2.5 giây bằng vòng lặp Node.js để hệ điều hành hoàn toàn giải phóng socket mạng
const waitTill = new Date(new Date().getTime() + 2500);
while (waitTill > new Date()) {}

// 7. Khởi động máy chủ Next.js phiên bản mới hoàn toàn độc lập
log("Đang khởi động máy chủ Next.js phiên bản mới...");

const outLogFd = fs.openSync(path.join(cwd, "server-stdout.log"), "a");

const child = isWindows
  ? spawn("cmd.exe", ["/c", "npm", "start"], {
      cwd,
      detached: true,
      stdio: ["ignore", outLogFd, outLogFd],
      windowsHide: true,
    })
  : spawn("npm", ["start"], {
      cwd,
      detached: true,
      stdio: ["ignore", outLogFd, outLogFd],
    });

child.unref();

log("=== NÂNG CẤP HOÀN TẤT! MÁY CHỦ ĐÃ HOẠT ĐỘNG TRỞ LẠI ===");
process.exit(0);
