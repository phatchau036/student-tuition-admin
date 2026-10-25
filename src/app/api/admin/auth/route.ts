import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// API Đăng nhập cho Quản trị viên của từng trường học
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên đăng nhập và mật khẩu!" },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Check school admin in database
    const adminRes = await db.execute({
      sql: `
        SELECT a.id, a.school_id, a.username, a.full_name, a.password,
               s.name as school_name, s.code as school_code, s.address as school_address, s.phone as school_phone
        FROM school_admins a
        JOIN schools s ON a.school_id = s.id
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
        school_id: String(admin.school_id),
        school_name: String(admin.school_name),
        school_code: String(admin.school_code),
        school_address: String(admin.school_address || ""),
        school_phone: String(admin.school_phone || ""),
      },
    });

    response.cookies.set("admin_session_token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
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
        SELECT a.id, a.school_id, a.username, a.full_name,
               s.name as school_name, s.code as school_code, s.address as school_address, s.phone as school_phone
        FROM school_admins a
        JOIN schools s ON a.school_id = s.id
        WHERE a.id = ?
      `,
      args: [adminId],
    });

    if (adminRes.rows.length === 0) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const admin = adminRes.rows[0];
    return NextResponse.json({
      success: true,
      authenticated: true,
      admin: {
        id: String(admin.id),
        username: String(admin.username),
        full_name: String(admin.full_name),
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
