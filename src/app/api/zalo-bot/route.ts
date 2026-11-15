import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

const ZALO_BOT_BASE_URL = "https://bot-api.zapps.me";

// POST /api/zalo-bot - Kiểm tra thông tin Bot (getMe) hoặc Gửi tin nhắn tự động (sendMessage)
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, bot_token, chat_id, text, school_id } = body;

    const currentSchoolId = school_id || getSchoolIdFromRequest(req) || "school-default";

    // Lấy token từ body hoặc từ trường cụ thể hoặc từ bảng settings
    let token = bot_token?.trim();
    if (!token && currentSchoolId) {
      try {
        const scRes = await db.execute({
          sql: "SELECT zalo_bot_token FROM schools WHERE id = ? LIMIT 1",
          args: [currentSchoolId],
        });
        if (scRes.rows.length > 0 && scRes.rows[0].zalo_bot_token) {
          token = String(scRes.rows[0].zalo_bot_token).trim();
        }
      } catch {}
    }

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
          // Lưu tên bot vào settings nếu lấy được (ưu tiên display_name hoặc first_name/username)
          const botResult = data.result || {};
          const bName =
            botResult.display_name ||
            [botResult.first_name, botResult.last_name].filter(Boolean).join(" ") ||
            botResult.username ||
            botResult.account_name ||
            "";

          if (bName) {
            await db.execute({
              sql: "INSERT INTO settings (key, value) VALUES ('zalo_bot_name', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
              args: [bName, bName],
            });
          }

          return NextResponse.json({
            success: true,
            message: `Kết nối thành công tới Zalo Bot: ${bName || "Zalo Bot"}!`,
            data: botResult,
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

    // 3. Action: Get recent updates to find Chat IDs (getUpdates)
    if (action === "get_updates" || action === "get_recent_chats") {
      try {
        // Lấy thông tin bot trước để hỗ trợ hướng dẫn người dùng
        let botAccountName = "";
        let botDisplayName = "";
        try {
          const meUrl = `${ZALO_BOT_BASE_URL}/bot${token}/getMe`;
          const meRes = await fetch(meUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const meData = await meRes.json();
          if (meData.ok && meData.result) {
            botAccountName = meData.result.account_name || "";
            botDisplayName = meData.result.display_name || meData.result.first_name || "";
          }
        } catch {}

        // 1. Ưu tiên kiểm tra tin nhắn inbound đã được Webhook tiếp nhận vào CSDL của trường này
        let inboundChats: Array<{ chat_id: string; from_name: string; text: string; date: number }> = [];
        try {
          const inboundRes = await db.execute({
            sql: `SELECT chat_id, from_name, message_text, unixepoch(received_at) as date 
                  FROM zalo_inbound_messages 
                  WHERE school_id = ? OR school_id = 'school-default' OR ? = 'school-default'
                  ORDER BY received_at DESC LIMIT 50`,
            args: [currentSchoolId, currentSchoolId],
          });
          inboundChats = inboundRes.rows.map((r) => ({
            chat_id: String(r.chat_id),
            from_name: String(r.from_name),
            text: String(r.message_text || ""),
            date: Number(r.date || 0) * 1000,
          }));
        } catch {}

        if (inboundChats.length > 0) {
          return NextResponse.json({
            success: true,
            message: `Tìm thấy ${inboundChats.length} cuộc trò chuyện gần đây qua Webhook của trường!`,
            recent_chats: inboundChats,
            bot_info: {
              account_name: botAccountName,
              display_name: botDisplayName,
            },
          });
        }

        const url = `${ZALO_BOT_BASE_URL}/bot${token}/getUpdates`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 50, timeout: 5 }),
        });

        const data = await res.json();
        if (data.ok) {
          const chatsMap: Record<
            string,
            { chat_id: string; from_name: string; text: string; date: number }
          > = {};

          const updateList = Array.isArray(data.result) ? data.result : [];
          for (const update of updateList) {
            const msg = update?.message || update?.edited_message;
            if (msg && msg.chat?.id) {
              const cid = String(msg.chat.id);
              const fname =
                [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") ||
                msg.from?.username ||
                "Người dùng Zalo";
              chatsMap[cid] = {
                chat_id: cid,
                from_name: fname,
                text: String(msg.text || ""),
                date: Number(msg.date || 0),
              };
            }
          }

          const recentChats = Object.values(chatsMap).sort((a, b) => b.date - a.date);

          return NextResponse.json({
            success: true,
            message: recentChats.length > 0 
              ? `Tìm thấy ${recentChats.length} cuộc trò chuyện gần đây với Bot!`
              : "Chưa có tin nhắn nào trong hộp thư của Bot. Vui lòng nhắn tin cho Bot trước.",
            recent_chats: recentChats,
            bot_info: {
              account_name: botAccountName,
              display_name: botDisplayName,
            },
          });
        } else {
          // Xử lý các mã lỗi phổ biến từ Zalo Bot Platform (VD: error_code 408 Request timeout khi chưa có tin nhắn)
          if (data.error_code === 408 || String(data.description).toLowerCase().includes("timeout")) {
            return NextResponse.json({
              success: true,
              message: "Chưa có tin nhắn mới nào gửi tới Bot.",
              recent_chats: [],
              is_timeout: true,
              bot_info: {
                account_name: botAccountName,
                display_name: botDisplayName,
              },
            });
          }

          return NextResponse.json({
            success: false,
            message: data.description || "Không thể lấy danh sách tin nhắn từ Zalo Bot",
            data,
            bot_info: {
              account_name: botAccountName,
              display_name: botDisplayName,
            },
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          message: `Lỗi kết nối tới Zalo Bot getUpdates: ${err.message}`,
        });
      }
    }

    // 4. Action: Test admin notification message (test_admin_message)
    if (action === "test_admin_message") {
      const adminChatId = String(body.admin_chat_id || chat_id || "").trim();
      if (!adminChatId) {
        return NextResponse.json(
          {
            success: false,
            message: "Vui lòng nhập Zalo Chat ID của Admin trước khi thử gửi!",
          },
          { status: 400 }
        );
      }

      const testContent =
        text ||
        `🔔 [XÁC NHẬN KẾT NỐI ZALO BOT]
Chúc mừng bạn! Zalo Bot đã kết nối thành công với tài khoản Admin của bạn.
Từ bây giờ, bạn sẽ nhận được thông báo tức thì trên Zalo mỗi khi:
• Có tiền học phí về tài khoản (SePay)
• Học sinh nộp đơn báo nghỉ học
• Giáo viên gửi đơn xin nghỉ dạy
• Phụ huynh gửi góp ý / đánh giá chất lượng`;

      const url = `${ZALO_BOT_BASE_URL}/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: testContent.trim().slice(0, 2000),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        return NextResponse.json({
          success: true,
          message: "Đã gửi tin nhắn thử nghiệm thành công tới Zalo Admin! Vui lòng kiểm tra ứng dụng Zalo của bạn.",
          data: data.result,
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: `Zalo Bot báo lỗi: ${data.description || "Không thể gửi tin nhắn tới Chat ID này"} (Mã: ${data.error_code})`,
            data,
          },
          { status: 400 }
        );
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
