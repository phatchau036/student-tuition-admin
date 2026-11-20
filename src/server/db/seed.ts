/**
 * db/seed.ts — Seed cấu hình mặc định và dữ liệu khởi tạo.
 */
import type { Client } from "@libsql/client";
import { createLogger } from "@/lib/logger";

const log = createLogger("server/db");

export async function seedDefaults(db: Client): Promise<void> {
  // Defaults for settings
  const defaults: [string, string][] = [
    ["base_tuition", "1000000"],
    ["duration_mode", "by_sessions"],
    ["default_hours_per_week", "4.5"],
    ["default_sessions_per_week", "3"],
    ["default_study_time", "18:00 - 19:00"],
    ["max_students_per_slot", "10"],
    ["crowded_threshold_percent", "80"],
    ["capacity_mode", "by_slot"],
    ["app_language", "vi"],
    ["reconciliation_mode", "manual"],
    ["sepay_prefix", "HP"],
    ["default_minutes_per_session", "90"], // ⭐ Ví Giờ: 1 buổi học mặc định = 90 phút (admin chỉnh được)
    ["deduct_unexcused", "true"], // Nghỉ không phép vẫn trừ giờ như đã học
    ["min_chunk_minutes", "30"], // Bội số nhỏ nhất khi xếp bù
    ["carry_over_expire_days", ""], // Rỗng = giờ dư không bao giờ hết hạn
    [
      "schedule_presets",
      JSON.stringify([
        {
          id: "preset-even",
          name: "Thứ chẵn (2-4-6)",
          days: ["Thứ 2", "Thứ 4", "Thứ 6"],
          hours_per_session: 1.5,
          default_start_time: "18:00",
          is_default: true,
        },
        {
          id: "preset-odd",
          name: "Thứ lẻ (3-5-7)",
          days: ["Thứ 3", "Thứ 5", "Thứ 7"],
          hours_per_session: 1.5,
          default_start_time: "18:00",
          is_default: false,
        },
        {
          id: "preset-weekend",
          name: "Cuối tuần (T7-CN)",
          days: ["Thứ 7", "Chủ Nhật"],
          hours_per_session: 2.0,
          default_start_time: "09:00",
          is_default: false,
        },
      ]),
    ],
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
    } else if (key === "base_tuition" && (check.rows[0].value === "0" || !check.rows[0].value)) {
      // Tự động khôi phục mức học phí chuẩn 1.000.000đ nếu đang bị set = 0
      await db.execute({
        sql: "UPDATE settings SET value = '1000000' WHERE key = 'base_tuition'",
      });
    }
  }

  // Tự động gán gói học phí chuẩn (Theo tháng) cho những học sinh chưa có gói học phí
  try {
    const pkg1mCheck = await db.execute(
      "SELECT id FROM tuition_packages WHERE cycle_unit = 'month' AND cycle_value = 1 LIMIT 1"
    );
    if (pkg1mCheck.rows.length > 0) {
      const defaultPkgId = String(pkg1mCheck.rows[0].id);
      await db.execute({
        sql: "UPDATE students SET tuition_package_id = ? WHERE tuition_package_id IS NULL OR tuition_package_id = ''",
        args: [defaultPkgId],
      });
    }
  } catch (err) {
    log.debug("Tự gán gói học phí mặc định cho học sinh thất bại", { error: err });
  }
  // Tự động seed một số thành viên mặc định cho TpTeam nếu chưa có
  try {
    const teamCheck = await db.execute("SELECT COUNT(*) as c FROM system_team_members");
    if (Number(teamCheck.rows[0].c) === 0) {
      await db.execute({
        sql: `INSERT INTO system_team_members (id, name, role, avatar_color) VALUES 
                ('mem-1', 'Thầy Phát', 'developer', 'purple'),
                ('mem-2', 'Admin Kỹ Thuật', 'manager', 'emerald')`,
      });
    }
  } catch (err) {
    log.debug("Seed thành viên TpTeam mặc định thất bại", { error: err });
  }
}
