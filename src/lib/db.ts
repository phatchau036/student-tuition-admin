import { createClient, Client } from "@libsql/client";
import path from "path";

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    const dbPath = path.join(process.cwd(), "data", "admin.db");
    dbInstance = createClient({
      url: `file:${dbPath}`,
    });
  }
  return dbInstance;
}

export async function initDb() {
  const db = getDb();

  // 0. Schools Table (Quản lý các trường / trung tâm khác nhau)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      address TEXT,
      phone TEXT,
      ip_restriction_enabled INTEGER DEFAULT 0,
      allowed_ips TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 0.1 School Admins Table (Tài khoản admin cho từng trường)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS school_admins (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 1. Settings Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Check if initial seeding has already been performed
  const initCheck = await db.execute("SELECT value FROM settings WHERE key = 'system_initialized'");
  if (initCheck.rows.length === 0) {
    const schoolsCheck = await db.execute("SELECT COUNT(*) as count FROM schools");
    if (Number(schoolsCheck.rows[0].count) === 0) {
      await db.execute({
        sql: "INSERT INTO schools (id, name, code, address, phone) VALUES (?, ?, ?, ?, ?)",
        args: ["school-default", "Trung Tâm Âm Nhạc & Nghệ Thuật Sáng Tạo", "TT-01", "123 Đường Sáng Tạo, Q.1", "0909123456"],
      });

      await db.execute({
        sql: "INSERT INTO school_admins (id, school_id, username, password, full_name) VALUES (?, ?, ?, ?, ?)",
        args: ["admin-1", "school-default", "admin", "123456", "Quản Trị Viên Cơ Sở 1"],
      });
    }

    // Mark system as initialized so deleted schools are never resurrected
    await db.execute({
      sql: "INSERT INTO settings (key, value) VALUES ('system_initialized', '1')",
    });
  }

  // 2. Teachers Table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      school_id TEXT DEFAULT 'school-default',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
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
      sort_order INTEGER NOT NULL DEFAULT 0
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

  // Migrations for school_id & ip restriction
  try { await db.execute("ALTER TABLE schools ADD COLUMN ip_restriction_enabled INTEGER DEFAULT 0"); } catch {}
  try { await db.execute("ALTER TABLE schools ADD COLUMN allowed_ips TEXT DEFAULT ''"); } catch {}
  try { await db.execute("ALTER TABLE teachers ADD COLUMN school_id TEXT DEFAULT 'school-default'"); } catch {}
  try { await db.execute("ALTER TABLE time_slots ADD COLUMN school_id TEXT DEFAULT 'school-default'"); } catch {}
  try { await db.execute("ALTER TABLE level_surcharges ADD COLUMN school_id TEXT DEFAULT 'school-default'"); } catch {}
  try { await db.execute("ALTER TABLE discount_presets ADD COLUMN school_id TEXT DEFAULT 'school-default'"); } catch {}
  try { await db.execute("ALTER TABLE students ADD COLUMN school_id TEXT DEFAULT 'school-default'"); } catch {}

  // Defaults for settings
  const defaults: [string, string][] = [
    ["base_tuition", "0"],
    ["duration_mode", "by_hours"],
    ["default_hours_per_week", "3"],
    ["default_sessions_per_week", "3"],
    ["default_study_time", "18:00 - 19:00"],
    ["max_students_per_slot", "10"],
    ["crowded_threshold_percent", "80"],
  ];

  for (const [key, val] of defaults) {
    const check = await db.execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: [key],
    });
    if (check.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO settings (key, value) VALUES (?, ?)",
        args: [key, val],
      });
    }
  }
}

export async function clearAllData() {
  const db = getDb();
  await db.execute("DELETE FROM makeup_classes");
  await db.execute("DELETE FROM student_monthly_tuitions");
  await db.execute("DELETE FROM students");
  await db.execute("DELETE FROM teachers");
  await db.execute("DELETE FROM level_surcharges");
  await db.execute("DELETE FROM time_slots");
  await db.execute("DELETE FROM discount_presets");
  await db.execute("UPDATE settings SET value = '0' WHERE key = 'base_tuition'");
}
