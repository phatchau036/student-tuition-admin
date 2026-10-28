const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const flagPath = path.join(cwd, ".maintenance");
const isWindows = process.platform === "win32";

console.log("========================================================");
console.log(" HE THONG TU DONG NANG CAP & KHOI DONG LAI MAY CHU");
console.log("========================================================");

function run(cmd, ignoreError = false) {
  try {
    console.log(`[EXEC] ${cmd}`);
    execSync(cmd, { cwd, stdio: "inherit" });
    return true;
  } catch (err) {
    if (!ignoreError) {
      console.error(`[ERROR] Lenh that bai: ${cmd}`);
      if (fs.existsSync(flagPath)) fs.unlinkSync(flagPath);
      process.exit(1);
    }
    return false;
  }
}

// 1. Kích hoạt chế độ bảo trì
fs.writeFileSync(flagPath, JSON.stringify({ started_at: new Date().toISOString() }), "utf-8");

// 2. Kéo code mới từ GitHub
console.log("[1/4] Dang keo ma nguon moi nhat tu GitHub (git pull origin main)...");
run("git pull origin main");

// 3. Luôn chạy npm install để đảm bảo không bao giờ bị thiếu module
console.log("[2/4] Dang kiem tra va cai dat day du thu vien (npm install)...");
run("npm install");

// 4. Biên dịch hệ thống
console.log("[3/4] Dang toi uu va bien dich he thong (npm run build)...");
run("npm run build");

// 5. Nâng cấp xong -> Xóa cờ bảo trì
console.log("[4/4] Hoan tat nang cap! Go co bao tri...");
if (fs.existsSync(flagPath)) {
  fs.unlinkSync(flagPath);
}

// 6. Giải phóng port 3000
console.log("Giai phong port 3000 neu dang bi chiem giu...");
try {
  if (isWindows) {
    const netstatOutput = execSync('netstat -ano | findstr :3000', { cwd }).toString();
    const listeningLines = netstatOutput.split(/[\r\n]+/).filter((l) => l.includes("LISTENING"));
    const pids = [...new Set(listeningLines.map((l) => l.trim().split(/\s+/).pop()).filter(Boolean))];
    for (const pid of pids) {
      if (pid && pid !== String(process.pid)) {
        try {
          // KHÔNG dùng /T vì /T sẽ diệt toàn bộ cây tiến trình con bao gồm cả run-upgrade.js
          execSync(`taskkill /F /PID ${pid}`);
        } catch {}
      }
    }
  } else {
    execSync("fuser -k 3000/tcp 2>/dev/null || true");
  }
} catch {}

// Chờ 2 giây để cổng hoàn toàn được hệ điều hành giải phóng
try {
  if (isWindows) {
    execSync("timeout /t 2 /nobreak >nul", { stdio: "ignore" });
  } else {
    execSync("sleep 2", { stdio: "ignore" });
  }
} catch {}

// 7. Khởi động lại server Next.js chạy độc lập
console.log("Dang khoi dong lai may chu Next.js...");
const logPath = path.join(cwd, "upgrade.log");
const outFd = fs.openSync(logPath, "a");

const child = isWindows
  ? spawn("cmd.exe", ["/c", "npm start"], {
      cwd,
      detached: true,
      stdio: ["ignore", outFd, outFd],
      windowsHide: true,
    })
  : spawn("npm", ["start"], {
      cwd,
      detached: true,
      stdio: ["ignore", outFd, outFd],
    });

child.unref();

console.log("========================================================");
console.log(" NANG CAP THANH CONG! MAY CHU DA HOAT DONG TRO LAI.");
console.log("========================================================");
process.exit(0);
