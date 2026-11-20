/**
 * db/client.ts — Kết nối SQLite duy nhất (singleton) và helper migration idempotent.
 */
import { createClient, Client } from "@libsql/client";
import path from "path";
import fs from "fs";
import { createLogger } from "@/lib/logger";

const log = createLogger("server/db");

let dbInstance: Client | null = null;

/**
 * Thực thi một câu lệnh migration (ALTER TABLE / CREATE INDEX) và bỏ qua lỗi
 * "đã tồn tại" — đây là hành vi idempotent có chủ đích của cơ chế in-code migration.
 */
export async function safeMigration(db: Client, sql: string): Promise<void> {
  try {
    await db.execute(sql);
  } catch {
    // Bỏ qua có chủ đích: cột/index đã tồn tại (migration idempotent).
  }
}

export function getDb(): Client {
  if (!dbInstance) {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (err) {
        log.error("Error creating data directory:", { error: err });
      }
    }
    const dbPath = path.join(dataDir, "admin.db");
    dbInstance = createClient({
      url: `file:${dbPath}`,
    });
  }
  return dbInstance;
}
