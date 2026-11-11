import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import fs from "fs";
import path from "path";

async function getSystemCredentials() {
  await initDb();
  const db = getDb();
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
  return { username, password, secretKey };
}

function syncEnvFile(newUsername: string, newPassword: string) {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      if (content.includes("SYSTEM_ADMIN_USERNAME=")) {
        content = content.replace(/SYSTEM_ADMIN_USERNAME=.*/g, `SYSTEM_ADMIN_USERNAME=${newUsername}`);
      } else {
        content += `\nSYSTEM_ADMIN_USERNAME=${newUsername}`;
      }
      if (content.includes("SYSTEM_ADMIN_PASSWORD=")) {
        content = content.replace(/SYSTEM_ADMIN_PASSWORD=.*/g, `SYSTEM_ADMIN_PASSWORD=${newPassword}`);
      } else {
        content += `\nSYSTEM_ADMIN_PASSWORD=${newPassword}`;
      }
      fs.writeFileSync(envPath, content, "utf-8");
    }
  } catch (err) {
    console.error("Could not sync .env file:", err);
  }
}

// POST /api/system/auth: Đăng nhập hoặc Đổi tài khoản/mật khẩu hệ thống
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // Xử lý đổi tài khoản & mật khẩu hệ thống
    if (action === "change_credentials") {
      return await handleChangeCredentials(body);
    }

    // Đăng nhập hệ thống thông thường
    const { username, password } = body;
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tài khoản và mật khẩu hệ thống!" },
        { status: 400 }
      );
    }

    const creds = await getSystemCredentials();

    if (username.trim() === creds.username && password.trim() === creds.password) {
      // Create session token
      const token = Buffer.from(`${creds.username}:${creds.secretKey}:${Date.now()}`).toString("base64");

      const response = NextResponse.json({
        success: true,
        message: "Đăng nhập Chủ Hệ Thống thành công!",
        token: token,
        user: {
          username: creds.username,
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

// PUT /api/system/auth: Đổi tài khoản & mật khẩu hệ thống
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    return await handleChangeCredentials(body);
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function handleChangeCredentials(body: any) {
  const { current_password, new_username, new_password, confirm_password } = body;

  if (!current_password || !new_username || !new_password || !confirm_password) {
    return NextResponse.json(
      { success: false, message: "Vui lòng nhập đầy đủ mật khẩu hiện tại, tên tài khoản mới và mật khẩu mới!" },
      { status: 400 }
    );
  }

  const cleanNewUsername = String(new_username).trim();
  const cleanNewPassword = String(new_password).trim();

  if (cleanNewUsername.length < 3) {
    return NextResponse.json(
      { success: false, message: "Tên tài khoản mới phải có ít nhất 3 ký tự!" },
      { status: 400 }
    );
  }

  if (cleanNewPassword.length < 6) {
    return NextResponse.json(
      { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" },
      { status: 400 }
    );
  }

  if (cleanNewPassword !== String(confirm_password).trim()) {
    return NextResponse.json(
      { success: false, message: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!" },
      { status: 400 }
    );
  }

  const creds = await getSystemCredentials();

  if (String(current_password).trim() !== creds.password) {
    return NextResponse.json(
      { success: false, message: "Mật khẩu hiện tại của hệ thống không chính xác!" },
      { status: 400 }
    );
  }

  // Cập nhật vào bảng settings trong database
  await initDb();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO settings (key, value) VALUES ('system_admin_username', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [cleanNewUsername],
  });
  await db.execute({
    sql: `INSERT INTO settings (key, value) VALUES ('system_admin_password', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [cleanNewPassword],
  });

  // Đồng bộ file .env nếu có
  syncEnvFile(cleanNewUsername, cleanNewPassword);

  // Tạo token mới
  const token = Buffer.from(`${cleanNewUsername}:${creds.secretKey}:${Date.now()}`).toString("base64");

  const response = NextResponse.json({
    success: true,
    message: "Đã cập nhật tài khoản và mật khẩu Chủ Hệ Thống thành công!",
    token: token,
    user: {
      username: cleanNewUsername,
      role: "SUPER_ADMIN",
    },
  });

  response.cookies.set("system_auth_token", token, {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
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
    const creds = await getSystemCredentials();

    if (decoded.includes(creds.secretKey) && decoded.startsWith(creds.username)) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        user: { username: creds.username, role: "SUPER_ADMIN" },
      });
    }

    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
  }
}
