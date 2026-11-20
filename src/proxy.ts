import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * proxy.ts — Localhost Guard (Next.js 16 Proxy, trước đây là middleware).
 *
 * Bảo vệ phân hệ Super Admin (`/he-thong` và `/api/system/*`):
 * nếu request không xuất phát từ máy chủ nội bộ, trả về 404 ngụy trang
 * như thể đường dẫn không tồn tại.
 *
 * Cách bật/tắt:
 *   - Mặc định: BẬT. Chỉ cho phép loopback.
 *   - Đặt biến môi trường HETHONG_GUARD=off để tắt (dùng khi cần truy cập
 *     /he-thong qua SSH tunnel hoặc reverse proxy tin cậy).
 *   - Đặt HETHONG_ALLOWED_IPS="1.2.3.4,5.6.7.8" để mở thêm IP cụ thể.
 *
 * Lưu ý vận hành: khi ứng dụng chạy sau NGINX, cần cấu hình
 *   proxy_set_header X-Forwarded-For $remote_addr;
 *   proxy_set_header Host $host;
 * nếu không proxy sẽ chỉ thấy IP của chính NGINX.
 */

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

function normalizeIp(value: string): string {
  const ip = value.trim();
  if (ip === "::ffff:127.0.0.1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) return ip.slice("::ffff:".length);
  return ip;
}

function clientIpOf(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return normalizeIp(realIp);

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return normalizeIp(cfIp);

  return "127.0.0.1";
}

function hostOf(request: NextRequest): string {
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host") || "";
  return host.split(":")[0].toLowerCase();
}

function isAllowed(request: NextRequest): boolean {
  if ((process.env.HETHONG_GUARD || "").toLowerCase() === "off") return true;

  const extra = (process.env.HETHONG_ALLOWED_IPS || "")
    .split(/[\n,;]+/)
    .map((entry) => normalizeIp(entry).toLowerCase())
    .filter(Boolean);

  const ip = normalizeIp(clientIpOf(request)).toLowerCase();
  if (LOOPBACK.has(ip) || extra.includes(ip)) return true;

  const host = hostOf(request);
  if (LOOPBACK.has(host) || extra.includes(host)) return true;

  return false;
}

export function proxy(request: NextRequest) {
  if (isAllowed(request)) return NextResponse.next();

  // Ngụy trang: phản hồi 404 giống trang không tồn tại.
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // Không match `/api/system/upgrade/status` vì MaintenanceGuard của mọi phân hệ
  // cần đọc trạng thái bảo trì. Route đó tự kiểm tra localhost khi có `check_git=1`.
  matcher: [
    "/he-thong/:path*",
    "/api/system",
    "/api/system/auth",
    "/api/system/team",
    "/api/system/upgrade",
  ],
};
