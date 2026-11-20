/**
 * feedback.ts — Kiểu dữ liệu domain feedback.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
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
