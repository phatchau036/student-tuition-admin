"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AppLanguage } from "./types";

export interface Translations {
  // Navigation & Header
  school_portal: string;
  app_subtitle: string;
  admin_portal: string;
  teacher_portal: string;
  parent_portal: string;
  monthly_summary: string;
  status_log: string;
  absence_makeup: string;
  teachers_team: string;
  settings: string;
  app_info_feedback: string;
  add_student: string;
  logout: string;
  current_month: string;
  change_month: string;

  // KPIs
  expected_revenue: string;
  total_active_students: string;
  base_tuition: string;
  per_month: string;
  overridden_students: string;
  tuition_month: string;

  // Table Headers
  col_student: string;
  col_status: string;
  col_teacher: string;
  col_level_surcharge: string;
  col_package_schedule: string;
  col_discount: string;
  col_tuition: string;
  col_reconciliation: string;
  col_actions: string;

  // Statuses & Badges
  status_studying: string;
  status_reserved: string;
  status_dropped: string;
  paid: string;
  unpaid: string;
  overdue_alert: string;
  overdue_badge: string;
  total_due: string;
  past_debt: string;
  default_standard: string;
  custom_override: string;
  no_teacher_assigned: string;

  // Filters & Search
  search_placeholder: string;
  filter_all_levels: string;
  filter_all_slots: string;
  filter_all_teachers: string;
  filter_all_status: string;
  filter_all_payment: string;
  reset_filter: string;

  // Common Actions
  save: string;
  save_all_changes: string;
  cancel: string;
  close: string;
  confirm: string;
  delete: string;
  edit: string;
  today_now: string;
  view_details: string;
  send_reminder: string;

  // Capacity & Occupancy
  capacity_mode_slot: string;
  capacity_mode_teacher: string;
  slot_full: string;
  slot_crowded: string;
  slot_available: string;

  // Language names
  lang_vietnamese: string;
  lang_english: string;
  lang_chinese: string;
  lang_japanese: string;

  // New UI Elements
  branch_operations: string;
  tuition_packages_custom: string;
  packages_applied: string;
  all_tab: string;
  enrolled_tab: string;
  unpaid_tab: string;
  paid_tab: string;
  reserved_tab: string;
  search_input_placeholder: string;
  advanced_filter: string;
  filter_subject: string;
  filter_all_subjects: string;
  filter_teacher: string;
  filter_level: string;
  filter_slot: string;
  no_students_found: string;
  no_students_hint: string;
  loading_students: string;
  monthly_package: string;
  hours_per_week_unit: string;
  sessions_per_week_unit: string;
  flexible_hours_slot: string;
  past_debt_label: string;
  reconciliation_paid_badge: string;
  reconciliation_unpaid_badge: string;
  action_details: string;
  action_all: string;
  action_zalo_reminder: string;
  action_edit_fee: string;
  action_makeup: string;
  action_resume: string;
  action_reserve: string;
  action_edit_info: string;
  action_delete_student: string;
  excel_import_btn: string;
  excel_export_btn: string;
  month_picker_current: string;
  month_picker_close: string;
  month_picker_change: string;
}

