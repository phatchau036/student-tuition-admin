export const DAYS_OF_WEEK: string[] = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

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
  password?: string; // Mật khẩu
  full_name: string;
  phone?: string;
  role_id?: string;
  role_name?: string;
  is_active?: number; // 1: Hoạt động, 0: Khóa
  is_owner?: number; // 1: Chủ cơ sở (toàn quyền)
  permissions?: string[];
  created_at?: string;
}

export interface AdminRole {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  permissions_json: string;
  permissions?: string[];
  staff_count?: number;
  is_system?: number; // 1: Vai trò hệ thống cố định (không thể sửa/xóa)
  created_at?: string;
}

export interface AdminPermissionItem {
  id: string;
  label: string;
  description: string;
}

export interface AdminPermissionGroup {
  id: string;
  name: string;
  description: string;
  items: AdminPermissionItem[];
}

export const ADMIN_PERMISSION_GROUPS: AdminPermissionGroup[] = [
  {
    id: "students",
    name: "Quản Lý Học Sinh",
    description: "Xem danh sách, thêm, sửa, xóa, bảo lưu và xuất file học sinh",
    items: [
      { id: "students.view", label: "Xem danh sách học sinh", description: "Mở xem bảng học sinh và thông tin chi tiết hồ sơ" },
      { id: "students.create", label: "Thêm học sinh mới", description: "Tạo hồ sơ học sinh mới vào trung tâm" },
      { id: "students.edit", label: "Chỉnh sửa học sinh", description: "Sửa thông tin cá nhân, ca học, môn học, gói phí" },
      { id: "students.delete", label: "Xóa học sinh", description: "Xóa hồ sơ học sinh (đơn lẻ hoặc hàng loạt)" },
      { id: "students.status", label: "Đổi trạng thái học sinh", description: "Chuyển Bảo lưu, Nghỉ học hoặc cho học tiếp" },
      { id: "students.excel", label: "Nhập / Xuất Excel", description: "Import học sinh từ file Excel hoặc xuất file danh sách" },
    ],
  },
  {
    id: "tuition",
    name: "Học Phí & Doanh Thu",
    description: "Xem tiền học phí, công nợ, đối soát thu tiền và xem báo cáo tài chính",
    items: [
      { id: "tuition.view", label: "Xem học phí & công nợ", description: "Nhìn thấy số tiền học phí, công nợ nợ cũ của học sinh" },
      { id: "tuition.audit", label: "Thu tiền / Đối soát", description: "Bấm Đã đóng/Chưa đóng, ghi chú thanh toán đối soát" },
      { id: "tuition.override", label: "Điều chỉnh học phí tháng", description: "Nhập học phí tùy chỉnh cho từng tháng cụ thể" },
      { id: "tuition.receipt", label: "Xuất biên lai học phí", description: "In hoặc tải biên lai điện tử gửi phụ huynh" },
      { id: "tuition.remind", label: "Hàng đợi nhắc học phí Zalo", description: "Mở danh sách nợ học phí và thực hiện nhắc nợ qua Zalo hoặc Bot" },
      { id: "revenue.reports", label: "Xem báo cáo tổng doanh thu", description: "Mở cửa sổ Tổng kết doanh thu tháng và giao dịch SePay" },
    ],
  },
  {
    id: "schedule",
    name: "Lịch Học & Điểm Danh / Bù",
    description: "Xem sơ đồ ma trận phòng học, báo nghỉ, xếp lịch học bù và quỹ giờ",
    items: [
      { id: "schedule.matrix", label: "Xem ma trận phòng học", description: "Mở sơ đồ ma trận phân bổ lớp và ca học tuần" },
      { id: "attendance.manage", label: "Điểm danh & Sổ bài học", description: "Điểm danh theo ngày cho các lớp/ca và ghi nhận xét, bài tập" },
      { id: "makeups.manage", label: "Quản lý Báo nghỉ & Học bù", description: "Ghi nhận báo nghỉ, xếp ca bù và xem quỹ giờ bù" },
      { id: "schedule.consult", label: "Tư vấn xếp lịch ca trống", description: "Tra cứu các khung giờ còn trống để tư vấn phụ huynh" },
    ],
  },
  {
    id: "classes_teachers",
    name: "Lớp Học & Giáo Viên",
    description: "Quản lý danh mục lớp học, chia ca và đội ngũ giáo viên",
    items: [
      { id: "classes.manage", label: "Quản lý Lớp học", description: "Thêm, sửa, đóng/mở lớp học và phân công ca" },
      { id: "teachers.manage", label: "Quản lý Giáo viên", description: "Thêm, sửa giáo viên và phân ca đứng lớp" },
    ],
  },
  {
    id: "settings",
    name: "Cài Đặt & Nhân Sự",
    description: "Cấu hình trung tâm và phân quyền tài khoản nhân viên",
    items: [
      { id: "settings.manage", label: "Cài đặt hệ thống cơ sở", description: "Mở và chỉnh sửa cài đặt trung tâm (học phí gốc, SePay, Zalo...)" },
      { id: "staff.manage", label: "Quản lý Nhân viên & Phân quyền", description: "Tạo nhóm quyền, tạo tài khoản và phân quyền nhân viên" },
    ],
  },
];

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
  paid_date: string;
  start_period: string; // YYYY-MM
  end_period: string; // YYYY-MM
  status: "paid" | "unpaid";
  note?: string;
  receipt_number?: string;
  created_at?: string;
}

