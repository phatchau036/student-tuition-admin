/**
 * db/schema-migrations.ts — Migration dữ liệu nền (school_id, backfill, chuẩn hóa ví giờ).
 */
import type { Client } from "@libsql/client";
import { createLogger } from "@/lib/logger";
import { safeMigration } from "./client";

const log = createLogger("server/db");

export async function runDataMigrations(db: Client): Promise<void> {
  // Migrations for school_id & ip restriction
  await safeMigration(
    db,
    "ALTER TABLE schools ADD COLUMN ip_restriction_enabled INTEGER DEFAULT 0"
  );
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN allowed_ips TEXT DEFAULT ''");
  await safeMigration(
    db,
    "ALTER TABLE teachers ADD COLUMN school_id TEXT DEFAULT 'school-default'"
  );
  await safeMigration(db, "ALTER TABLE teachers ADD COLUMN assigned_slot_ids TEXT DEFAULT '[]'");
  await safeMigration(db, "ALTER TABLE teachers ADD COLUMN max_students INTEGER DEFAULT 10");
  await safeMigration(db, "ALTER TABLE teachers ADD COLUMN working_shifts_json TEXT DEFAULT '[]'");
  await safeMigration(
    db,
    "ALTER TABLE time_slots ADD COLUMN school_id TEXT DEFAULT 'school-default'"
  );
  await safeMigration(
    db,
    "ALTER TABLE level_surcharges ADD COLUMN school_id TEXT DEFAULT 'school-default'"
  );
  await safeMigration(
    db,
    "ALTER TABLE discount_presets ADD COLUMN school_id TEXT DEFAULT 'school-default'"
  );
  await safeMigration(
    db,
    "ALTER TABLE students ADD COLUMN school_id TEXT DEFAULT 'school-default'"
  );
  await safeMigration(db, "ALTER TABLE students ADD COLUMN student_code TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN tuition_package_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'studying'");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN status_date TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN expected_return_date TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN status_note TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN zalo_chat_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN start_date TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN discount_reason TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN subject_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN level_id TEXT DEFAULT NULL");
  // self-heal cho DB tạo trước khi mở rộng schema bảng students
  await safeMigration(db, "ALTER TABLE students ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN zalo_link TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN teacher_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN duration_mode TEXT DEFAULT 'by_hours'");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN sessions_per_week INTEGER DEFAULT 3");
  await safeMigration(db, "ALTER TABLE students ADD COLUMN hours_per_week REAL DEFAULT 3");
  await safeMigration(
    db,
    "ALTER TABLE students ADD COLUMN study_time_detail TEXT DEFAULT '18:00 - 19:00'"
  );
  await safeMigration(
    db,
    "ALTER TABLE students ADD COLUMN schedule_details_json TEXT DEFAULT '[]'"
  );
  await safeMigration(db, "ALTER TABLE students ADD COLUMN schedule_preset_name TEXT DEFAULT ''");
  await safeMigration(
    db,
    "ALTER TABLE students ADD COLUMN is_discount_enabled INTEGER NOT NULL DEFAULT 0"
  );
  await safeMigration(
    db,
    "ALTER TABLE students ADD COLUMN discount_percent REAL NOT NULL DEFAULT 0"
  );
  await safeMigration(db, "ALTER TABLE students ADD COLUMN created_at TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE teachers ADD COLUMN zalo_chat_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE teachers ADD COLUMN zalo_link TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE teachers ADD COLUMN password TEXT DEFAULT '123456'");
  await safeMigration(
    db,
    "ALTER TABLE student_monthly_tuitions ADD COLUMN items_json TEXT DEFAULT '[]'"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN makeup_teacher_id TEXT DEFAULT NULL"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN absence_start_time TEXT DEFAULT '18:00'"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN absence_end_time TEXT DEFAULT '19:30'"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN absence_minutes INTEGER DEFAULT 90"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN makeup_start_time TEXT DEFAULT NULL"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN makeup_end_time TEXT DEFAULT NULL"
  );
  await safeMigration(
    db,
    "ALTER TABLE makeup_classes ADD COLUMN makeup_minutes INTEGER DEFAULT 60"
  );
  await safeMigration(db, "ALTER TABLE makeup_classes ADD COLUMN lesson_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE makeup_classes ADD COLUMN student_name TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE makeup_classes ADD COLUMN student_phone TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE makeup_classes ADD COLUMN class_id TEXT DEFAULT NULL");
  // Backfill student_name and student_phone for legacy rows in makeup_classes
  try {
    await db.execute(`
        UPDATE makeup_classes 
        SET student_name = (SELECT name FROM students WHERE students.id = makeup_classes.student_id),
            student_phone = (SELECT phone FROM students WHERE students.id = makeup_classes.student_id)
        WHERE (student_name IS NULL OR student_name = '')
          AND student_id IN (SELECT id FROM students)
      `);
  } catch (err) {
    log.debug("Backfill student_name/student_phone cho makeup_classes thất bại", { error: err });
  }

  // Dọn dẹp các bản ghi hour_ledger bị cộng dư/trùng lặp do khác ref_type ('makeup_absence' vs 'absence')
  try {
    await db.execute(`
        DELETE FROM hour_ledger 
        WHERE ref_type = 'absence' 
          AND created_by = 'sync'
          AND ref_id IN (
            SELECT ref_id FROM hour_ledger WHERE ref_type = 'makeup_absence'
          )
      `);
    // Chuẩn hóa toàn bộ 'makeup_absence' về 'absence'
    await db.execute(`
        UPDATE hour_ledger 
        SET ref_type = 'absence' 
        WHERE ref_type = 'makeup_absence'
      `);
  } catch (err) {
    log.debug("Chuẩn hóa ref_type hour_ledger thất bại", { error: err });
  }
  await safeMigration(
    db,
    "ALTER TABLE student_monthly_tuitions ADD COLUMN receipt_number TEXT DEFAULT NULL"
  );
  await safeMigration(
    db,
    "ALTER TABLE student_payments ADD COLUMN receipt_number TEXT DEFAULT NULL"
  );
  await safeMigration(db, "ALTER TABLE students ADD COLUMN class_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE lessons ADD COLUMN class_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE lessons ADD COLUMN teacher_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE lessons ADD COLUMN teacher_notes TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE lessons ADD COLUMN homework TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE lessons ADD COLUMN rating INTEGER DEFAULT 5");
  await safeMigration(
    db,
    "ALTER TABLE classes ADD COLUMN teacher_assignments_json TEXT DEFAULT '[]'"
  );
  await safeMigration(
    db,
    "ALTER TABLE tuition_packages ADD COLUMN original_amount INTEGER DEFAULT 1000000"
  );
  await safeMigration(
    db,
    "ALTER TABLE tuition_packages ADD COLUMN discount_type TEXT DEFAULT 'none'"
  );
  await safeMigration(
    db,
    "ALTER TABLE tuition_packages ADD COLUMN discount_value INTEGER DEFAULT 0"
  );
  await safeMigration(db, "ALTER TABLE tuition_packages ADD COLUMN benefits TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE system_feedbacks ADD COLUMN images_json TEXT DEFAULT '[]'");
  await safeMigration(db, "ALTER TABLE system_feedbacks ADD COLUMN assignee_id TEXT DEFAULT NULL");
  await safeMigration(
    db,
    "ALTER TABLE system_feedbacks ADD COLUMN assignee_name TEXT DEFAULT NULL"
  );
  await safeMigration(
    db,
    "ALTER TABLE system_feedbacks ADD COLUMN assigned_at DATETIME DEFAULT NULL"
  );
  await safeMigration(
    db,
    "ALTER TABLE system_feedbacks ADD COLUMN completed_at DATETIME DEFAULT NULL"
  );
  await safeMigration(db, "ALTER TABLE system_feedbacks ADD COLUMN completed_by TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE sepay_transactions ADD COLUMN school_id TEXT DEFAULT NULL");
  try {
    await db.execute(`
        UPDATE sepay_transactions
        SET school_id = (SELECT s.school_id FROM students s WHERE s.id = sepay_transactions.student_id)
        WHERE (school_id IS NULL OR school_id = '')
          AND student_id IN (SELECT id FROM students)
      `);
  } catch (err) {
    log.debug("Backfill school_id cho sepay_transactions thất bại", { error: err });
  }

  // 17. Zalo Inbound Messages Table (Lưu tin nhắn người dùng gửi tới Bot để lấy Chat ID tức thì theo từng cơ sở)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS zalo_inbound_messages (
        id TEXT PRIMARY KEY,
        school_id TEXT DEFAULT 'school-default',
        chat_id TEXT NOT NULL,
        from_name TEXT NOT NULL,
        message_text TEXT DEFAULT '',
        received_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
}
