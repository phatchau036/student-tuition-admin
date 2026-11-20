/**
 * db.ts — Barrel tương thích, chuyển tiếp sang tầng `src/server/db`.
 * Code mới nên import từ `@/server/db`.
 */
export { getDb, initDb, clearAllData, safeMigration } from "@/server/db";
