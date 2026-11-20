/**
 * class.ts — Kiểu dữ liệu domain class.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
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
