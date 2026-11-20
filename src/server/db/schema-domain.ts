/**
 * db/schema-domain.ts — Bảng nghiệp vụ: giáo viên, ca học, học sinh, tài chính, ví giờ, lớp học.
 */
import type { Client } from "@libsql/client";
import { safeMigration } from "./client";

export async function ensureDomainSchema(db: Client): Promise<void> {
  // 2. Teachers Table
  await db.execute(`
      CREATE TABLE IF NOT EXISTS teachers (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        password TEXT DEFAULT '123456',
        email TEXT,
        color TEXT DEFAULT 'indigo',
        specialty TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 3. Time Slots Table
  await db.execute(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        name TEXT NOT NULL,
        from_day TEXT DEFAULT 'Thứ 2',
        to_day TEXT DEFAULT 'Thứ 7',
        days TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        max_students INTEGER DEFAULT 10,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 4. Level Surcharges Table
  await db.execute(`
      CREATE TABLE IF NOT EXISTS level_surcharges (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        level_name TEXT NOT NULL,
        surcharge_amount INTEGER NOT NULL DEFAULT 0,
        surcharge_type TEXT DEFAULT 'fixed',
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);

  await safeMigration(
    db,
    "ALTER TABLE level_surcharges ADD COLUMN surcharge_type TEXT DEFAULT 'fixed'"
  );

  // 4.1 Subjects Table (Danh mục Bộ Môn / Chương Trình Học động)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT 'indigo',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 5. Discount Presets Table
  await db.execute(`
      CREATE TABLE IF NOT EXISTS discount_presets (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        percentage INTEGER NOT NULL,
        label TEXT NOT NULL
      );
    `);

  // 6. Students Table
  await db.execute(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        zalo_link TEXT,
        level_id TEXT NOT NULL,
        time_slot_id TEXT NOT NULL,
        teacher_id TEXT,
        duration_mode TEXT DEFAULT 'by_hours',
        sessions_per_week INTEGER DEFAULT 3,
        hours_per_week REAL DEFAULT 3,
        registered_days TEXT DEFAULT 'Thứ 2, Thứ 4, Thứ 6',
        study_time_detail TEXT DEFAULT '18:00 - 19:00',
        schedule_details_json TEXT DEFAULT '[]',
        schedule_preset_name TEXT DEFAULT '',
        is_discount_enabled INTEGER NOT NULL DEFAULT 0,
        discount_percent REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 7. Make Up Classes Table (Báo nghỉ & Học bù)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS makeup_classes (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        absence_date TEXT NOT NULL,
        absence_reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        makeup_date TEXT,
        makeup_time TEXT,
        makeup_slot_id TEXT,
        makeup_teacher_id TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 8. Monthly Overrides Table
  await db.execute(`
      CREATE TABLE IF NOT EXISTS student_monthly_tuitions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        month TEXT NOT NULL,
        amount INTEGER NOT NULL,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, month)
      );
    `);

  // 9. Tuition Packages Table (Danh mục Gói học phí: Theo tháng, Theo quý 3 tháng, Khóa 6 tháng, 24 tuần...)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS tuition_packages (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        name TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 1000000,
        original_amount INTEGER DEFAULT 1000000,
        cycle_unit TEXT NOT NULL DEFAULT 'month', -- 'month' | 'week'
        cycle_value INTEGER NOT NULL DEFAULT 1, -- 1, 3, 6, 24...
        discount_type TEXT DEFAULT 'none',
        discount_value INTEGER DEFAULT 0,
        benefits TEXT DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 10. Student Payments Table (Lịch sử thanh toán & chu kỳ hiệu lực công nợ)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS student_payments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        package_id TEXT,
        package_name TEXT,
        amount INTEGER NOT NULL,
        paid_date TEXT NOT NULL, -- YYYY-MM-DD
        start_period TEXT NOT NULL, -- YYYY-MM
        end_period TEXT NOT NULL, -- YYYY-MM
        status TEXT NOT NULL DEFAULT 'paid', -- 'paid' | 'unpaid'
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 11. Student Status Logs Table (Ghi nhận lịch sử bảo lưu, nghỉ học và trở lại học tiếp)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS student_status_logs (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        action_type TEXT NOT NULL, -- 'reserve' | 'drop' | 'resume'
        from_status TEXT NOT NULL, -- 'studying' | 'reserved' | 'dropped'
        to_status TEXT NOT NULL,   -- 'studying' | 'reserved' | 'dropped'
        effective_date TEXT NOT NULL, -- YYYY-MM-DD
        return_date TEXT, -- YYYY-MM-DD
        reason TEXT,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        month TEXT NOT NULL, -- YYYY-MM
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 12. SePay Transactions Table (Lưu vết giao dịch biến động số dư chuyển khoản tự động)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS sepay_transactions (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT NULL,
        gateway TEXT,
        transaction_date TEXT,
        account_number TEXT,
        sub_account TEXT,
        code TEXT,
        content TEXT NOT NULL,
        transfer_type TEXT NOT NULL DEFAULT 'in',
        transfer_amount INTEGER NOT NULL DEFAULT 0,
        reference_code TEXT,
        student_id TEXT,
        student_name TEXT,
        matched_period TEXT,
        status TEXT NOT NULL DEFAULT 'unmatched', -- 'matched' | 'unmatched' | 'ignored'
        raw_payload TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 13. Parent Feedbacks Table (Phụ huynh gửi ý kiến/góp ý cho Trung tâm)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS parent_feedbacks (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        student_name TEXT,
        parent_name TEXT,
        parent_phone TEXT,
        category TEXT DEFAULT 'teaching', -- teaching | facility | tuition | schedule | other
        rating INTEGER DEFAULT 5,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending | reviewed | resolved
        response_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 14. System Feedbacks Table (Trung tâm gửi góp ý cho Hệ thống TpTeam)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS system_feedbacks (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        school_name TEXT,
        school_code TEXT,
        sender_name TEXT,
        sender_contact TEXT,
        category TEXT DEFAULT 'feature_request', -- feature_request | bug_report | ui_ux | performance | other
        priority TEXT DEFAULT 'medium', -- low | medium | high
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending | in_progress | completed
        admin_reply TEXT,
        images_json TEXT DEFAULT '[]',
        assignee_id TEXT DEFAULT NULL,
        assignee_name TEXT DEFAULT NULL,
        assigned_at DATETIME DEFAULT NULL,
        completed_at DATETIME DEFAULT NULL,
        completed_by TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 14.1 System Team Members Table (Đội ngũ kỹ thuật / phát triển hệ thống TpTeam)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS system_team_members (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'developer', -- developer | tester | manager | support
        phone TEXT DEFAULT '',
        avatar_color TEXT DEFAULT 'purple',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 14.2 Classes Table (Quản lý các Lớp học, phòng học, sĩ số và thời khóa biểu)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL DEFAULT 'school-default',
        name TEXT NOT NULL,
        code TEXT,
        subject_id TEXT,
        teacher_id TEXT,
        max_students INTEGER DEFAULT 8,
        room TEXT DEFAULT '',
        schedule_json TEXT DEFAULT '[]',
        teacher_assignments_json TEXT DEFAULT '[]',
        color TEXT DEFAULT 'indigo',
        note TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 15. Student Plans Table (Kế hoạch học: thứ học + thời lượng mỗi buổi — "1 buổi = bao nhiêu phút")
  await db.execute(`
      CREATE TABLE IF NOT EXISTS student_plans (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL UNIQUE,
        weekdays_json TEXT NOT NULL DEFAULT '[2,4,6]',   -- 2..7 = Thứ 2..Thứ 7, 8 = Chủ Nhật
        minutes_per_session INTEGER NOT NULL DEFAULT 90, -- ⭐ Admin set 1 buổi = X phút (theo từng em)
        subject_id TEXT,
        start_date TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // 16. Billing Cycles Table (Chu kỳ tháng được cấp giờ)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS billing_cycles (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        cycle_month TEXT NOT NULL,              -- 'YYYY-MM'
        start_date TEXT NOT NULL,               -- YYYY-MM-DD (UTC)
        end_date_exclusive TEXT NOT NULL,       -- YYYY-MM-DD (ngày 1 tháng sau)
        full_weeks INTEGER NOT NULL DEFAULT 0,
        leftover_days INTEGER NOT NULL DEFAULT 0,
        planned_sessions INTEGER NOT NULL DEFAULT 0,
        granted_minutes INTEGER NOT NULL DEFAULT 0,
        paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        UNIQUE(student_id, cycle_month)
      );
    `);

  // 17. Hour Ledger Table (Sổ cái giờ — NGUỒN SỰ THẬT DUY NHẤT của số dư ví giờ)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS hour_ledger (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        cycle_id TEXT,
        type TEXT NOT NULL,                     -- GRANT | CONSUME | REFUND | ADJUST | EXPIRE
        minutes INTEGER NOT NULL,               -- CÓ DẤU: GRANT +, CONSUME −, ADJUST ±, EXPIRE −
        ref_type TEXT,                          -- payment | lesson | makeup | adjust | expire (idempotency)
        ref_id TEXT,                            -- ID tham chiếu (UNIQUE theo ref_type+ref_id)
        note TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_ledger_ref ON hour_ledger(ref_type, ref_id);`);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_ledger_student ON hour_ledger(student_id, created_at);`
  );

  // 18. Lessons Table (Buổi học thực tế & ngoại lệ — buổi cố định suy ra từ student_plans)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        date TEXT NOT NULL,                     -- YYYY-MM-DD
        start_time TEXT NOT NULL,               -- HH:MM
        planned_minutes INTEGER NOT NULL DEFAULT 90,
        actual_minutes INTEGER,                 -- Ghi khi điểm danh (mặc định = planned)
        slot_id TEXT,
        subject_id TEXT,
        kind TEXT NOT NULL DEFAULT 'regular',   -- regular | makeup
        status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | attended | absent_excused | absent_unexcused | cancelled
        reason TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, date, start_time)
      );
    `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(date, status);`);

  // 19. Teacher Leaves Table (Đơn xin nghỉ & phê duyệt dạy thay của giáo viên)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS teacher_leaves (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        teacher_id TEXT NOT NULL,
        leave_date TEXT NOT NULL,
        shift_desc TEXT,
        start_time TEXT,
        end_time TEXT,
        class_id TEXT,
        reason TEXT NOT NULL,
        substitute_teacher_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_teacher_leaves ON teacher_leaves(school_id, teacher_id, leave_date);`
  );

  // 20. Tuition Reminders Table (Lịch sử nhắc học phí nhanh qua Zalo & Bot)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS tuition_reminders (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL DEFAULT 'school-default',
        student_id TEXT NOT NULL,
        month TEXT NOT NULL,                  -- 'YYYY-MM'
        amount INTEGER NOT NULL DEFAULT 0,    -- Số tiền công nợ tại thời điểm nhắc
        channel TEXT NOT NULL DEFAULT 'zalo_manual', -- 'zalo_bot' | 'zalo_manual'
        reminded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reminded_by TEXT,                     -- Tên hoặc username nhân viên thực hiện
        note TEXT
      );
    `);
  await safeMigration(
    db,
    `CREATE INDEX IF NOT EXISTS idx_tuition_reminders ON tuition_reminders(school_id, month, student_id);`
  );
  await safeMigration(
    db,
    `CREATE INDEX IF NOT EXISTS idx_tuition_reminders_date ON tuition_reminders(reminded_at);`
  );
}
