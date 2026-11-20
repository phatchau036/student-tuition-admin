/**
 * teacher.ts — Kiểu dữ liệu domain teacher.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
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
  password?: string; // Mật khẩu đăng nhập Cổng Giáo Viên (Mặc định: '123456')
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
