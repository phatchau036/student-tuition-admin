import { NextResponse } from "next/server";
import { getDb, initDb } from "./db";

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
let domainCache: Map<string, { school_id: string; expires_at: number }> = new Map();

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
  } catch {}

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
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length >= 3 && parts[0] === "school_admin" && parts[2]) {
        return parts[2];
      }
    }

    const url = new URL(req.url);
    const querySchoolId = url.searchParams.get("school_id");
    if (querySchoolId && querySchoolId.trim()) {
      return querySchoolId.trim();
    }
  } catch {}

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

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 4 || parts[0] !== "school_admin") {
      return null;
    }

    const adminId = parts[1];
    const adminRes = await db.execute({
      sql: `
        SELECT a.id, a.school_id, a.username, a.full_name, a.phone, a.role_id, a.is_active, a.is_owner,
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
    if (admin.is_active !== undefined && admin.is_active !== null && Number(admin.is_active) === 0) {
      return null;
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
      } catch {}
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
      role_name: admin.is_owner === 1 ? "Chủ Cơ Sở (Toàn quyền)" : admin.role_name ? String(admin.role_name) : "Nhân viên",
      permissions,
    };
  } catch {
    return null;
  }
}

/**
 * Kiểm tra quyền hạn của Admin trước khi thực hiện các API nhạy cảm.
 * Chủ cơ sở (is_owner === 1 hoặc permissions bao gồm "*") luôn được phép.
 */
export async function requireAdminPermission(
  req: Request,
  permKey: string
): Promise<{ authorized: boolean; admin?: RequestAdminContext; errorResponse?: NextResponse }> {
  const admin = await getAdminFromRequest(req);
  if (!admin) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn! Vui lòng đăng nhập lại." },
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
