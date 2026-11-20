/**
 * common.ts — Kiểu dữ liệu domain common.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
export const DAYS_OF_WEEK: string[] = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ Nhật",
];

/**
 * Bản ghi thô đọc từ SQLite / JSON chưa được kiểm chứng.
 *
 * Đây là **điểm tiếp giáp dữ liệu duy nhất** được phép dùng `any` trong toàn bộ
 * `src/`. Mọi giá trị phải được chuẩn hóa bằng `String()`, `Number()`,
 * `Boolean()` hoặc type guard trước khi sử dụng trong logic nghiệp vụ.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Biên giới dữ liệu động (SQLite/JSON).
export type DbRow = Record<string, any>;

/** Giá trị JSON chưa được kiểm chứng (kết quả của `JSON.parse`). */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ReconciliationMode = "manual" | "auto";

export type ZaloReminderMode = "manual" | "bot";

export type CapacityMode = "by_slot" | "by_teacher"; // "by_slot": Tính theo ca/giờ mở cửa | "by_teacher": Tính theo giáo viên & ca làm việc riêng

export type AppLanguage = "vi" | "en" | "zh" | "ja"; // vi: Tiếng Việt, en: English, zh: 中文 (Tiếng Trung), ja: 日本語 (Tiếng Nhật)

export type MonthFormat = "vietnamese" | "english" | "number" | "chinese" | "japanese";

export type StudentStatus = "studying" | "reserved" | "dropped"; // studying = Đang học, reserved = Bảo lưu, dropped = Nghỉ học
