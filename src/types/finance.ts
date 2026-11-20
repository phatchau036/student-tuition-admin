/**
 * finance.ts — Kiểu dữ liệu domain finance.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
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
