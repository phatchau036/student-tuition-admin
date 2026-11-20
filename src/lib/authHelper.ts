import { NextResponse } from "next/server";
import { getDb, initDb } from "./db";
import crypto from "crypto";
import { decodeSchoolAdminToken } from "@/lib/sessionToken";

export function getPwdHash(pwd: string): string {
  return crypto.createHash("sha256").update(pwd).digest("hex").slice(0, 16);
}

export interface RequestAdminContext {
  id: string;
  school_id: string;
  username: string;
  full_name: string;
  phone?: string;
  is_owner: number;
  role_id: string | null;
  role_name?: string;
  permissions: string[];
}

// In-memory cache map domain/subdomain -> school_id để xử lý siêu tốc mọi request
const domainCache: Map<string, { school_id: string; expires_at: number }> = new Map();

export async function resolveSchoolIdByHost(host: string | null): Promise<string | null> {
  if (!host) return null;
  const cleanHost = host.split(":")[0].toLowerCase().trim();
  if (!cleanHost || cleanHost === "localhost" || cleanHost === "127.0.0.1" || cleanHost === "::1") {
    return null;
  }

  const now = Date.now();
  const cached = domainCache.get(cleanHost);
  if (cached && cached.expires_at > now) {
    return cached.school_id;
  }

  try {
    await initDb();
    const db = getDb();

    // 1. Kiểm tra khớp chính xác custom domain (VD: edu.trungtamhongan.vn)
    const domainRes = await db.execute({
      sql: "SELECT id FROM schools WHERE LOWER(domain) = ? LIMIT 1",
      args: [cleanHost],
    });
    if (domainRes.rows.length > 0 && domainRes.rows[0].id) {
      const sId = String(domainRes.rows[0].id);
      domainCache.set(cleanHost, { school_id: sId, expires_at: now + 60000 });
      return sId;
    }

    // 2. Kiểm tra subdomain (VD: hongan.phanmem.vn -> subdomain là "hongan")
    const subPart = cleanHost.split(".")[0];
    if (subPart && subPart !== "www") {
      const subRes = await db.execute({
        sql: "SELECT id FROM schools WHERE LOWER(subdomain) = ? LIMIT 1",
        args: [subPart],
      });
      if (subRes.rows.length > 0 && subRes.rows[0].id) {
        const sId = String(subRes.rows[0].id);
        domainCache.set(cleanHost, { school_id: sId, expires_at: now + 60000 });
        return sId;
      }
    }
  } catch {
    /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
  }

  return null;
}

export function clearDomainCache() {
  domainCache.clear();
}

export function getSchoolIdFromRequest(req: Request): string {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    const customHeader = req.headers.get("x-school-id");

    if (customHeader && customHeader.trim()) {
      return customHeader.trim();
    }

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/admin_session_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      const decoded = decodeSchoolAdminToken(token);
      if (decoded && decoded.segments[2]) {
        return decoded.segments[2];
      }
    }

    const url = new URL(req.url);
    const querySchoolId = url.searchParams.get("school_id");
    if (querySchoolId && querySchoolId.trim()) {
      return querySchoolId.trim();
    }
  } catch {
    /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
  }

  return "school-default";
}

/**
 * Trích xuất và xác thực thông tin Quản trị viên cơ sở / Nhân viên từ Token trong Request
 */
export async function getAdminFromRequest(req: Request): Promise<RequestAdminContext | null> {
  try {
    await initDb();
    const db = getDb();
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/admin_session_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) return null;

    const decoded = decodeSchoolAdminToken(token);
    if (!decoded) return null;
    const parts = decoded.segments;

    const adminId = parts[1];
    const adminRes = await db.execute({
      sql: `
        SELECT a.id, a.school_id, a.username, a.password, a.full_name, a.phone, a.role_id, a.is_active, a.is_owner,
               r.name as role_name, r.permissions_json
        FROM school_admins a
        LEFT JOIN admin_roles r ON a.role_id = r.id
        WHERE a.id = ?
      `,
      args: [adminId],
    });

    if (adminRes.rows.length === 0) return null;
    const admin = adminRes.rows[0];

    // Chặn nếu tài khoản bị khóa
    if (
      admin.is_active !== undefined &&
      admin.is_active !== null &&
      Number(admin.is_active) === 0
    ) {
      return null;
    }

    // Bảo vệ phiên: Nếu token có chứa pwdHash (parts.length >= 5: school_admin:id:school_id:pwdHash:timestamp)
    // thì kiểm tra so khớp mật khẩu hiện tại trong DB. Nếu mật khẩu đã bị đổi -> hủy phiên tức thì
    if (parts.length >= 5) {
      const tokenPwdHash = parts[3];
      const currentPwdHash = getPwdHash(String(admin.password || ""));
      if (tokenPwdHash !== currentPwdHash) {
        return null;
      }
    }

    let permissions: string[] = [];
    if (admin.is_owner === 1) {
      permissions = ["*"];
    } else if (admin.role_id) {
      try {
        if (admin.permissions_json) {
          const parsed = JSON.parse(String(admin.permissions_json));
          if (Array.isArray(parsed)) permissions = parsed;
        }
      } catch {
        /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
      }
    } else {
      // Nhân viên không có vai trò -> không có quyền
      permissions = [];
    }

    return {
      id: String(admin.id),
      school_id: String(admin.school_id),
      username: String(admin.username),
      full_name: String(admin.full_name),
      phone: admin.phone ? String(admin.phone) : "",
      is_owner: Number(admin.is_owner ?? 0),
      role_id: admin.role_id ? String(admin.role_id) : null,
      role_name:
        admin.is_owner === 1
          ? "Chủ Cơ Sở (Toàn quyền)"
          : admin.role_name
            ? String(admin.role_name)
            : "Nhân viên",
      permissions,
    };
  } catch {
    return null;
  }
}

