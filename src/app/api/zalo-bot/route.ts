import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

const ZALO_BOT_BASE_URL = "https://bot-api.zapps.me";

// POST /api/zalo-bot - Kiểm tra thông tin Bot (getMe) hoặc Gửi tin nhắn tự động (sendMessage)
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, bot_token, chat_id, text } = body;

    // Lấy token từ body hoặc từ bảng settings
    let token = bot_token?.trim();
    if (!token) {
      const tokenRes = await db.execute("SELECT value FROM settings WHERE key = 'zalo_bot_token'");
      if (tokenRes.rows.length > 0) {
        token = String(tokenRes.rows[0].value).trim();
      }
    }

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Chưa cấu hình Zalo Bot Token! Vui lòng vào Cài Đặt > Nhắc Zalo để nhập Bot Token.",
        },
        { status: 400 }
      );
    }

    // 1. Action: Test connection (getMe)
    if (action === "test_connection" || action === "get_me") {
      try {
        const url = `${ZALO_BOT_BASE_URL}/bot${token}/getMe`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();
        if (data.ok) {
          // Lưu tên bot vào settings nếu lấy được
          if (data.result?.first_name || data.result?.username) {
            const bName = data.result?.first_name || data.result?.username;
            await db.execute({
              sql: "INSERT INTO settings (key, value) VALUES ('zalo_bot_name', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
              args: [bName, bName],
            });
          }

          return NextResponse.json({
            success: true,
            message: `Kết nối thành công tới Zalo Bot: ${data.result?.first_name || data.result?.username || "Zalo Bot"}!`,
            data: data.result,
          });
        } else {
          return NextResponse.json({
            success: false,
            message: `Mã lỗi từ Zalo: ${data.description || data.error_code || "Bot Token không hợp lệ!"}`,
            data,
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `Lỗi kết nối tới Zalo Bot API: ${err.message}`,
        });
      }
    }

    // 2. Action: Send message (sendMessage)
    if (action === "send_message") {
      if (!chat_id || !String(chat_id).trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Học sinh chưa có Zalo Chat ID! Phụ huynh cần nhắn tin chào Bot trước để nhận ID cuộc trò chuyện.",
          },
          { status: 400 }
        );
      }

      if (!text || !text.trim()) {
        return NextResponse.json({ success: false, message: "Nội dung tin nhắn không được để trống!" }, { status: 400 });
      }

      const url = `${ZALO_BOT_BASE_URL}/bot${token}/sendMessage`;
      const payload = {
        chat_id: String(chat_id).trim(),
        text: text.trim().slice(0, 2000),
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        return NextResponse.json({
          success: true,
          message: "Đã gửi tin nhắn nhắc học phí tự động qua Zalo Bot thành công!",
          data: data.result,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: `Zalo Bot báo lỗi: ${data.description || "Không thể gửi tin nhắn"} (Mã: ${data.error_code})`,
          data,
        });
      }
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Zalo Bot API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