export const DICTIONARY: Record<AppLanguage, Translations> = {
  vi: {
    school_portal: "Quản Trị Cơ Sở",
    app_subtitle: "Hệ thống quản lý học sinh, phân công giáo viên, theo dõi học phí & lịch học bù",
    admin_portal: "Cổng Admin",
    teacher_portal: "Cổng GV",
    parent_portal: "Cổng PH",
    monthly_summary: "Tổng Kết Tháng",
    status_log: "Log Biến Động",
    absence_makeup: "Báo Nghỉ & Học Bù",
    teachers_team: "Đội Ngũ Giáo Viên",
    settings: "Cài Đặt",
    app_info_feedback: "Giới Thiệu & Góp Ý",
    add_student: "Thêm Học Sinh",
    logout: "Đăng Xuất",
    current_month: "Hiện tại",
    change_month: "Thay đổi",

    expected_revenue: "Dự Thu",
    total_active_students: "học sinh đang theo học",
    base_tuition: "Học Phí Cơ Bản (Base)",
    per_month: "/ tháng",
    overridden_students: "học sinh có học phí tùy chỉnh tháng này",
    tuition_month: "Học phí",

    col_student: "Học sinh",
    col_status: "Trạng thái",
    col_teacher: "Giáo viên",
    col_level_surcharge: "Level & Phụ thu",
    col_package_schedule: "Gói & Lịch học",
    col_discount: "Chiết khấu",
    col_tuition: "Học phí",
    col_reconciliation: "Đối soát phí",
    col_actions: "Thao tác",

    status_studying: "Đang học",
    status_reserved: "Bảo lưu",
    status_dropped: "Nghỉ học",
    paid: "Đã đóng",
    unpaid: "Cần đóng tiền",
    overdue_alert: "Nợ quá hạn",
    overdue_badge: "Nợ",
    total_due: "Tổng phải nộp",
    past_debt: "Nợ cũ",
    default_standard: "Chuẩn mặc định",
    custom_override: "Đã sửa riêng",
    no_teacher_assigned: "Chưa gán GV",

    search_placeholder: "Tìm kiếm học sinh theo tên hoặc SĐT...",
    filter_all_levels: "Tất cả Trình độ (Level)",
    filter_all_slots: "Tất cả Khung giờ",
    filter_all_teachers: "Tất cả Giáo viên",
    filter_all_status: "Tất cả Trạng thái",
    filter_all_payment: "Tất cả Đối soát học phí",
    reset_filter: "Đặt lại",

    save: "Lưu",
    save_all_changes: "Lưu tất cả thay đổi",
    cancel: "Hủy bỏ",
    close: "Đóng",
    confirm: "Xác nhận",
    delete: "Xóa",
    edit: "Sửa",
    today_now: "Hôm nay (Hiện tại ngay)",
    view_details: "Xem chi tiết",
    send_reminder: "Nhắc học phí Zalo",

    capacity_mode_slot: "Theo Lớp / Giờ Mở Cửa",
    capacity_mode_teacher: "Theo Giáo Viên Đứng Lớp",
    slot_full: "Hết suất",
    slot_crowded: "Lớp đông",
    slot_available: "Còn chỗ",

    lang_vietnamese: "Tiếng Việt",
    lang_english: "Tiếng Anh (English)",
    lang_chinese: "Tiếng Trung (中文)",
    lang_japanese: "Tiếng Nhật (日本語)",

    branch_operations: "Nghiệp vụ cơ sở",
    tuition_packages_custom: "Gói học phí & Tùy chỉnh",
    packages_applied: "gói áp dụng",
    all_tab: "Tất cả",
    enrolled_tab: "Đang học",
    unpaid_tab: "Cần đóng tiền",
    paid_tab: "Đã nộp",
    reserved_tab: "Bảo lưu",
    search_input_placeholder: "Tìm học sinh, SĐT, mã...",
    advanced_filter: "Lọc nâng cao",
    filter_subject: "Môn học đào tạo:",
    filter_all_subjects: "-- Tất cả bộ môn --",
    filter_teacher: "Giáo viên:",
    filter_level: "Level / Trình độ:",
    filter_slot: "Ca mở cửa:",
    no_students_found: "Không tìm thấy học sinh nào",
    no_students_hint: 'Bấm nút "+ Thêm Học Sinh" ở góc trên bên phải để ghi danh học sinh mới vào hệ thống.',
    loading_students: "Đang tải danh sách học sinh...",
    monthly_package: "Gói Tháng",
    hours_per_week_unit: "h/tuần",
    sessions_per_week_unit: "buổi/tuần",
    flexible_hours_slot: "Linh hoạt trong ca mở cửa",
    past_debt_label: "Nợ {months} tháng (+{amount})",
    reconciliation_paid_badge: "Đã đóng",
    reconciliation_unpaid_badge: "Cần đóng tiền",
    action_details: "Chi tiết",
    action_all: "Tất cả thao tác",
    action_zalo_reminder: "Nhắc Zalo",
    action_edit_fee: "Sửa học phí tháng",
    action_makeup: "Báo nghỉ & học bù",
    action_resume: "Cho học tiếp",
    action_reserve: "Chuyển bảo lưu",
    action_edit_info: "Sửa thông tin",
    action_delete_student: "Xóa học sinh",
    excel_import_btn: "Nhập dữ liệu từ Excel (.xlsx)",
    excel_export_btn: "Xuất danh sách ra Excel (.xlsx)",
    month_picker_current: "Tháng hiện tại",
    month_picker_close: "Đóng",
    month_picker_change: "Thay đổi",
  },

  en: {
    school_portal: "School Management",
    app_subtitle: "Student tracking, teacher assignment, tuition billing & makeup scheduling system",
    admin_portal: "Admin Portal",
    teacher_portal: "Teacher",
    parent_portal: "Parents",
    monthly_summary: "Monthly Summary",
    status_log: "Status Logs",
    absence_makeup: "Absence & Makeups",
    teachers_team: "Faculty Teachers",
    settings: "Settings",
    app_info_feedback: "About & Feedback",
    add_student: "Add Student",
    logout: "Log Out",
    current_month: "Current",
    change_month: "Change",

    expected_revenue: "Expected Revenue",
    total_active_students: "active enrolled students",
    base_tuition: "Base Tuition Fee",
    per_month: "/ month",
    overridden_students: "students with custom fee this month",
    tuition_month: "Tuition",

    col_student: "Student",
    col_status: "Status",
    col_teacher: "Teacher",
    col_level_surcharge: "Level & Surcharge",
    col_package_schedule: "Package & Schedule",
    col_discount: "Discount",
    col_tuition: "Tuition",
    col_reconciliation: "Payment Audit",
    col_actions: "Actions",

    status_studying: "Enrolled",
    status_reserved: "Reserved",
    status_dropped: "Withdrawn",
    paid: "Paid",
    unpaid: "Payment Due",
    overdue_alert: "Overdue Debt",
    overdue_badge: "Debt",
    total_due: "Total Due",
    past_debt: "Past Debt",
    default_standard: "Standard Fee",
    custom_override: "Custom Fee",
    no_teacher_assigned: "Unassigned",

    search_placeholder: "Search student by name or phone...",
    filter_all_levels: "All Levels",
    filter_all_slots: "All Time Slots",
    filter_all_teachers: "All Teachers",
    filter_all_status: "All Statuses",
    filter_all_payment: "All Payment Statuses",
    reset_filter: "Reset Filters",

    save: "Save",
    save_all_changes: "Save All Changes",
    cancel: "Cancel",
    close: "Close",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    today_now: "Today (Right Now)",
    view_details: "View Details",
    send_reminder: "Send Zalo Reminder",

    capacity_mode_slot: "By Facility Shift Slot",
    capacity_mode_teacher: "By Individual Teacher",
    slot_full: "Fully Booked",
    slot_crowded: "Crowded",
    slot_available: "Available",

    lang_vietnamese: "Vietnamese (Tiếng Việt)",
    lang_english: "English",
    lang_chinese: "Chinese (中文)",
    lang_japanese: "Japanese (日本語)",

    branch_operations: "Operations",
    tuition_packages_custom: "Tuition Packages & Custom",
    packages_applied: "active packages",
    all_tab: "All",
    enrolled_tab: "Enrolled",
    unpaid_tab: "Payment Due",
    paid_tab: "Paid",
    reserved_tab: "Reserved",
    search_input_placeholder: "Search student, phone, code...",
    advanced_filter: "Advanced Filter",
    filter_subject: "Training Subject:",
    filter_all_subjects: "-- All Subjects --",
    filter_teacher: "Teacher:",
    filter_level: "Level / Grade:",
    filter_slot: "Time Slot:",
    no_students_found: "No students found",
    no_students_hint: 'Click "+ Add Student" button at the top right to enroll new students.',
    loading_students: "Loading students list...",
    monthly_package: "Monthly Plan",
    hours_per_week_unit: "hrs/week",
    sessions_per_week_unit: "sessions/week",
    flexible_hours_slot: "Flexible within shift",
    past_debt_label: "Overdue {months} months (+{amount})",
    reconciliation_paid_badge: "Paid",
    reconciliation_unpaid_badge: "Payment Due",
    action_details: "Details",
    action_all: "All Actions",
    action_zalo_reminder: "Zalo Alert",
    action_edit_fee: "Edit Monthly Fee",
    action_makeup: "Absence & Makeup",
    action_resume: "Resume Studying",
    action_reserve: "Reserve Status",
    action_edit_info: "Edit Profile",
    action_delete_student: "Delete Student",
    excel_import_btn: "Import Excel (.xlsx)",
    excel_export_btn: "Export Excel (.xlsx)",
    month_picker_current: "Current Month",
    month_picker_close: "Close",
    month_picker_change: "Change",
  },

  zh: {
    school_portal: "培训机构管理后台",
    app_subtitle: "学员档案、师资排课、学费核对与补课管理系统",
    admin_portal: "管理端",
    teacher_portal: "教师端",
    parent_portal: "家长端",
    monthly_summary: "月度总结",
    status_log: "学籍异动日志",
    absence_makeup: "请假与补课",
    teachers_team: "教师团队",
    settings: "系统设置",
    app_info_feedback: "关于与反馈",
    add_student: "添加学员",
    logout: "退出登录",
    current_month: "本月",
    change_month: "切换月份",

    expected_revenue: "本月预计学费",
    total_active_students: "位在读学员",
    base_tuition: "基准学费标准",
    per_month: "/ 月",
    overridden_students: "位学员本月有定制学费",
    tuition_month: "学费",

    col_student: "学员信息",
    col_status: "学籍状态",
    col_teacher: "任课教师",
    col_level_surcharge: "级别与附加费",
    col_package_schedule: "课程包与课表",
    col_discount: "优惠折扣",
    col_tuition: "学费金额",
    col_reconciliation: "缴费核销",
    col_actions: "操作",

    status_studying: "在读",
    status_reserved: "休学",
    status_dropped: "退学",
    paid: "已缴费",
    unpaid: "待缴费",
    overdue_alert: "欠费逾期",
    overdue_badge: "欠费",
    total_due: "应缴总额",
    past_debt: "往期欠款",
    default_standard: "默认标准",
    custom_override: "个别调整",
    no_teacher_assigned: "未分配教师",

    search_placeholder: "按姓名或手机号搜索学员...",
    filter_all_levels: "所有等级",
    filter_all_slots: "所有时间段",
    filter_all_teachers: "所有任课教师",
    filter_all_status: "所有学籍状态",
    filter_all_payment: "所有缴费状态",
    reset_filter: "重置筛选",

    save: "保存",
    save_all_changes: "保存全部更改",
    cancel: "取消",
    close: "关闭",
    confirm: "确认",
    delete: "删除",
    edit: "编辑",
    today_now: "今天 (立即填入)",
    view_details: "查看详情",
    send_reminder: "发送缴费提醒",

    capacity_mode_slot: "按校区开放课表",
    capacity_mode_teacher: "按任课教师负荷",
    slot_full: "名额已满",
    slot_crowded: "班级人数较多",
    slot_available: "名额充足",

    lang_vietnamese: "越南语 (Tiếng Việt)",
    lang_english: "英语 (English)",
    lang_chinese: "中文 (简体)",
    lang_japanese: "日语 (日本語)",

    branch_operations: "校区业务",
    tuition_packages_custom: "课时套餐与自定学费",
    packages_applied: "个适用套餐",
    all_tab: "全部",
    enrolled_tab: "在读",
    unpaid_tab: "待缴费",
    paid_tab: "已缴费",
    reserved_tab: "休学",
    search_input_placeholder: "搜索学员姓名、手机或学号...",
    advanced_filter: "高级筛选",
    filter_subject: "课程专业:",
    filter_all_subjects: "-- 全部专业 --",
    filter_teacher: "任课教师:",
    filter_level: "学习等级:",
    filter_slot: "开放课段:",
    no_students_found: "未找到符合条件的学员",
    no_students_hint: '请点击右上角 "+ 添加学员" 按钮进行新生入学注册。',
    loading_students: "正在加载学员列表...",
    monthly_package: "按月套餐",
    hours_per_week_unit: "小时/周",
    sessions_per_week_unit: "次/周",
    flexible_hours_slot: "开课时段内弹性安排",
    past_debt_label: "欠费 {months} 个月 (+{amount})",
    reconciliation_paid_badge: "已缴费",
    reconciliation_unpaid_badge: "待缴费",
    action_details: "详情",
    action_all: "全部操作",
    action_zalo_reminder: "提醒通知",
    action_edit_fee: "修改月度学费",
    action_makeup: "请假与补课",
    action_resume: "复学",
    action_reserve: "办理休学",
    action_edit_info: "修改信息",
    action_delete_student: "删除学员",
    excel_import_btn: "从 Excel 导入 (.xlsx)",
    excel_export_btn: "导出学员花名册 (.xlsx)",
    month_picker_current: "本月",
    month_picker_close: "关闭",
    month_picker_change: "切换",
  },

  ja: {
    school_portal: "スクール管理システム",
    app_subtitle: "生徒管理・講師アサイン・授業料対照・補講スケジューリング統合システム",
    admin_portal: "管理者ポータル",
    teacher_portal: "講師ポータル",
    parent_portal: "保護者ポータル",
    monthly_summary: "月次集計",
    status_log: "ステータス履歴",
    absence_makeup: "欠席・補講管理",
    teachers_team: "講師一覧",
    settings: "システム設定",
    app_info_feedback: "概要とご意見",
    add_student: "生徒を追加",
    logout: "ログアウト",
    current_month: "今月",
    change_month: "月を変更",

    expected_revenue: "当月見込授業料",
    total_active_students: "名の在籍生徒",
    base_tuition: "基本授業料",
    per_month: "/ 月",
    overridden_students: "名が当月個別授業料を設定中",
    tuition_month: "授業料",

    col_student: "生徒名",
    col_status: "在籍状態",
    col_teacher: "担当講師",
    col_level_surcharge: "レベル・加算金",
    col_package_schedule: "受講プラン・日程",
    col_discount: "割引率",
    col_tuition: "月額授業料",
    col_reconciliation: "納入照合",
    col_actions: "操作",

    status_studying: "在籍中",
    status_reserved: "休会中",
    status_dropped: "退会済",
    paid: "納入済",
    unpaid: "未納・請求",
    overdue_alert: "未納超過アラート",
    overdue_badge: "未納",
    total_due: "合計請求額",
    past_debt: "過月未納額",
    default_standard: "標準設定",
    custom_override: "個別変更済",
    no_teacher_assigned: "未設定",

    search_placeholder: "生徒名・電話番号で検索...",
    filter_all_levels: "全レベル",
    filter_all_slots: "全時間帯",
    filter_all_teachers: "全担当講師",
    filter_all_status: "全ステータス",
    filter_all_payment: "全納入状態",
    reset_filter: "条件リセット",

    save: "保存",
    save_all_changes: "すべての変更を保存",
    cancel: "キャンセル",
    close: "閉じる",
    confirm: "確認",
    delete: "削除",
    edit: "編集",
    today_now: "本日 (今すぐ設定)",
    view_details: "詳細を表示",
    send_reminder: "Zalo通知を送信",

    capacity_mode_slot: "開室時間枠による定員管理",
    capacity_mode_teacher: "担当講師別定員管理",
    slot_full: "満席",
    slot_crowded: "混雑中",
    slot_available: "空席あり",

    lang_vietnamese: "ベトナム語 (Tiếng Việt)",
    lang_english: "英語 (English)",
    lang_chinese: "中国語 (中文)",
    lang_japanese: "日本語",

    branch_operations: "教室業務",
    tuition_packages_custom: "料金プラン・個別調整",
    packages_applied: "件の適用プラン",
    all_tab: "すべて",
    enrolled_tab: "在籍中",
    unpaid_tab: "未納・請求",
    paid_tab: "納入済",
    reserved_tab: "休会中",
    search_input_placeholder: "生徒名・電話番号・IDで検索...",
    advanced_filter: "詳細絞り込み",
    filter_subject: "コース・科目:",
    filter_all_subjects: "-- 全科目 --",
    filter_teacher: "担当講師:",
    filter_level: "受講レベル:",
    filter_slot: "開講時間枠:",
    no_students_found: "生徒が見つかりませんでした",
    no_students_hint: "右上の「+ 生徒を追加」ボタンをクリックして新規登録してください。",
    loading_students: "生徒一覧を読み込み中...",
    monthly_package: "月額プラン",
    hours_per_week_unit: "時間/週",
    sessions_per_week_unit: "コマ/週",
    flexible_hours_slot: "時間枠内で柔軟に受講",
    past_debt_label: "{months}ヶ月分未納 (+{amount})",
    reconciliation_paid_badge: "納入済",
    reconciliation_unpaid_badge: "未納・請求",
    action_details: "詳細",
    action_all: "全操作",
    action_zalo_reminder: "連絡通知",
    action_edit_fee: "月謝変更",
    action_makeup: "欠席・補講",
    action_resume: "復会手続き",
    action_reserve: "休会手続き",
    action_edit_info: "情報編集",
    action_delete_student: "生徒削除",
    excel_import_btn: "Excelからインポート (.xlsx)",
    excel_export_btn: "Excelへエクスポート (.xlsx)",
    month_picker_current: "今月",
    month_picker_close: "閉じる",
    month_picker_change: "変更",
  },
};

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "vi",
  setLanguage: () => {},
  t: DICTIONARY.vi,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>("vi");

  useEffect(() => {
    // 1. Check local storage
    const saved = localStorage.getItem("app_language") as AppLanguage;
    if (saved && ["vi", "en", "zh", "ja"].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
    // Sync with html lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  };

  const t = DICTIONARY[language] || DICTIONARY.vi;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