/**
 * Phân giải `school_id` đáng tin cậy cho một request đã xác thực.
 *
 * Chống cross-tenant: header `x-school-id` / query `?school_id` chỉ được chấp nhận
 * khi nằm trong phạm vi tổ chức của tài khoản (cơ sở gốc hoặc chi nhánh cùng
 * `parent_school_id`). Mọi giá trị lạ đều bị bỏ qua và rơi về `admin.school_id`.
 */
export async function resolveSchoolScopeForAdmin(
  req: Request,
  admin: RequestAdminContext
): Promise<string> {
  const requested = (() => {
    const header = req.headers.get("x-school-id");
    if (header && header.trim()) return header.trim();
    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("school_id");
      if (query && query.trim()) return query.trim();
    } catch {
      /* Bỏ qua có chủ đích: URL không hợp lệ thì dùng school mặc định của admin. */
    }
    return "";
  })();

  if (!requested || requested === admin.school_id) return admin.school_id;

  try {
    const db = getDb();
    const targetRes = await db.execute({
      sql: "SELECT id, parent_school_id FROM schools WHERE id = ? LIMIT 1",
      args: [requested],
    });
    if (targetRes.rows.length === 0) return admin.school_id;

    const adminRes = await db.execute({
      sql: "SELECT parent_school_id FROM schools WHERE id = ? LIMIT 1",
      args: [admin.school_id],
    });

    const targetParent = targetRes.rows[0].parent_school_id
      ? String(targetRes.rows[0].parent_school_id)
      : null;
    const adminParent =
      adminRes.rows.length > 0 && adminRes.rows[0].parent_school_id
        ? String(adminRes.rows[0].parent_school_id)
        : null;

    // Cùng một tổ chức: cùng parent_school_id, hoặc một bên là gốc của bên kia.
    const rootOfAdmin = adminParent || admin.school_id;
    const rootOfTarget = targetParent || requested;

    if (rootOfAdmin === rootOfTarget) return requested;
  } catch {
    /* Bỏ qua có chủ đích: lỗi truy vấn thì giữ phạm vi an toàn của admin. */
  }

  return admin.school_id;
}

/**
 * Kiểm tra quyền hạn của Admin trước khi thực hiện các API nhạy cảm.
 * Chủ cơ sở (is_owner === 1 hoặc permissions bao gồm "*") luôn được phép.
 */
export async function getSystemAdminFromRequest(
  req: Request
): Promise<{ username: string; role: string } | null> {
  try {
    await initDb();
    const db = getDb();
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/system_auth_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) return null;

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 4) return null;

    const [tokenUsername, tokenPwdHash, tokenSecret] = parts;

    // Lấy thông tin tài khoản hệ thống hiện tại
    const res = await db.execute(
      "SELECT key, value FROM settings WHERE key IN ('system_admin_username', 'system_admin_password')"
    );
    let username = process.env.SYSTEM_ADMIN_USERNAME || "hethong";
    let password = process.env.SYSTEM_ADMIN_PASSWORD || "hethong@2026";

    for (const r of res.rows) {
      if (r.key === "system_admin_username" && r.value) username = String(r.value);
      if (r.key === "system_admin_password" && r.value) password = String(r.value);
    }

    const secretKey = process.env.SYSTEM_ADMIN_SECRET || "sec_super_admin_system_key_2026";
    const currentPwdHash = getPwdHash(password);

    if (
      tokenSecret === secretKey &&
      tokenUsername === username &&
      tokenPwdHash === currentPwdHash
    ) {
      return { username, role: "SUPER_ADMIN" };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Biến thể của `requireAdminPermission`: cho phép khi tài khoản có **ít nhất một**
 * trong các quyền được liệt kê. Dùng cho endpoint đọc dữ liệu phục vụ nhiều màn hình.
 */
export async function requireAnyAdminPermission(
  req: Request,
  permKeys: string[]
): Promise<{ authorized: boolean; admin?: RequestAdminContext; errorResponse?: NextResponse }> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại.",
        },
        { status: 401 }
      ),
    };
  }

  if (admin.is_owner === 1 || admin.permissions.includes("*")) {
    return { authorized: true, admin };
  }

  if (permKeys.some((key) => admin.permissions.includes(key))) {
    return { authorized: true, admin };
  }

  return {
    authorized: false,
    admin,
    errorResponse: NextResponse.json(
      {
        success: false,
        message: `Tài khoản "${admin.full_name}" không có quyền thực hiện thao tác này (cần một trong: ${permKeys.join(", ")})!`,
      },
      { status: 403 }
    ),
  };
}

export async function requireAdminPermission(
  req: Request,
  permKey: string
): Promise<{ authorized: boolean; admin?: RequestAdminContext; errorResponse?: NextResponse }> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại.",
        },
        { status: 401 }
      ),
    };
  }

  // Toàn quyền
  if (admin.is_owner === 1 || admin.permissions.includes("*")) {
    return { authorized: true, admin };
  }

  if (admin.permissions.includes(permKey)) {
    return { authorized: true, admin };
  }

  return {
    authorized: false,
    admin,
    errorResponse: NextResponse.json(
      {
        success: false,
        message: `Tài khoản "${admin.full_name}" không có quyền thực hiện thao tác này (${permKey})! Vui lòng liên hệ Quản lý cơ sở để được cấp quyền.`,
      },
      { status: 403 }
    ),
  };
}
