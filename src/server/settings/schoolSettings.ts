import { getDb } from "@/server/db";

/**
 * schoolSettings.ts — Nguồn sự thật duy nhất cho cấu hình của một cơ sở.
 *
 * Trước đây hệ thống có 2 nguồn song song: bảng `settings` (toàn cục) và các cột
 * trong bảng `schools` (theo cơ sở). Điều này gây rò rỉ cấu hình giữa các cơ sở và
 * khiến cùng một cấu hình có thể đọc ra 2 giá trị khác nhau.
 *
 * Quy tắc mới:
 *   1. Cấu hình **theo cơ sở** (SePay, Zalo Bot, học phí chuẩn, kiểu lịch) → đọc
 *      và ghi trên bảng `schools` thông qua module này.
 *   2. Cấu hình **toàn hệ thống** (AI, system admin, closed_dates) → vẫn ở `settings`.
 *   3. Bảng `settings` chỉ còn giữ bản sao tương thích ngược cho cơ sở mặc định,
 *      được đồng bộ tự động bởi `syncLegacyDefaultSchoolSettings()`.
 */

/** Giá trị cấu hình theo cơ sở, đã chuẩn hóa kiểu. */
export interface SchoolSettings {
  sepay_bank_name: string;
  sepay_account_number: string;
  sepay_api_key: string;
  sepay_prefix: string;
  base_tuition: number;
  schedule_presets: string;
  zalo_bot_token: string;
  zalo_bot_name: string;
  zalo_admin_chat_id: string;
}

const DEFAULTS: SchoolSettings = {
  sepay_bank_name: "",
  sepay_account_number: "",
  sepay_api_key: "",
  sepay_prefix: "HP",
  base_tuition: 1000000,
  schedule_presets: "",
  zalo_bot_token: "",
  zalo_bot_name: "",
  zalo_admin_chat_id: "",
};

const COLUMNS = Object.keys(DEFAULTS) as (keyof SchoolSettings)[];

/**
 * Đọc cấu hình của một cơ sở từ bảng `schools`.
 * Trả về giá trị mặc định an toàn nếu cơ sở không tồn tại.
 */
export async function getSchoolSettings(schoolId: string): Promise<SchoolSettings> {
  const result: SchoolSettings = { ...DEFAULTS };
  if (!schoolId) return result;

  try {
    const db = getDb();
    const res = await db.execute({
      sql: `SELECT ${COLUMNS.join(", ")} FROM schools WHERE id = ? LIMIT 1`,
      args: [schoolId],
    });
    if (res.rows.length === 0) return result;

    const row = res.rows[0];
    result.sepay_bank_name = String(row.sepay_bank_name || "");
    result.sepay_account_number = String(row.sepay_account_number || "");
    result.sepay_api_key = String(row.sepay_api_key || "");
    result.sepay_prefix = String(row.sepay_prefix || "HP");
    result.base_tuition = Number(row.base_tuition) || 1000000;
    result.schedule_presets = String(row.schedule_presets || "");
    result.zalo_bot_token = String(row.zalo_bot_token || "");
    result.zalo_bot_name = String(row.zalo_bot_name || "");
    result.zalo_admin_chat_id = String(row.zalo_admin_chat_id || "");
  } catch {
    return result;
  }

  return result;
}

/**
 * Ghi cấu hình theo cơ sở vào bảng `schools`.
 * Chỉ cập nhật các khóa được truyền vào (partial update).
 * Trả về true nếu câu lệnh chạy thành công.
 */
export async function updateSchoolSettings(
  schoolId: string,
  patch: Partial<SchoolSettings>
): Promise<boolean> {
  if (!schoolId) return false;

  const keys = (Object.keys(patch) as (keyof SchoolSettings)[]).filter(
    (key) => patch[key] !== undefined
  );
  if (keys.length === 0) return true;

  const assignments = keys.map((key) => `${key} = ?`).join(", ");
  const args = keys.map((key) => {
    const value = patch[key];
    return typeof value === "number" ? value : String(value ?? "");
  });

  try {
    const db = getDb();
    await db.execute({
      sql: `UPDATE schools SET ${assignments} WHERE id = ?`,
      args: [...args, schoolId],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Đồng bộ cấu hình của cơ sở mặc định sang bảng `settings` (tương thích ngược).
 *
 * Một số module cũ (ví dụ `lib/wallet.ts`) vẫn đọc `settings` cho các khóa toàn
 * hệ thống. Với cơ sở `school-default` ta giữ 2 nơi luôn khớp nhau để tránh lệch.
 */
export async function syncLegacyDefaultSchoolSettings(schoolId: string): Promise<void> {
  if (schoolId !== "school-default") return;

  try {
    const settings = await getSchoolSettings(schoolId);
    const db = getDb();

    const pairs: [string, string][] = [
      ["sepay_bank_name", settings.sepay_bank_name],
      ["sepay_account_number", settings.sepay_account_number],
      ["sepay_api_key", settings.sepay_api_key],
      ["sepay_prefix", settings.sepay_prefix],
      ["base_tuition", String(settings.base_tuition)],
      ["schedule_presets", settings.schedule_presets],
      ["zalo_bot_token", settings.zalo_bot_token],
      ["zalo_bot_name", settings.zalo_bot_name],
      ["zalo_admin_chat_id", settings.zalo_admin_chat_id],
    ];

    for (const [key, value] of pairs) {
      await db.execute({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
        args: [key, value, value],
      });
    }
  } catch {
    /* Bỏ qua có chủ đích: đồng bộ tương thích ngược, lỗi không ảnh hưởng nghiệp vụ. */
  }
}
