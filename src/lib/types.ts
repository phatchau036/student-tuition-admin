export interface School {
  id: string;
  name: string; // Tên trường / trung tâm
  code: string; // Mã trường (e.g. "TT-01")
  school_type?: "TT" | "TH"; // TT: Trung tâm, TH: Trường học
  street?: string; // Tên đường riêng (VD: "Hiền Vương")
  city?: string; // Tỉnh / Thành phố (VD: "TPHCM", "Hà Nội"...)
  branch_num?: number | string; // Chi nhánh số mấy (VD: 1, 2)
  address?: string;
  phone?: string;
  ip_restriction_enabled?: number; // 0: không giới hạn, 1: chỉ cho phép vào từ IP quy định
  allowed_ips?: string; // Danh sách IP cho phép, phân tách bằng dấu phẩy
  created_at?: string;
}

export interface SchoolAdmin {
  id: string;
  school_id: string;
  username: string; // Tên đăng nhập
  password: string; // Mật khẩu
  full_name: string;
  created_at?: string;
}

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

export interface LevelSurcharge {
  id: string;
  school_id?: string;
  level_name: string;
  surcharge_amount: number; // VNĐ
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

export interface StudentPayment {
  id: string;
  student_id: string;
  package_id?: string;
  package_name?: string;
  amount: number;
  paid_date: string; // YYYY-MM-DD
  start_period: string; // YYYY-MM hoặc YYYY-MM-DD
  end_period: string; // YYYY-MM hoặc YYYY-MM-DD
  status: "paid" | "unpaid";
  note?: string;
  created_at?: string;
}

export type ReconciliationMode = "manual" | "auto";
export type ZaloReminderMode = "manual" | "bot";

export interface ZaloBotConfig {
  oa_secret_key?: string;
  access_token?: string;
  template_id?: string;
}

export interface Teacher {
  id: string;
  school_id?: string;
  name: string;
  phone: string;
  email?: string;
  color?: string; // Color badge
  specialty?: string; // Chuyên môn / Môn dạy
  is_active: number; // 1 or 0
  student_count?: number;
  created_at?: string;
}

export type MonthFormat = "vietnamese" | "english" | "number";

export interface SystemSettings {
  base_tuition: number; // Base price in VNĐ
  duration_mode: "by_hours" | "by_sessions"; // Chế độ: HOẶC theo tiếng HOẶC theo buổi
  month_format?: MonthFormat; // Định dạng tháng: 'vietnamese' (Tháng 10/2026), 'english' (October 2026 / Oct 2026), 'number' (10/2026)
  default_hours_per_week: number; // Ví dụ: 3 tiếng/tuần
  default_sessions_per_week: number; // Ví dụ: 3 buổi/tuần
  default_study_time: string; // Ví dụ: "18:00 - 19:00"
  max_students_per_slot: number; // Sĩ số tối đa mặc định cho 1 lớp/ca
  crowded_threshold_percent: number; // Ngưỡng cảnh báo lớp đông (Mặc định: 80%)
  reconciliation_mode?: ReconciliationMode; // 'manual' | 'auto'
  zalo_reminder_mode?: ZaloReminderMode; // 'manual' | 'bot'
  zalo_oa_secret_key?: string;
  zalo_access_token?: string;
  zalo_template_id?: string;
}

export interface StudentMonthlyTuition {
  id: string;
  student_id: string;
  month: string; // YYYY-MM
  amount: number;
  note: string;
  created_at?: string;
  updated_at?: string;
}

// Báo nghỉ & Học bù
export interface MakeUpClass {
  id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string;
  teacher_name?: string;
  absence_date: string; // Ngày nghỉ YYYY-MM-DD
  absence_reason: string; // Lý do nghỉ
  status: "pending" | "scheduled" | "completed"; // pending = chưa xếp bù, scheduled = đã có lịch bù, completed = đã học bù xong
  makeup_date?: string; // Ngày học bù YYYY-MM-DD
  makeup_time?: string; // Giờ học bù (ví dụ "18:00 - 19:00")
  makeup_slot_id?: string;
  makeup_teacher_id?: string;
  note?: string;
  created_at?: string;
}

export type StudentStatus = "studying" | "reserved" | "dropped"; // studying = Đang học, reserved = Bảo lưu, dropped = Nghỉ học

export interface StudentStatusLog {
  id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string;
  action_type: "reserve" | "drop" | "resume"; // reserve = Bảo lưu, drop = Nghỉ học, resume = Trở lại học tiếp
  from_status: StudentStatus;
  to_status: StudentStatus;
  effective_date: string; // YYYY-MM-DD
  return_date?: string; // Dự kiến khi nào học lại (dành cho bảo lưu)
  reason?: string;
  logged_at: string; // YYYY-MM-DD HH:mm:ss
  month: string; // YYYY-MM
  created_at?: string;
}

export interface Student {
  id: string;
  school_id?: string;
  school_name?: string;
  name: string;
  phone: string;
  zalo_link: string;
  level_id: string;
  level_name?: string;
  level_surcharge?: number;
  time_slot_id: string;
  time_slot_name?: string;
  time_slot_desc?: string;
  
  // Trạng thái học: đang học, bảo lưu, nghỉ học
  status?: StudentStatus; // 'studying' | 'reserved' | 'dropped'
  status_date?: string; // Ngày bắt đầu bảo lưu / nghỉ / học tiếp
  expected_return_date?: string; // Ngày dự kiến học lại (nếu bảo lưu)
  status_note?: string; // Lý do
  
  // Giáo viên phụ trách
  teacher_id?: string;
  teacher_name?: string;
  teacher_phone?: string;
  teacher_color?: string;

  // Lịch học & thời lượng hàng tuần:
  duration_mode: "by_hours" | "by_sessions"; // "by_hours": Miễn đủ X tiếng/tuần | "by_sessions": Cố định X buổi/tuần
  sessions_per_week: number; // e.g. 1 buổi, 2 buổi, 3 buổi
  hours_per_week: number;    // e.g. 3 tiếng / tuần
  registered_days: string;   // e.g. "Thứ 7, Chủ Nhật"
  study_time_detail?: string;// e.g. "T7: 09:00-10:30 (1.5h) | CN: 09:00-10:30 (1.5h)"
  schedule_details_json?: string; // Danh sách chi tiết JSON ScheduleItem[]

  is_discount_enabled: number; // 1 or 0
  discount_percent: number;    // e.g. 10
  created_at?: string;

  // Thông tin học bù
  pending_makeups_count?: number; // Số buổi cần bù còn tồn

  // Gói học phí áp dụng
  tuition_package_id?: string;
  tuition_package_name?: string;

  // Trạng thái công nợ đối soát của tháng đang chọn
  payment_status?: "paid" | "unpaid"; // 'paid' = Đã đóng, 'unpaid' = Cần đóng tiền
  payment_period_desc?: string; // Ví dụ: "Đã đóng tới tháng 12/2026" hoặc "Đã đóng tháng 10/2026"
  payment_id?: string; // ID của bản ghi payment nếu đã đóng

  // Computed fields for a given month:
  monthly_override?: StudentMonthlyTuition | null;
  current_tuition?: number;
  standard_tuition?: number;
}

export interface DayOccupancy {
  date: string;
  day_name: string; // Thứ 2, Thứ 3...
  time_slots: {
    slot_id: string;
    slot_name: string;
    time_range: string;
    regular_count: number;
    makeup_count: number;
    total_count: number;
    max_capacity: number;
    occupancy_rate: number; // %
    is_crowded: boolean; // >= threshold
    is_full: boolean; // >= 100%
  }[];
}
