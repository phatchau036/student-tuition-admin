/**
 * student.ts — Kiểu dữ liệu domain student.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
import type { StudentStatus } from "./common";
import type { StudentMonthlyTuition } from "./catalog";

export interface MakeUpClass {
  id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string;
  teacher_name?: string;
  absence_date: string; // Ngày nghỉ YYYY-MM-DD
  absence_reason: string; // Lý do nghỉ
  absence_start_time?: string; // Giờ bắt đầu nghỉ (ví dụ: "17:00")
  absence_end_time?: string; // Giờ kết thúc ca nghỉ (ví dụ: "18:30")
  absence_minutes?: number; // Số phút của ca nghỉ (ví dụ: 90)
  status: "pending" | "scheduled" | "completed"; // pending = chưa xếp bù, scheduled = đã có lịch bù, completed = đã học bù xong
  makeup_date?: string; // Ngày học bù YYYY-MM-DD
  makeup_time?: string; // Giờ học bù (ví dụ "18:00 - 19:00")
  makeup_start_time?: string; // Giờ bắt đầu ca bù
  makeup_end_time?: string; // Giờ kết thúc ca bù
  makeup_minutes?: number; // Số phút đăng ký bù (ví dụ: 60, 90)
  makeup_slot_id?: string;
  makeup_teacher_id?: string;
  class_id?: string;
  class_name?: string;
  lesson_id?: string;
  note?: string;
  created_at?: string;
}

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
  student_code?: string; // Mã học sinh duy nhất (VD: HS01, HS02...) dùng để đối soát SePay
  school_id?: string;
  school_name?: string;
  name: string;
  phone: string;
  zalo_link: string;
  zalo_chat_id?: string; // ID người nhận hoặc cuộc trò chuyện từ Zalo Bot
  level_id: string;
  level_name?: string;
  level_surcharge?: number;
  level_sort_order?: number;
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  time_slot_id: string;
  time_slot_name?: string;
  time_slot_desc?: string;

  // Trạng thái học: đang học, bảo lưu, nghỉ học
  status?: StudentStatus; // 'studying' | 'reserved' | 'dropped'
  status_date?: string; // Ngày bắt đầu bảo lưu / nghỉ / học tiếp
  expected_return_date?: string; // Ngày dự kiến học lại (nếu bảo lưu)
  status_note?: string; // Lý do

  // Giáo viên phụ trách (có thể suy ra từ lớp hoặc nhiều GV cùng ca)
  teacher_id?: string;
  teacher_name?: string;
  teacher_phone?: string;
  teacher_color?: string;
  assigned_teachers?: Array<{ id: string; name: string; role?: string; time?: string }>;

  // Lớp học tham gia
  class_id?: string;
  class_name?: string;
  class_room?: string;
  class_teacher_assignments_json?: string;

  // Lịch học & thời lượng hàng tuần:
  start_date?: string; // Ngày bắt đầu đăng ký học (YYYY-MM-DD)
  duration_mode: "by_hours" | "by_sessions"; // "by_hours": Miễn đủ X tiếng/tuần | "by_sessions": Cố định X buổi/tuần
  sessions_per_week: number; // e.g. 1 buổi, 2 buổi, 3 buổi
  hours_per_week: number; // e.g. 3 tiếng / tuần
  registered_days: string; // e.g. "Thứ 7, Chủ Nhật"
  study_time_detail?: string; // e.g. "T7: 09:00-10:30 (1.5h) | CN: 09:00-10:30 (1.5h)"
  schedule_details_json?: string; // Danh sách chi tiết JSON ScheduleItem[]
  schedule_preset_name?: string; // Tên kiểu lịch học cơ sở (ví dụ: "Thứ chẵn (2-4-6)", "Thứ lẻ (3-5-7)", "Cuối tuần")

  is_discount_enabled: number; // 1 or 0
  discount_percent: number; // e.g. 10
  discount_reason?: string; // Lý do được giảm giá (ví dụ: Anh em ruột, Học sinh nghèo hiếu học, Đăng ký sớm...)
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

  // Công nợ nợ cũ cộng dồn & cảnh báo nợ quá 1 tháng
  unpaid_months_count?: number; // Số tháng nợ liên tiếp (>= 1, 2, 3...)
  is_overdue?: boolean; // True nếu nợ quá 1 tháng (>= 2 tháng chưa thanh toán)
  previous_debt_amount?: number; // Tiền nợ các tháng trước cộng dồn
  total_tuition_due?: number; // Tổng học phí cần đóng = tiền tháng này + nợ cũ cộng dồn

  // Computed fields for a given month:
  monthly_override?: StudentMonthlyTuition | null;
  current_tuition?: number;
  standard_tuition?: number;
  tuition_formula_text?: string;
  tuition_base_amount?: number;
  tuition_discount_amount?: number;

  // ⭐ VÍ GIỜ HỌC (HOUR WALLET): Số dư tính bằng phút (sổ cái hour_ledger)
  balance_minutes?: number; // Tổng số dư ví (CÓ THỂ ÂM)
  available_minutes?: number; // = balance − tổng phút bù đã xếp chưa học
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

// 1. Góp ý của Phụ huynh gửi tới Trung tâm
