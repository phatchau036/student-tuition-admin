import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    const envUsername = process.env.SYSTEM_ADMIN_USERNAME || "hethong";
    const envPassword = process.env.SYSTEM_ADMIN_PASSWORD || "hethong@2026";
    const secretKey = process.env.SYSTEM_ADMIN_SECRET || "sec_super_admin_system_key_2026";

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tài khoản và mật khẩu hệ thống!" },
        { status: 400 }
      );
    }

    if (username.trim() === envUsername && password.trim() === envPassword) {
      // Create session token
      const token = Buffer.from(`${username.trim()}:${secretKey}:${Date.now()}`).toString("base64");

      const response = NextResponse.json({
        success: true,
        message: "Đăng nhập Chủ Hệ Thống thành công!",
        token: token,
        user: {
          username: envUsername,
          role: "SUPER_ADMIN",
        },
      });

      // Set cookie for browser
      response.cookies.set("system_auth_token", token, {
        httpOnly: false,
        secure: false, // Luôn cho phép chạy cả trên HTTP IP Server LAN/VPS lẫn HTTPS
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: "Tài khoản hoặc mật khẩu hệ thống không chính xác!" },
      { status: 401 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/system_auth_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }

    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const secretKey = process.env.SYSTEM_ADMIN_SECRET || "sec_super_admin_system_key_2026";
    const envUsername = process.env.SYSTEM_ADMIN_USERNAME || "hethong";

    if (decoded.includes(secretKey) && decoded.startsWith(envUsername)) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: { username: envUsername, role: "SUPER_ADMIN" },
      });
    }

    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }
}