export type ReconciliationMode = "manual" | "auto";
export type ZaloReminderMode = "manual" | "bot";

export interface ZaloBotConfig {
  bot_token?: string; // Token nhận được từ Zalo Bot Creator (@Zalo Bot Manager)
  bot_name?: string; // Tên bot (bắt đầu bằng tiền tố Bot, ví dụ: BotTrungTamHongAn)
  webhook_url?: string;
}

export type CapacityMode = "by_slot" | "by_teacher"; // "by_slot": Tính theo ca/giờ mở cửa | "by_teacher": Tính theo giáo viên & ca làm việc riêng

export interface TeacherShift {
  id: string;
  day: string; // "Thứ 2", "Thứ 3", ..., "Chủ Nhật"
  start_time: string; // "17:00"
  end_time: string; // "20:00"
  max_students?: number; // Sĩ số tối đa giáo viên nhận trong ca này
}

export interface Teacher {
  id: string;
  school_id?: string;
  name: string;
  phone: string;
  email?: string;
  color?: string; // Color badge
  specialty?: string; // Chuyên môn / Môn dạy
  zalo_chat_id?: string; // ID người nhận thông báo từ Zalo Bot
  zalo_link?: string; // Link Zalo cá nhân
  max_students?: number; // Sĩ số tối đa 1 ca dạy của giáo viên này (Mặc định: 10)
  assigned_slot_ids?: string[]; // Danh sách ID các khung giờ / ca giáo viên được phân công dạy
  assigned_slots_desc?: string; // Chuỗi mô tả các ca dạy (VD: "Thứ 2 – Thứ 7: 17:00 - 20:00")
  working_shifts_json?: string; // Danh sách ca làm việc linh hoạt TeacherShift[]
  is_active: number; // 1 or 0
  student_count?: number;
  created_at?: string;
}

export type AppLanguage = "vi" | "en" | "zh" | "ja"; // vi: Tiếng Việt, en: English, zh: 中文 (Tiếng Trung), ja: 日本語 (Tiếng Nhật)
export type MonthFormat = "vietnamese" | "english" | "number" | "chinese" | "japanese";

