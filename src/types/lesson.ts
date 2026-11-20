/**
 * lesson.ts — Kiểu dữ liệu domain lesson.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
export interface LessonRecord {
  id: string;
  student_id: string;
  student_name?: string;
  student_phone?: string;
  student_code?: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
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
  teacher_notes?: string; // Lời nhận xét tiến bộ của thầy cô
  homework?: string; // Bài tập về nhà
  rating?: number; // Đánh giá sao (1 -> 5)
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
