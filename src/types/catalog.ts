/**
 * catalog.ts — Kiểu dữ liệu domain catalog.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
import type {
  AppLanguage,
  CapacityMode,
  MonthFormat,
  ReconciliationMode,
  ZaloReminderMode,
} from "./common";

export interface ScheduleItem {
  id: string;
  day: string; // "Thứ 2", "Thứ 7", "Chủ Nhật", ...
  start_time: string; // "09:00", "18:00"
  end_time: string; // "10:30", "20:00"
  hours: number; // 1.5, 3, 1
}

export interface TimeSlot {
  id: string;
  school_id?: string;
  name: string;
  from_day?: string; // e.g. "Thứ 2"
  to_day?: string; // e.g. "Thứ 7"
  days: string; // e.g. "Thứ 2 – Thứ 7", "Thứ 7", "Chủ Nhật"
  start_time: string; // "17:00"
  end_time: string; // "20:00"
  max_students?: number; // Sĩ số tối đa trong ca
  is_active: number; // 1 or 0
  created_at?: string;
}

export interface Subject {
  id: string;
  school_id?: string;
  name: string; // VD: Piano, Guitar, Organ, Trống, IELTS, Tiếng Anh, Toán, Vẽ...
  description?: string;
  color?: string; // e.g. "indigo", "purple", "emerald", "amber", "rose", "sky"
  is_active: number; // 1 or 0
  created_at?: string;
}

export interface LevelSurcharge {
  id: string;
  school_id?: string;
  level_name: string;
  surcharge_amount: number; // Số tiền VNĐ HOẶC Phần trăm (%)
  surcharge_type?: "fixed" | "percent"; // 'fixed' = cố định VNĐ, 'percent' = phần trăm %
  sort_order: number;
}

export interface DiscountOption {
  id: string;
  school_id?: string;
  percentage: number; // 0, 5, 10, 15, 20
  label: string;
}

export interface TuitionPackage {
  id: string;
  school_id?: string;
  name: string; // VD: "Theo tháng", "Theo quý - 3 tháng", "Khóa 6 tháng", "Khóa 1 năm"...
  amount: number; // Số tiền thực thu (sau ưu đãi)
  original_amount?: number; // Giá gốc ban đầu trước ưu đãi
  cycle_unit: "month" | "week"; // Đơn vị chu kỳ: Tháng hoặc Tuần
  cycle_value: number; // Số lượng chu kỳ (VD: 1, 3, 6, 12...)
  discount_type?: "none" | "percent" | "amount"; // Loại ưu đãi: không có, theo %, hoặc giảm số tiền trực tiếp
  discount_value?: number; // Giá trị ưu đãi (VD: 10% hoặc 300.000đ)
  benefits?: string; // Ưu đãi / Quyền lợi tặng kèm (VD: "Giảm 10% + Tặng 1 buổi bù + Giáo trình")
  is_active: number; // 1: Đang kích hoạt, 0: Tạm tắt
  created_at?: string;
}

export interface ZaloBotConfig {
  bot_token?: string; // Token nhận được từ Zalo Bot Creator (@Zalo Bot Manager)
  bot_name?: string; // Tên bot (bắt đầu bằng tiền tố Bot, ví dụ: BotTrungTamHongAn)
  webhook_url?: string;
}

export interface SchedulePreset {
  id: string; // "preset-even", "preset-odd", hoặc uuid
  name: string; // Tên kiểu: "Thứ chẵn", "Thứ lẻ", "Cuối tuần", v.v.
  days: string[]; // e.g. ["Thứ 2", "Thứ 4", "Thứ 6"]
  hours_per_session: number; // e.g. 1.5 tiếng/buổi
  default_start_time?: string; // Giờ vào lớp mặc định, e.g. "18:00"
  is_default?: boolean; // Kiểu mặc định khi tạo học sinh
}

export interface SystemSettings {
  base_tuition: number; // Base price in VNĐ
  duration_mode: "by_hours" | "by_sessions"; // Chế độ: HOẶC theo tiếng HOẶC theo buổi
  app_language?: AppLanguage; // Ngôn ngữ toàn giao diện: 'vi' | 'en' | 'zh' | 'ja'
  month_format?: MonthFormat; // Định dạng tháng: 'vietnamese', 'english', 'chinese', 'japanese', 'number'
  default_hours_per_week: number; // Ví dụ: 3 tiếng/tuần
  default_sessions_per_week: number; // Ví dụ: 3 buổi/tuần
  default_study_time: string; // Ví dụ: "18:00 - 19:00"
  max_students_per_slot: number; // Sĩ số tối đa mặc định cho 1 lớp/ca
  crowded_threshold_percent: number; // Ngưỡng cảnh báo lớp đông (Mặc định: 80%)
  capacity_mode?: CapacityMode; // 'by_slot' (Tính theo ca mở cửa) | 'by_teacher' (Tính theo ca/sĩ số của Giáo Viên)
  reconciliation_mode?: ReconciliationMode; // 'manual' | 'auto'
  default_minutes_per_session?: number; // Ví Giờ Học: số phút chuẩn 1 buổi (mặc định 90)
  schedule_presets?: SchedulePreset[]; // Danh sách các kiểu lịch học cơ sở (Hình thức 2)

  // Cấu hình SePay Webhook
  sepay_api_key?: string; // API Key cấu hình tại SePay Webhook
  sepay_account_number?: string; // Số tài khoản ngân hàng nhận tiền
  sepay_bank_name?: string; // Tên ngân hàng (Vietcombank, MBBank, Techcombank, ...)
  sepay_prefix?: string; // Tiền tố chuyển khoản (Mặc định: HP, ví dụ: HP HS01 T10)

  zalo_reminder_mode?: ZaloReminderMode; // 'manual' | 'bot'
  zalo_bot_token?: string; // Token từ Zalo Bot Creator (@Zalo Bot Manager)
  zalo_bot_name?: string; // Tên bot Zalo
  zalo_admin_chat_id?: string; // Chat ID Zalo của Admin nhận thông báo
  zalo_notify_payment?: number; // 1: Bật, 0: Tắt
  zalo_notify_student_absence?: number; // 1: Bật, 0: Tắt
  zalo_notify_teacher_leave?: number; // 1: Bật, 0: Tắt
  zalo_notify_parent_feedback?: number; // 1: Bật, 0: Tắt
  zalo_oa_secret_key?: string;
  zalo_access_token?: string;
  zalo_template_id?: string;
}

export interface TuitionAdjustmentItem {
  id: string;
  name: string; // VD: "Tập chép nhạc", "Sách giáo trình", "Trừ nghỉ lễ 2/9", "Áo đồng phục"...
  type: "add" | "deduct"; // "add": cộng thêm (+), "deduct": giảm trừ (-)
  amount: number;
}

export interface StudentMonthlyTuition {
  id: string;
  student_id: string;
  month: string; // YYYY-MM
  amount: number;
  note: string;
  items_json?: string; // JSON mảng TuitionAdjustmentItem[]
  receipt_number?: string;
  created_at?: string;
  updated_at?: string;
}

// Báo nghỉ & Học bù
