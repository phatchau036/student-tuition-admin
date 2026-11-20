/**
 * db/index.ts — Điểm vào tầng dữ liệu: khởi tạo schema, migration và seed.
 *
 * Toàn bộ DDL nằm trong mã nguồn (không dùng file .sql rời). Mỗi lần server
 * khởi động hoặc request đầu tiên, initDb() chạy tuần tự:
 *   1. ensureCoreSchema   — CREATE TABLE IF NOT EXISTS + ALTER TABLE cột mới (lõi)
 *   2. ensureDomainSchema — CREATE TABLE IF NOT EXISTS cho bảng nghiệp vụ
 *   3. runDataMigrations  — backfill/chuẩn hóa dữ liệu nền
 *   4. seedDefaults       — cấu hình mặc định + dữ liệu khởi tạo
 */
import type { Client } from "@libsql/client";
import { getDb } from "./client";
import { ensureCoreSchema } from "./schema-core";
import { ensureDomainSchema } from "./schema-domain";
import { runDataMigrations } from "./schema-migrations";
import { seedDefaults } from "./seed";

export { getDb, safeMigration } from "./client";

export async function initDb(): Promise<void> {
  const db: Client = getDb();
  await ensureCoreSchema(db);
  await ensureDomainSchema(db);
  await runDataMigrations(db);
  await seedDefaults(db);
}

export async function clearAllData(): Promise<void> {
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
