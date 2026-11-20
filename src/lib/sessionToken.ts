import crypto from "crypto";
import { createLogger } from "@/lib/logger";

const log = createLogger("lib/sessionToken");

/**
 * sessionToken.ts — Sinh và xác thực token phiên Quản trị cơ sở.
 *
 * Định dạng: base64(payload).base64(hmac)
 *   payload = `school_admin:<adminId>:<schoolId>:<pwdHash>:<timestamp>`
 *   hmac    = HMAC-SHA256(payload, SESSION_SECRET) lấy 32 ký tự hex đầu
 *
 * Tương thích ngược: token cũ (base64 thuần, không có dấu `.`) vẫn được chấp nhận
 * để không làm văng phiên người dùng đang đăng nhập khi nâng cấp. Có thể tắt
 * hoàn toàn chế độ này bằng biến môi trường `SESSION_STRICT=on` sau khi mọi
 * người dùng đã đăng nhập lại.
 */

function secret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.SYSTEM_ADMIN_SECRET ||
    "sec_super_admin_system_key_2026"
  );
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex").slice(0, 32);
}

/** Tạo token đã ký cho một phiên School Admin. */
export function createSchoolAdminToken(input: {
  adminId: string;
  schoolId: string;
  pwdHash: string;
}): string {
  const payload = `school_admin:${input.adminId}:${input.schoolId}:${input.pwdHash}:${Date.now()}`;
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(payload);
  return `${payloadB64}.${signature}`;
}

export interface DecodedSchoolAdminToken {
  payload: string;
  segments: string[];
  /** true nếu token có chữ ký hợp lệ, false nếu là token cũ không ký. */
  signed: boolean;
}

/**
 * Giải mã token School Admin và kiểm tra chữ ký.
 * Trả về `null` nếu token hỏng, sai chữ ký, hoặc không đúng định dạng tối thiểu.
 */
export function decodeSchoolAdminToken(token: string): DecodedSchoolAdminToken | null {
  if (!token) return null;

  const isSigned = token.includes(".");
  const strict = (process.env.SESSION_STRICT || "").toLowerCase() === "on";
  if (!isSigned && strict) return null;

  let payload: string;
  if (isSigned) {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;
    try {
      payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    } catch {
      return null;
    }
    const expected = sign(payload);
    if (expected !== signature) {
      log.warn("Token School Admin có chữ ký không hợp lệ", {});
      return null;
    }
  } else {
    try {
      payload = Buffer.from(token, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  const segments = payload.split(":");
  if (segments.length < 4 || segments[0] !== "school_admin") return null;

  return { payload, segments, signed: isSigned };
}
