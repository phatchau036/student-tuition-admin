import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const checkGit = url.searchParams.get("check_git") === "1";

  const flagPath = join(process.cwd(), ".maintenance");
  const isMaintenance = existsSync(flagPath);

  let maintenanceInfo = null;
  if (isMaintenance) {
    try {
      const content = readFileSync(flagPath, "utf-8");
      maintenanceInfo = JSON.parse(content);
    } catch {}
  }

  // Nếu chỉ kiểm tra trạng thái bảo trì thông thường (cho MaintenanceGuard gọi 3s/lần)
  if (!checkGit) {
    return NextResponse.json({
      success: true,
      maintenance: isMaintenance,
      maintenance_info: maintenanceInfo,
    });
  }

  // Khi người dùng yêu cầu kiểm tra xem GitHub có bản mới hay không
  try {
    const cwd = process.cwd();
    // Fetch thông tin mới nhất từ GitHub
    await execAsync("git fetch origin main", { cwd, timeout: 15000 });

    const { stdout: localHash } = await execAsync("git rev-parse HEAD", { cwd });
    const { stdout: remoteHash } = await execAsync("git rev-parse origin/main", { cwd });

    const localCommit = localHash.trim();
    const remoteCommit = remoteHash.trim();
    const hasUpdate = localCommit !== remoteCommit;

    // Lấy message của commit mới nhất trên origin/main
    const { stdout: remoteLog } = await execAsync('git log -1 --pretty=format:"%h - %s (%cd)" --date=short origin/main', { cwd });
    // Lấy message commit hiện tại của local
    const { stdout: localLog } = await execAsync('git log -1 --pretty=format:"%h - %s (%cd)" --date=short HEAD', { cwd });

    let commitsBehind = 0;
    if (hasUpdate) {
      try {
        const { stdout: behindCount } = await execAsync("git rev-list --count HEAD..origin/main", { cwd });
        commitsBehind = parseInt(behindCount.trim(), 10) || 1;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      maintenance: isMaintenance,
      has_update: hasUpdate,
      commits_behind: commitsBehind,
      local_commit: localCommit.slice(0, 7),
      local_log: localLog.trim(),
      remote_commit: remoteCommit.slice(0, 7),
      remote_log: remoteLog.trim(),
    });
  } catch (error: unknown) {
    console.error("Check git error:", error);
    return NextResponse.json({
      success: true,
      maintenance: isMaintenance,
      has_update: false,
      error_message: (error as Error).message || "Không thể kiểm tra kết nối GitHub",
    });
  }
}
