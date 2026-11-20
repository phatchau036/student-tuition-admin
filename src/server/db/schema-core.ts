/**
 * db/schema-core.ts — Bảng lõi: schools, school_admins, admin_roles, settings + seed nền.
 * Chạy đầu tiên trong initDb(); thứ tự câu lệnh giữ nguyên bản gốc.
 */
import type { Client } from "@libsql/client";
import { createLogger } from "@/lib/logger";
import { safeMigration } from "./client";

const log = createLogger("server/db");

export async function ensureCoreSchema(db: Client): Promise<void> {
  // 0. Schools Table (Quản lý các trường / trung tâm khác nhau)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS schools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        school_type TEXT DEFAULT 'TT',
        street TEXT DEFAULT '',
        city TEXT DEFAULT 'TPHCM',
        branch_num TEXT DEFAULT '1',
        address TEXT,
        phone TEXT,
        domain TEXT DEFAULT '',
        subdomain TEXT DEFAULT '',
        zalo_bot_token TEXT DEFAULT '',
        zalo_bot_name TEXT DEFAULT '',
        zalo_admin_chat_id TEXT DEFAULT '',
        sepay_bank_name TEXT DEFAULT '',
        sepay_account_number TEXT DEFAULT '',
        sepay_api_key TEXT DEFAULT '',
        sepay_prefix TEXT DEFAULT 'HP',
        base_tuition INTEGER DEFAULT 1000000,
        schedule_presets TEXT DEFAULT '',
        ip_restriction_enabled INTEGER DEFAULT 0,
        allowed_ips TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // Migrate columns if needed
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN school_type TEXT DEFAULT 'TT'");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN street TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN city TEXT DEFAULT 'TPHCM'");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN branch_num TEXT DEFAULT '1'");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN domain TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN subdomain TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN zalo_bot_token TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN zalo_bot_name TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN zalo_admin_chat_id TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN parent_school_id TEXT DEFAULT NULL");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN sepay_bank_name TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN sepay_account_number TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN sepay_api_key TEXT DEFAULT ''");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN sepay_prefix TEXT DEFAULT 'HP'");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN base_tuition INTEGER DEFAULT 1000000");
  await safeMigration(db, "ALTER TABLE schools ADD COLUMN schedule_presets TEXT DEFAULT ''");

  // Migrate dữ liệu cài đặt cũ từ bảng settings sang cơ sở mặc định (school-default) nếu cột còn rỗng
  try {
    const defaultSettingsRes = await db.execute(
      "SELECT key, value FROM settings WHERE key IN ('sepay_bank_name', 'sepay_account_number', 'sepay_api_key', 'sepay_prefix', 'base_tuition', 'schedule_presets', 'zalo_bot_token', 'zalo_bot_name', 'zalo_admin_chat_id')"
    );
    const dMap: Record<string, string> = {};
    for (const r of defaultSettingsRes.rows) {
      dMap[String(r.key)] = String(r.value || "");
    }

    if (Object.keys(dMap).length > 0) {
      await db.execute({
        sql: `UPDATE schools 
                SET sepay_bank_name = CASE WHEN sepay_bank_name = '' OR sepay_bank_name IS NULL THEN ? ELSE sepay_bank_name END,
                    sepay_account_number = CASE WHEN sepay_account_number = '' OR sepay_account_number IS NULL THEN ? ELSE sepay_account_number END,
                    sepay_api_key = CASE WHEN sepay_api_key = '' OR sepay_api_key IS NULL THEN ? ELSE sepay_api_key END,
                    sepay_prefix = CASE WHEN sepay_prefix = '' OR sepay_prefix IS NULL THEN ? ELSE sepay_prefix END,
                    base_tuition = CASE WHEN base_tuition IS NULL OR base_tuition = 0 THEN ? ELSE base_tuition END,
                    schedule_presets = CASE WHEN schedule_presets = '' OR schedule_presets IS NULL THEN ? ELSE schedule_presets END,
                    zalo_bot_token = CASE WHEN zalo_bot_token = '' OR zalo_bot_token IS NULL THEN ? ELSE zalo_bot_token END,
                    zalo_bot_name = CASE WHEN zalo_bot_name = '' OR zalo_bot_name IS NULL THEN ? ELSE zalo_bot_name END,
                    zalo_admin_chat_id = CASE WHEN zalo_admin_chat_id = '' OR zalo_admin_chat_id IS NULL THEN ? ELSE zalo_admin_chat_id END
                WHERE id = 'school-default' OR id = (SELECT id FROM schools ORDER BY created_at ASC LIMIT 1)`,
        args: [
          dMap["sepay_bank_name"] || "",
          dMap["sepay_account_number"] || "",
          dMap["sepay_api_key"] || "",
          dMap["sepay_prefix"] || "HP",
          Number(dMap["base_tuition"]) || 1000000,
          dMap["schedule_presets"] || "",
          dMap["zalo_bot_token"] || "",
          dMap["zalo_bot_name"] || "",
          dMap["zalo_admin_chat_id"] || "",
        ],
      });
    }
  } catch (err) {
    log.debug("Backfill cấu hình từ settings sang schools thất bại", { error: err });
  }

  // Tự động kiểm tra và khởi tạo dữ liệu mẫu (Time Slots, Level, Giảm giá, Gói học phí, Bộ môn, Vai trò) cho các cơ sở mới
  try {
    const allSchools = await db.execute("SELECT id FROM schools");
    for (const sc of allSchools.rows) {
      const sId = String(sc.id);

      // 1. Time slots
      const slotsCount = await db.execute({
        sql: "SELECT COUNT(*) as c FROM time_slots WHERE school_id = ?",
        args: [sId],
      });
      if (Number(slotsCount.rows[0]?.c || 0) === 0) {
        await db.execute({
          sql: `INSERT INTO time_slots (id, school_id, name, from_day, to_day, days, start_time, end_time, max_students, is_active)
                  VALUES 
                  (?, ?, 'Ca Tối (2-4-6)', 'Thứ 2', 'Thứ 6', 'Thứ 2 – Thứ 6', '18:00', '19:30', 10, 1),
                  (?, ?, 'Ca Tối (3-5-7)', 'Thứ 3', 'Thứ 7', 'Thứ 3 – Thứ 7', '18:00', '19:30', 10, 1),
                  (?, ?, 'Ca Sáng T7', 'Thứ 7', 'Thứ 7', 'Thứ 7', '09:00', '11:00', 10, 1),
                  (?, ?, 'Ca Sáng CN', 'Chủ Nhật', 'Chủ Nhật', 'Chủ Nhật', '08:00', '11:30', 10, 1)`,
          args: [
            `slot-${sId}-1`,
            sId,
            `slot-${sId}-2`,
            sId,
            `slot-${sId}-3`,
            sId,
            `slot-${sId}-4`,
            sId,
          ],
        });
      }

      // 2. Level Surcharges
      const levelCount = await db.execute({
        sql: "SELECT COUNT(*) as c FROM level_surcharges WHERE school_id = ?",
        args: [sId],
      });
      if (Number(levelCount.rows[0]?.c || 0) === 0) {
        await db.execute({
          sql: `INSERT INTO level_surcharges (id, school_id, level_name, surcharge_amount, surcharge_type, sort_order)
                  VALUES 
                  (?, ?, 'Grade 1', 0, 'fixed', 1),
                  (?, ?, 'Grade 2', 100000, 'fixed', 2)`,
          args: [`lvl-${sId}-1`, sId, `lvl-${sId}-2`, sId],
        });
      }

      // 3. Discount Presets
      const discCount = await db.execute({
        sql: "SELECT COUNT(*) as c FROM discount_presets WHERE school_id = ?",
        args: [sId],
      });
      if (Number(discCount.rows[0]?.c || 0) === 0) {
        await db.execute({
          sql: `INSERT INTO discount_presets (id, school_id, percentage, label)
                  VALUES 
                  (?, ?, 10, 'Anh em ruột cùng học'),
                  (?, ?, 20, 'Đăng ký sớm'),
                  (?, ?, 50, 'Học sinh vượt khó')`,
          args: [`disc-${sId}-1`, sId, `disc-${sId}-2`, sId, `disc-${sId}-3`, sId],
        });
      }

      // 4. Tuition Packages
      const pkgCount = await db.execute({
        sql: "SELECT COUNT(*) as c FROM tuition_packages WHERE school_id = ?",
        args: [sId],
      });
      if (Number(pkgCount.rows[0]?.c || 0) === 0) {
        await db.execute({
          sql: `INSERT INTO tuition_packages (id, school_id, name, amount, original_amount, cycle_unit, cycle_value, discount_type, discount_value, benefits, is_active)
                  VALUES 
                  (?, ?, 'Học phí 1 tháng', 1000000, 1000000, 'month', 1, 'none', 0, '', 1),
                  (?, ?, 'Gói Khóa 3 tháng (-5%)', 2850000, 3000000, 'month', 3, 'percent', 5, 'Tặng 1 buổi học bù', 1)`,
          args: [`pkg-${sId}-1`, sId, `pkg-${sId}-2`, sId],
        });
      }

      // 5. Subjects
      const subCount = await db.execute({
        sql: "SELECT COUNT(*) as c FROM subjects WHERE school_id = ?",
        args: [sId],
      });
      if (Number(subCount.rows[0]?.c || 0) === 0) {
        await db.execute({
          sql: `INSERT INTO subjects (id, school_id, name, description, color, is_active)
                  VALUES 
                  (?, ?, 'Piano', 'Bộ môn Piano cơ bản & nâng cao', 'indigo', 1),
                  (?, ?, 'Guitar', 'Bộ môn Guitar đệm hát & cổ điển', 'amber', 1)`,
          args: [`sub-${sId}-1`, sId, `sub-${sId}-2`, sId],
        });
      }

      // 6. Admin Roles (RBAC)
      const roleCount = await db.execute({
        sql: "SELECT COUNT(*) as c FROM admin_roles WHERE school_id = ?",
        args: [sId],
      });
      if (Number(roleCount.rows[0]?.c || 0) === 0) {
        await db.execute({
          sql: `INSERT INTO admin_roles (id, school_id, name, description, permissions_json)
                  VALUES 
                  (?, ?, 'Nhân Viên Văn Phòng / Lễ Tân', 'Tiếp đón phụ huynh, thêm/sửa học sinh, xem ma trận lịch, tư vấn ca trống, điểm danh và xếp ca học bù.', ?),
                  (?, ?, 'Kế Toán / Thu Ngân', 'Xem học phí, công nợ, đối soát thu tiền, xuất biên lai điện tử, gửi nhắc nợ Zalo và xem tổng kết doanh thu tháng.', ?),
                  (?, ?, 'Quản Lý Đào Tạo / Giáo Vụ', 'Quản lý danh sách học sinh, quản lý lớp học, phân công giáo viên đứng lớp, quản lý bảo lưu/nghỉ học và lịch học bù.', ?)`,
          args: [
            `role-office-${sId}`,
            sId,
            JSON.stringify([
              "students.view",
              "students.create",
              "students.edit",
              "schedule.matrix",
              "attendance.manage",
              "makeups.manage",
              "schedule.consult",
            ]),
            `role-accountant-${sId}`,
            sId,
            JSON.stringify([
              "students.view",
              "tuition.view",
              "tuition.audit",
              "tuition.receipt",
              "tuition.remind",
              "revenue.reports",
            ]),
            `role-academic-${sId}`,
            sId,
            JSON.stringify([
              "students.view",
              "students.create",
              "students.edit",
              "students.status",
              "schedule.matrix",
              "attendance.manage",
              "makeups.manage",
            ]),
          ],
        });
      }
    }
  } catch (err) {
    log.error("Auto Seed Multi-Tenant Data Error:", { error: err });
  }

  // 0.1 School Admins Table (Tài khoản admin cho từng trường)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS school_admins (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role_id TEXT,
        phone TEXT,
        is_active INTEGER DEFAULT 1,
        is_owner INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // Migration cột mới cho school_admins nếu bảng đã tồn tại
  await safeMigration(db, "ALTER TABLE school_admins ADD COLUMN role_id TEXT;");
  await safeMigration(db, "ALTER TABLE school_admins ADD COLUMN phone TEXT;");
  await safeMigration(db, "ALTER TABLE school_admins ADD COLUMN is_active INTEGER DEFAULT 1;");
  await safeMigration(db, "ALTER TABLE school_admins ADD COLUMN is_owner INTEGER DEFAULT 0;");

  // 0.2 Admin Roles Table (Nhóm quyền / Vai trò của cơ sở)
  await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_roles (
        id TEXT PRIMARY KEY,
        school_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        permissions_json TEXT NOT NULL DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

  // Đảm bảo tài khoản admin khởi tạo có cờ is_owner = 1 (toàn quyền)
  // và nếu mỗi cơ sở chưa có tài khoản chủ cơ sở nào (hoặc các admin tạo từ /he-thong mà role_id là NULL),
  // tự động thiết lập admin đầu tiên của cơ sở đó làm Chủ Cơ Sở (is_owner = 1) để tránh bị gán thành Nhân viên
  try {
    await db.execute(
      "UPDATE school_admins SET is_owner = 1 WHERE (is_owner IS NULL OR is_owner = 0) AND (username = 'admin' OR id = 'admin-1' OR role_id IS NULL OR role_id = '')"
    );
  } catch (err) {
    log.debug("Không thể chuẩn hóa cờ is_owner cho tài khoản admin khởi tạo", { error: err });
  }

  // Đảm bảo mỗi trường luôn có ít nhất 1 Chủ cơ sở
  try {
    const allSchoolsRes = await db.execute("SELECT id FROM schools");
    for (const sc of allSchoolsRes.rows) {
      const sId = String(sc.id);
      const ownerCountRes = await db.execute({
        sql: "SELECT COUNT(*) as count FROM school_admins WHERE school_id = ? AND is_owner = 1",
        args: [sId],
      });
      if (Number(ownerCountRes.rows[0]?.count || 0) === 0) {
        // Nâng tài khoản admin đầu tiên của trường này lên làm Chủ Cơ Sở
        await db.execute({
          sql: "UPDATE school_admins SET is_owner = 1 WHERE id = (SELECT id FROM school_admins WHERE school_id = ? ORDER BY created_at ASC LIMIT 1)",
          args: [sId],
        });
      }
    }
  } catch (err) {
    log.warn("Không thể đảm bảo mỗi cơ sở có Chủ cơ sở", { error: err });
  }

  // Khởi tạo các vai trò mẫu cho cơ sở nếu chưa có vai trò nào
  try {
    const rolesCountRes = await db.execute("SELECT COUNT(*) as count FROM admin_roles");
    if (Number(rolesCountRes.rows[0]?.count || 0) === 0) {
      const defaultRoles = [
        {
          id: "role-preset-office",
          school_id: "school-default",
          name: "Nhân Viên Văn Phòng / Lễ Tân",
          description:
            "Tiếp đón phụ huynh, thêm/sửa học sinh, xem ma trận lịch, tư vấn ca trống, điểm danh và xếp ca học bù. Không xem doanh thu, không chỉnh sửa học phí, không quản trị nhân sự.",
          permissions_json: JSON.stringify([
            "students.view",
            "students.create",
            "students.edit",
            "schedule.matrix",
            "attendance.manage",
            "makeups.manage",
            "schedule.consult",
          ]),
        },
        {
          id: "role-preset-accountant",
          school_id: "school-default",
          name: "Kế Toán / Thu Ngân",
          description:
            "Xem học phí, công nợ, đối soát thu tiền, xuất biên lai điện tử, gửi nhắc nợ Zalo và xem tổng kết doanh thu tháng.",
          permissions_json: JSON.stringify([
            "students.view",
            "tuition.view",
            "tuition.audit",
            "tuition.receipt",
            "tuition.remind",
            "revenue.reports",
          ]),
        },
        {
          id: "role-preset-academic",
          school_id: "school-default",
          name: "Quản Lý Đào Tạo / Giáo Vụ",
          description:
            "Quản lý danh sách học sinh, quản lý lớp học, phân công giáo viên đứng lớp, quản lý bảo lưu/nghỉ học và lịch học bù.",
          permissions_json: JSON.stringify([
            "students.view",
            "students.create",
            "students.edit",
            "students.status",
            "schedule.matrix",
            "attendance.manage",
            "makeups.manage",
            "schedule.consult",
            "classes.manage",
            "teachers.manage",
          ]),
        },
      ];

      for (const r of defaultRoles) {
        await db.execute({
          sql: "INSERT OR IGNORE INTO admin_roles (id, school_id, name, description, permissions_json) VALUES (?, ?, ?, ?, ?)",
          args: [r.id, r.school_id, r.name, r.description, r.permissions_json],
        });
      }
    }
  } catch (err) {
    log.error("Init Default Roles Error:", { error: err });
  }

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
        args: [
          "school-default",
          "Trung Tâm Âm Nhạc & Nghệ Thuật Sáng Tạo",
          "TT-01",
          "123 Đường Sáng Tạo, Q.1",
          "0909123456",
        ],
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
}