export interface SePayTransaction {
  id: string; // ID giao dịch SePay
  gateway?: string; // Vietcombank, MB, ACB...
  transaction_date?: string; // YYYY-MM-DD HH:mm:ss
  account_number?: string;
  sub_account?: string;
  code?: string;
  content: string; // Nội dung chuyển khoản
  transfer_type: "in" | "out";
  transfer_amount: number; // Số tiền giao dịch
  reference_code?: string;
  student_id?: string;
  student_name?: string;
  matched_period?: string; // Tháng được đối soát YYYY-MM
  status: "matched" | "unmatched" | "ignored";
  created_at?: string;
}

export interface MonthlyReconciliationSummary {
  month: string;
  total_students: number;
  studying_students: number;
  reserved_students: number;
  dropped_students: number;
  paid_count: number;
  unpaid_count: number;
  total_expected_revenue: number; // Tổng dự thu
  total_actual_revenue: number; // Tổng thực thu đã đóng
  total_unpaid_revenue: number; // Công nợ còn lại
  sepay_matched_count: number; // Số giao dịch tự động qua SePay
  sepay_matched_revenue: number; // Tổng tiền SePay đối soát
}

export interface ClassScheduleItem {
  id?: string;
  day: string; // "Thứ 2", "Thứ 3", ... "Chủ Nhật"
  start_time: string; // "18:00"
  end_time: string; // "19:30"
}

export interface ClassTeacherAssignment {
  id?: string;
  teacher_id: string;
  teacher_name?: string;
  day?: string; // "Thứ 2", hoặc "Tất cả các ngày"
  start_time: string; // "17:00"
  end_time: string; // "18:00"
  role?: string; // "Đứng lớp chính", "Trợ giảng", "Dạy kèm"
}

export interface ClassRoom {
  id: string;
  school_id?: string;
  name: string; // "Piano Căn Bản K1"
  code?: string; // "PIANO-K1"
  subject_id?: string;
  subject_name?: string;
  subject_color?: string;
  teacher_id?: string;
  teacher_name?: string;
  teacher_phone?: string;
  max_students: number; // Sĩ số tối đa CỦA LỚP: 8, 10, 15... (không phụ thuộc GV)
  room?: string; // "Phòng 101"
  schedule_json?: string; // JSON mảng ClassScheduleItem[]: khung giờ mở của lớp
  teacher_assignments_json?: string; // JSON mảng ClassTeacherAssignment[]: giáo viên nào dạy giờ nào
  color?: string; // "indigo", "emerald", "amber"...
  note?: string;
  status: "active" | "closed";
  student_count?: number; // Số học sinh thực tế đang theo học
  students?: Array<{ id: string; name: string; phone: string }>;
  created_at?: string;
}

export interface TeacherShiftStudent {
  id: string;
  name: string;
  phone?: string;
  student_code?: string;
  level_name?: string;
  time_label?: string;
}

export interface TeacherAssignedShift {
  id: string;
  class_id: string;
  class_name: string;
  class_code?: string;
  subject_name?: string;
  room?: string;
  day: string;
  start_time: string;
  end_time: string;
  role?: string;
  max_students: number;
  students: TeacherShiftStudent[];
}

export interface TeacherDaySchedule {
  day: string;
  shifts: TeacherAssignedShift[];
  total_students: number;
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
  start_date?: string;       // Ngày bắt đầu đăng ký học (YYYY-MM-DD)
  duration_mode: "by_hours" | "by_sessions"; // "by_hours": Miễn đủ X tiếng/tuần | "by_sessions": Cố định X buổi/tuần
  sessions_per_week: number; // e.g. 1 buổi, 2 buổi, 3 buổi
  hours_per_week: number;    // e.g. 3 tiếng / tuần
  registered_days: string;   // e.g. "Thứ 7, Chủ Nhật"
  study_time_detail?: string;// e.g. "T7: 09:00-10:30 (1.5h) | CN: 09:00-10:30 (1.5h)"
  schedule_details_json?: string; // Danh sách chi tiết JSON ScheduleItem[]
  schedule_preset_name?: string; // Tên kiểu lịch học cơ sở (ví dụ: "Thứ chẵn (2-4-6)", "Thứ lẻ (3-5-7)", "Cuối tuần")

