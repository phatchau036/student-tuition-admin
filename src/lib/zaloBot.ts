import { getDb, initDb } from "@/lib/db";

const ZALO_BOT_BASE_URL = "https://bot-api.zapps.me";

export type ZaloAdminNotificationEvent =
  | "payment"
  | "student_absence"
  | "teacher_leave"
  | "parent_feedback";

/**
 * Helper gửi thông báo tự động về Zalo của Admin / Quản lý cơ sở qua Zalo Bot Platform
 * Hoạt động độc lập, tự bắt lỗi để không bao giờ làm gián đoạn webhook SePay hoặc luồng chính.
 */
export async function notifyAdminViaZaloBot(
  text: string,
  eventType?: ZaloAdminNotificationEvent
): Promise<boolean> {
  try {
    await initDb();
    const db = getDb();

    // 1. Lấy token bot, admin chat ID và cấu hình bật/tắt từng loại thông báo
    const settingsRes = await db.execute(`
      SELECT key, value FROM settings 
      WHERE key IN (
        'zalo_bot_token', 
        'zalo_admin_chat_id',
        'zalo_notify_payment',
        'zalo_notify_student_absence',
        'zalo_notify_teacher_leave',
        'zalo_notify_parent_feedback'
      )
    `);

    let botToken = "";
    let adminChatId = "";
    let notifyPayment = true;
    let notifyStudentAbsence = true;
    let notifyTeacherLeave = true;
    let notifyParentFeedback = true;

    for (const r of settingsRes.rows) {
      const k = String(r.key);
      const val = String(r.value ?? "").trim();
      if (k === "zalo_bot_token") botToken = val;
      if (k === "zalo_admin_chat_id") adminChatId = val;
      if (k === "zalo_notify_payment" && val === "0") notifyPayment = false;
      if (k === "zalo_notify_student_absence" && val === "0") notifyStudentAbsence = false;
      if (k === "zalo_notify_teacher_leave" && val === "0") notifyTeacherLeave = false;
      if (k === "zalo_notify_parent_feedback" && val === "0") notifyParentFeedback = false;
    }

    // Nếu chưa cấu hình token hoặc chưa có Chat ID của admin -> bỏ qua an toàn
    if (!botToken || !adminChatId) {
      return false;
    }

    // Kiểm tra cờ bật/tắt theo sự kiện
    if (eventType === "payment" && !notifyPayment) return false;
    if (eventType === "student_absence" && !notifyStudentAbsence) return false;
    if (eventType === "teacher_leave" && !notifyTeacherLeave) return false;
    if (eventType === "parent_feedback" && !notifyParentFeedback) return false;

    // 2. Gửi request tới Zalo Bot Platform API
    const url = `${ZALO_BOT_BASE_URL}/bot${botToken}/sendMessage`;
    const payload = {
      chat_id: adminChatId,
      text: text.trim().slice(0, 2000),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return Boolean(data.ok);
  } catch (err) {
    console.error("notifyAdminViaZaloBot caught error (safe bypass):", err);
    return false;
  }
}
