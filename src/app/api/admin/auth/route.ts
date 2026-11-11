import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// API Đăng nhập cho Quản trị viên của từng trường học
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();

    if (body.action === "logout") {
      const response = NextResponse.json({ success: true, message: "Đã đăng xuất thành công!" });
      response.cookies.set("admin_session_token", "", {
        path: "/",
        maxAge: 0,
        expires: new Date(0),
      });
      return response;
    }

    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập và mật khẩu!" },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check school admin in database kèm thông tin vai trò & phân quyền
    const adminRes = await db.execute({
      sql: `
        SELECT a.id, a.school_id, a.username, a.full_name, a.password, a.phone, a.role_id, a.is_active, a.is_owner,
               s.name as school_name, s.code as school_code, s.address as school_address, s.phone as school_phone,
               r.name as role_name, r.permissions_json
        FROM school_admins a
        JOIN schools s ON a.school_id = s.id
        LEFT JOIN admin_roles r ON a.role_id = r.id
        WHERE LOWER(a.username) = ? AND a.password = ?
      `,
      args: [cleanUser, cleanPass],
    });

    if (adminRes.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tên đăng nhập hoặc mật khẩu không chính xác! Vui lòng kiểm tra tài khoản được hệ thống cấp.",
        },
        { status: 401 }
      );
    }

    const admin = adminRes.rows[0];

    // Kiểm tra tài khoản có bị khóa không
    if (admin.is_active !== undefined && admin.is_active !== null && Number(admin.is_active) === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Tài khoản của bạn đã bị tạm khóa! Vui lòng liên hệ Quản lý cơ sở để được kích hoạt lại.",
        },
        { status: 403 }
      );
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
      // Nhân viên không phải chủ cơ sở và chưa được phân vai trò -> KHÔNG cấp quyền wildcard
      permissions = [];
    }

    const token = Buffer.from(
      `school_admin:${admin.id}:${admin.school_id}:${Date.now()}`
    ).toString("base64");

    const response = NextResponse.json({
      success: true,
      message: `Chào mừng ${admin.full_name} đăng nhập thành công!`,
      token: token,
      admin: {
        id: String(admin.id),
        username: String(admin.username),
        full_name: String(admin.full_name),
        phone: admin.phone ? String(admin.phone) : "",
        role_id: admin.role_id ? String(admin.role_id) : "",
        role_name: admin.is_owner === 1 ? "Chủ Cơ Sở (Toàn quyền)" : admin.role_name ? String(admin.role_name) : "Nhân viên",
        is_owner: Number(admin.is_owner ?? 0),
        permissions,
        school_id: String(admin.school_id),
        school_name: String(admin.school_name),
        school_code: String(admin.school_code),
        school_address: String(admin.school_address || ""),
        school_phone: String(admin.school_phone || ""),
      },
    });

    response.cookies.set("admin_session_token", token, {
      httpOnly: false,
      secure: false, // Luôn cho phép chạy cả trên HTTP IP Server LAN/VPS lẫn HTTPS
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: unknown) {
    console.error("Admin Auth Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
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

    if (!token) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 4 || parts[0] !== "school_admin") {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const adminId = parts[1];
    const adminRes = await db.execute({
      sql: `
        SELECT a.id, a.school_id, a.username, a.full_name, a.phone, a.role_id, a.is_active, a.is_owner,
               s.name as school_name, s.code as school_code, s.address as school_address, s.phone as school_phone,
               r.name as role_name, r.permissions_json
        FROM school_admins a
        JOIN schools s ON a.school_id = s.id
        LEFT JOIN admin_roles r ON a.role_id = r.id
        WHERE a.id = ?
      `,
      args: [adminId],
    });

    if (adminRes.rows.length === 0) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const admin = adminRes.rows[0];

    // Chặn nếu tài khoản bị khóa trong thời gian phiên làm việc
    if (admin.is_active !== undefined && admin.is_active !== null && Number(admin.is_active) === 0) {
      return NextResponse.json({ success: false, authenticated: false, message: "Tài khoản đã bị tạm khóa!" }, { status: 403 });
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
      // Nhân viên không phải chủ cơ sở và chưa được phân vai trò -> KHÔNG cấp quyền wildcard
      permissions = [];
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      admin: {
        id: String(admin.id),
        username: String(admin.username),
        full_name: String(admin.full_name),
        phone: admin.phone ? String(admin.phone) : "",
        role_id: admin.role_id ? String(admin.role_id) : "",
        role_name: admin.is_owner === 1 ? "Chủ Cơ Sở (Toàn quyền)" : admin.role_name ? String(admin.role_name) : "Nhân viên",
        is_owner: Number(admin.is_owner ?? 0),
        permissions,
        school_id: String(admin.school_id),
        school_name: String(admin.school_name),
        school_code: String(admin.school_code),
        school_address: String(admin.school_address || ""),
        school_phone: String(admin.school_phone || ""),
      },
    });
  } catch {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }
}