  is_discount_enabled: number; // 1 or 0
  discount_percent: number;    // e.g. 10
  discount_reason?: string;    // Lý do được giảm giá (ví dụ: Anh em ruột, Học sinh nghèo hiếu học, Đăng ký sớm...)
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
  balance_minutes?: number;    // Tổng số dư ví (CÓ THỂ ÂM)
  available_minutes?: number;  // = balance − tổng phút bù đã xếp chưa học
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
export interface ParentFeedback {
  id: string;
  school_id: string;
  student_name?: string;
  parent_name?: string;
  parent_phone?: string;
  category: "teaching" | "facility" | "tuition" | "schedule" | "other";
  rating?: number; // 1 -> 5 sao
  content: string;
  status: "pending" | "reviewed" | "resolved";
  response_note?: string;
  created_at: string;
}

// 2. Góp ý của Trung tâm gửi tới Hệ thống Quản trị TpTeam
export interface SystemFeedback {
  id: string;
  school_id: string;
  school_name?: string;
  school_code?: string;
  sender_name?: string;
  sender_contact?: string;
  category: "feature_request" | "bug_report" | "ui_ux" | "performance" | "other";
  priority: "low" | "medium" | "high";
  title: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "in_review" | "planned";
  admin_reply?: string;
  images_json?: string;
  images?: string[];
  assignee_id?: string;
  assignee_name?: string;
  assigned_at?: string;
  completed_at?: string;
  completed_by?: string;
  created_at: string;
}

// 3. Thành viên đội ngũ phát triển TpTeam
export interface SystemTeamMember {
  id: string;
  name: string;
  role: "developer" | "tester" | "manager" | "support";
  phone?: string;
  avatar_color?: string;
  is_active: number;
  created_at?: string;
}

// 4. Buổi học, Điểm danh & Sổ liên lạc nhận xét
export interface LessonRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string;
  student_code?: string;
  date: string;               // YYYY-MM-DD
  start_time: string;         // HH:MM
  planned_minutes: number;
  actual_minutes?: number;
  class_id?: string;
  class_name?: string;
  teacher_id?: string;
  teacher_name?: string;
  subject_id?: string;
  subject_name?: string;
  kind: "regular" | "makeup";
  status: "scheduled" | "attended" | "absent_excused" | "absent_unexcused" | "cancelled";
  teacher_notes?: string;     // Lời nhận xét tiến bộ của thầy cô
  homework?: string;          // Bài tập về nhà
  rating?: number;            // Đánh giá sao (1 -> 5)
  reason?: string;
  created_by?: string;
  created_at?: string;
}

export interface AttendanceRecordInput {
  student_id: string;
  student_name?: string;
  class_id?: string;
  start_time: string;
  planned_minutes?: number;
  status: "attended" | "absent_excused" | "absent_unexcused";
  teacher_notes?: string;
  homework?: string;
  rating?: number;
}

// 5. Đơn xin nghỉ của giáo viên & Phân công dạy thay
export interface TeacherLeave {
  id: string;
  school_id: string;
  teacher_id: string;
  teacher_name?: string;
  teacher_phone?: string;
  leave_date: string;
  shift_desc?: string;
  start_time?: string;
  end_time?: string;
  class_id?: string;
  class_name?: string;
  reason: string;
  substitute_teacher_id?: string;
  substitute_teacher_name?: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string;
  created_at?: string;
  updated_at?: string;
}

// 6. Lịch sử nhắc học phí nhanh qua Zalo & Bot
export interface TuitionReminder {
  id: string;
  school_id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string;
  month: string;
  amount: number;
  channel: "zalo_bot" | "zalo_manual";
  reminded_at: string;
  reminded_by?: string;
  note?: string;
}

export interface StudentReminderStatus {
  student_id: string;
  last_reminded_at: string | null;
  remind_count: number;
  is_reminded_today: boolean;
  last_channel: "zalo_bot" | "zalo_manual" | null;
}



