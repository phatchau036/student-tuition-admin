import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

const ZALO_BOT_BASE_URL = "https://bot-api.zapps.me";

// Helper lấy ngày hiện tại định dạng YYYY-MM-DD theo giờ Việt Nam
function getTodayDateStr(): string {
  try {
    const d = new Date();
    // UTC + 7
    const utc7 = new Date(d.getTime() + 7 * 3600 * 1000);
    return utc7.toISOString().slice(0, 10);
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// GET /api/admin/tuition-reminders?month=YYYY-MM - Lấy danh sách và trạng thái nhắc học phí
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "school-default";
    const todayStr = getTodayDateStr();

    const remindersRes = await db.execute({
      sql: `
        SELECT r.*, st.name as student_name, st.phone as student_phone, st.student_code, st.zalo_chat_id
        FROM tuition_reminders r
        LEFT JOIN students st ON r.student_id = st.id
        WHERE r.month = ? AND (r.school_id = ? OR r.school_id = 'school-default' OR ? = 'school-default')
        ORDER BY r.reminded_at DESC
      `,
      args: [month, schoolId, schoolId],
    });

    const remindersMap: Record<
      string,
      {
        student_id: string;
        last_reminded_at: string;
        remind_count: number;
        is_reminded_today: boolean;
        last_channel: "zalo_bot" | "zalo_manual";
        last_reminded_by?: string;
        history: Array<{
          id: string;
          amount: number;
          channel: string;
          reminded_at: string;
          reminded_by?: string;
          note?: string;
        }>;
      }
    > = {};

    let remindedTodayCount = 0;
    const remindedStudentIds = new Set<string>();

    for (const row of remindersRes.rows) {
      const studentId = String(row.student_id);
      const remindedAt = String(row.reminded_at || "");
      const remindedDate = remindedAt.slice(0, 10);
      const isToday = remindedDate === todayStr;

      if (!remindersMap[studentId]) {
        if (isToday) {
          remindedTodayCount++;
        }
        remindedStudentIds.add(studentId);

        remindersMap[studentId] = {
          student_id: studentId,
          last_reminded_at: remindedAt,
          remind_count: 1,
          is_reminded_today: isToday,
          last_channel: (row.channel as "zalo_bot" | "zalo_manual") || "zalo_manual",
          last_reminded_by: row.reminded_by ? String(row.reminded_by) : undefined,
          history: [
            {
              id: String(row.id),
              amount: Number(row.amount || 0),
              channel: String(row.channel || "zalo_manual"),
              reminded_at: remindedAt,
              reminded_by: row.reminded_by ? String(row.reminded_by) : undefined,
              note: row.note ? String(row.note) : undefined,
            },
          ],
        };
      } else {
        remindersMap[studentId].remind_count += 1;
        if (isToday) {
          remindersMap[studentId].is_reminded_today = true;
        }
        remindersMap[studentId].history.push({
          id: String(row.id),
          amount: Number(row.amount || 0),
          channel: String(row.channel || "zalo_manual"),
          reminded_at: remindedAt,
          reminded_by: row.reminded_by ? String(row.reminded_by) : undefined,
          note: row.note ? String(row.note) : undefined,
        });
      }
    }

    return NextResponse.json({
      success: true,
      month,
      today: todayStr,
      reminders_map: remindersMap,
      stats: {
        total_reminded_students: remindedStudentIds.size,
        reminded_today_count: remindedTodayCount,
        total_actions: remindersRes.rows.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/tuition-reminders error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi truy vấn lịch sử nhắc học phí" },
      { status: 500 }
    );
  }
}

// POST /api/admin/tuition-reminders - Ghi log hoặc Gửi tin nhắn Bot nhắc học phí
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action = "log", school_id, student_id, month, amount, channel = "zalo_manual", reminded_by, note, text, items } = body;

    const querySchoolId = school_id || getSchoolIdFromRequest(req) || "school-default";
    const currentMonth = month || new Date().toISOString().slice(0, 7);

    // 1. Ghi log nhắc học phí (thường dùng khi bấm nút "Gửi Zalo" mở chat)
    if (action === "log") {
      if (!student_id) {
        return NextResponse.json({ success: false, message: "Thiếu student_id!" }, { status: 400 });
      }

      const id = "remind-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      await db.execute({
        sql: `
          INSERT INTO tuition_reminders (id, school_id, student_id, month, amount, channel, reminded_by, note)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id,
          querySchoolId,
          String(student_id),
          currentMonth,
          Number(amount || 0),
          channel,
          reminded_by || "Lễ tân",
          note || "",
        ],
      });

      return NextResponse.json({
        success: true,
        message: "Đã lưu lịch sử nhắc học phí thành công!",
        data: {
          id,
          student_id,
          reminded_at: new Date().toISOString(),
          channel,
        },
      });
    }

    // 2. Gửi tin nhắn tự động qua Zalo Bot cho 1 học sinh
    if (action === "send_bot") {
      if (!student_id) {
        return NextResponse.json({ success: false, message: "Thiếu student_id!" }, { status: 400 });
      }

      // Lấy Zalo Chat ID của học sinh
      const studentRes = await db.execute({
        sql: "SELECT id, name, phone, zalo_chat_id FROM students WHERE id = ?",
        args: [student_id],
      });

      if (studentRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: "Không tìm thấy học sinh!" }, { status: 404 });
      }

      const st = studentRes.rows[0];
      const chatId = st.zalo_chat_id ? String(st.zalo_chat_id).trim() : "";
      if (!chatId) {
        return NextResponse.json(
          {
            success: false,
            message: "Học sinh này chưa có Zalo Chat ID! Vui lòng chọn gửi thủ công qua số điện thoại Zalo.",
          },
          { status: 400 }
        );
      }

      // Lấy Bot Token
      let botToken = "";
      const tokenRes = await db.execute("SELECT value FROM settings WHERE key = 'zalo_bot_token'");
      if (tokenRes.rows.length > 0) {
        botToken = String(tokenRes.rows[0].value).trim();
      }

      if (!botToken) {
        return NextResponse.json(
          {
            success: false,
            message: "Trung tâm chưa cấu hình Zalo Bot Token! Vui lòng vào Cài Đặt > Nhắc Zalo Bot để thiết lập.",
          },
          { status: 400 }
        );
      }

      const messageText = text || `Trung tâm thông báo học phí tháng ${currentMonth}: Số tiền cần đóng ${amount} đ.`;

      // Gửi request tới Zalo Bot API
      const url = `${ZALO_BOT_BASE_URL}/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText.trim().slice(0, 2000),
        }),
      });

      const data = await res.json();
      if (data.ok) {
        // Ghi log vào tuition_reminders
        const id = "remind-bot-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
        await db.execute({
          sql: `
            INSERT INTO tuition_reminders (id, school_id, student_id, month, amount, channel, reminded_by, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          args: [
            id,
            querySchoolId,
            String(student_id),
            currentMonth,
            Number(amount || 0),
            "zalo_bot",
            reminded_by || "Zalo Bot",
            note || "Gửi tự động qua Zalo Bot Platform",
          ],
        });

        return NextResponse.json({
          success: true,
          message: "Đã gửi tin nhắn nhắc nợ qua Zalo Bot thành công!",
          data: {
            id,
            student_id,
            reminded_at: new Date().toISOString(),
            channel: "zalo_bot",
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: `Zalo Bot báo lỗi: ${data.description || "Không thể gửi tin nhắn"} (Mã: ${data.error_code})`,
            data,
          },
          { status: 400 }
        );
      }
    }

    // 3. Gửi tin nhắn Zalo Bot hàng loạt cho các em có Chat ID
    if (action === "send_bot_batch") {
      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ success: false, message: "Danh sách học sinh gửi bot rỗng!" }, { status: 400 });
      }

      let botToken = "";
      const tokenRes = await db.execute("SELECT value FROM settings WHERE key = 'zalo_bot_token'");
      if (tokenRes.rows.length > 0) {
        botToken = String(tokenRes.rows[0].value).trim();
      }

      if (!botToken) {
        return NextResponse.json(
          {
            success: false,
            message: "Trung tâm chưa cấu hình Zalo Bot Token! Vui lòng vào Cài Đặt > Nhắc Zalo Bot để thiết lập.",
          },
          { status: 400 }
        );
      }

      let successCount = 0;
      let failCount = 0;
      const errors: Array<{ student_id: string; reason: string }> = [];

      for (const item of items) {
        const { student_id: sId, chat_id: cId, amount: itemAmount, text: itemText } = item;
        if (!cId) {
          failCount++;
          errors.push({ student_id: sId, reason: "Không có Zalo Chat ID" });
          continue;
        }

        try {
          const url = `${ZALO_BOT_BASE_URL}/bot${botToken}/sendMessage`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: String(cId).trim(),
              text: String(itemText || "").slice(0, 2000),
            }),
          });
          const data = await res.json();
          if (data.ok) {
            successCount++;
            const id = "remind-bot-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
            await db.execute({
              sql: `
                INSERT INTO tuition_reminders (id, school_id, student_id, month, amount, channel, reminded_by, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `,
              args: [
                id,
                querySchoolId,
                String(sId),
                currentMonth,
                Number(itemAmount || 0),
                "zalo_bot",
                reminded_by || "Zalo Bot (Batch)",
                "Gửi tự động hàng loạt qua Zalo Bot",
              ],
            });
          } else {
            failCount++;
            errors.push({ student_id: sId, reason: data.description || "Lỗi gửi tin nhắn" });
          }
        } catch (err: any) {
          failCount++;
          errors.push({ student_id: sId, reason: err.message || "Lỗi kết nối" });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã hoàn tất gửi Bot: Thành công ${successCount} em, Thất bại ${failCount} em.`,
        sent_count: successCount,
        failed_count: failCount,
        errors,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/admin/tuition-reminders error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Lỗi xử lý nhắc học phí" },
      { status: 500 }
    );
  }
}
