import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { current_password, new_password, confirm_password, admin_id } = body;

    // Check token from headers or cookie if admin_id not provided
    let targetAdminId = admin_id;

    if (!targetAdminId) {
      const authHeader = req.headers.get("authorization");
      const cookieHeader = req.headers.get("cookie");

      let token = "";
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (cookieHeader) {
        const match = cookieHeader.match(/admin_session_token=([^;]+)/);
        if (match) token = match[1];
      }

      if (token) {
        try {
          const decoded = Buffer.from(token, "base64").toString("utf-8");
          const parts = decoded.split(":");
          if (parts[0] === "school_admin" && parts[1]) {
            targetAdminId = parts[1];
          }
        } catch {}
      }
    }

    if (!targetAdminId) {
      return NextResponse.json(
        { success: false, message: "Vui lòng đăng nhập lại để đổi mật khẩu!" },
        { status: 401 }
      );
    }

    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới!" },
        { status: 400 }
      );
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu mới và xác nhận mật khẩu không trùng khớp!" },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu mới phải có ít nhất 6 ký tự!" },
        { status: 400 }
      );
    }

    // Verify current password
    const adminCheck = await db.execute({
      sql: "SELECT id, password FROM school_admins WHERE id = ?",
      args: [targetAdminId],
    });

    if (adminCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy tài khoản quản trị viên!" },
        { status: 404 }
      );
    }

    const currentSavedPass = String(adminCheck.rows[0].password);
    if (currentSavedPass !== current_password) {
      return NextResponse.json(
        { success: false, message: "Mật khẩu hiện tại không chính xác!" },
        { status: 400 }
      );
    }

    // Update password
    await db.execute({
      sql: "UPDATE school_admins SET password = ? WHERE id = ?",
      args: [new_password, targetAdminId],
    });

    return NextResponse.json({
      success: true,
      message: "Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.",
    });
  } catch (error: unknown) {
    console.error("Change Password Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
