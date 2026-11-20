import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { askAiAssistant } from "@/lib/aiBrain";
import { resolveSchoolIdByHost } from "@/lib/authHelper";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/zalo-bot/webhook");

const ZALO_BOT_BASE_URL = "https://bot-api.zapps.me";

// POST /api/zalo-bot/webhook - Tiếp nhận tin nhắn từ Zalo Bot Platform
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();

    // 1. Xác định school_id: từ query params (?school_id=...), từ host/domain, hoặc fallback
    const url = new URL(req.url);
    const querySchoolId = url.searchParams.get("school_id")?.trim();
    const forwardedHost = req.headers.get("x-forwarded-host");
    const rawHost = forwardedHost || req.headers.get("host") || "";
    const domainSchoolId = await resolveSchoolIdByHost(rawHost);

    let targetSchoolId = querySchoolId || domainSchoolId || "";

    // 2. Lấy cấu hình Bot riêng biệt của trường (nếu có)
    let botToken = "";
    let adminChatId = "";
    let botName = "Zalo Bot";

    if (targetSchoolId) {
      try {
        const scRes = await db.execute({
          sql: "SELECT id, name, zalo_bot_token, zalo_bot_name, zalo_admin_chat_id FROM schools WHERE id = ? LIMIT 1",
          args: [targetSchoolId],
        });
        if (scRes.rows.length > 0) {
          const sc = scRes.rows[0];
          if (sc.zalo_bot_token) botToken = String(sc.zalo_bot_token).trim();
          if (sc.zalo_admin_chat_id) adminChatId = String(sc.zalo_admin_chat_id).trim();
          if (sc.zalo_bot_name || sc.name) botName = String(sc.zalo_bot_name || sc.name).trim();
        }
      } catch {}
    }

    // 3. Fallback lấy token bot từ bảng settings toàn cục nếu trường chưa có riêng
    if (!botToken) {
      const settingsRes = await db.execute(`
        SELECT key, value FROM settings 
        WHERE key IN ('zalo_bot_token', 'zalo_admin_chat_id', 'zalo_bot_name')
      `);

      for (const r of settingsRes.rows) {
        if (!botToken && r.key === "zalo_bot_token") botToken = String(r.value || "").trim();
        if (!adminChatId && r.key === "zalo_admin_chat_id") adminChatId = String(r.value || "").trim();
        if (r.key === "zalo_bot_name" && r.value) botName = String(r.value || "").trim();
      }
    }

    if (!targetSchoolId) {
      targetSchoolId = "school-default";
    }

    if (!botToken) {
      return NextResponse.json({ success: false, message: "Bot token not configured" });
    }

    const body = await req.json();
    /*
      Cấu trúc update từ Zalo Bot Platform:
      {
        "update_id": 123456,
        "message": {
          "message_id": 1,
          "from": { "id": 123456789, "first_name": "Phát", "last_name": "Châu" },
          "chat": { "id": 123456789, "type": "private" },
          "date": 1731140000,
          "text": "Doanh thu tháng này là bao nhiêu?"
        }
      }
    */
    const message = body.message || body.edited_message;
    if (!message || !message.text) {
      return NextResponse.json({ success: true, message: "Ignored non-text update" });
    }

    const chatId = String(message.chat?.id || message.from?.id || "");
    const userText = String(message.text || "").trim();
    const senderName =
      [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") ||
      message.from?.username ||
      "Người dùng";

    // 4. Lưu vết tin nhắn vào bảng zalo_inbound_messages để người quản lý bấm "Lấy Chat ID" là thấy ngay
    try {
      const msgId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await db.execute({
        sql: `INSERT INTO zalo_inbound_messages (id, school_id, chat_id, from_name, message_text)
              VALUES (?, ?, ?, ?, ?)`,
        args: [msgId, targetSchoolId, chatId, senderName, userText.slice(0, 500)],
      });
    } catch {}

    // 5. Kiểm tra xem người gửi có phải là Admin đã kết nối hay không
    const isAdmin = adminChatId && chatId === adminChatId;

    if (isAdmin) {
      // 🔔 ADMIN ĐANG CHAT VỚI BOT!
      // Chuyển cho AI phân tích dữ liệu cơ sở & cẩm nang tính năng web
      const aiReply = await askAiAssistant({
        userMessage: userText,
        schoolId: targetSchoolId,
        senderName,
        isZalo: true,
      });

      // Gửi câu trả lời của AI lại Zalo cho Admin
      const sendUrl = `${ZALO_BOT_BASE_URL}/bot${botToken}/sendMessage`;
      await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: aiReply,
        }),
      });

      return NextResponse.json({
        success: true,
        handled: "admin_ai_assistant",
        school_id: targetSchoolId,
        query: userText,
      });
    }

    // 6. Nếu không phải Admin (phụ huynh nhắn tin chào Bot)
    if (userText.toLowerCase().includes("hi") || userText.toLowerCase().includes("chào") || userText.startsWith("/")) {
      const welcomeMsg = `Xin chào ${senderName}!
Em là ${botName} - Trợ lý tự động của trung tâm.
Chat ID của bạn là: ${chatId}
(Bạn có thể cung cấp mã này cho trung tâm để nhận thông báo học phí tự động qua Zalo nhé).`;

      const sendUrl = `${ZALO_BOT_BASE_URL}/bot${botToken}/sendMessage`;
      await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMsg,
        }),
      });
    }

    return NextResponse.json({ success: true, handled: "guest_welcome", school_id: targetSchoolId });
  } catch (error: any) {
    log.error("Zalo Bot Webhook error:", { error: error });
    return NextResponse.json(
      { success: false, message: error.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}

// GET /api/zalo-bot/webhook - Xác thực webhook hoặc kiểm tra trạng thái
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Zalo Bot Webhook Endpoint is Active",
  });
}
