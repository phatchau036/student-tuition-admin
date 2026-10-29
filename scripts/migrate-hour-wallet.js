/**
 * MIGRATION SCRIPT: Chuyển đổi từ cơ chế "suất bù" sang "Ví Giờ Học" (Hour Wallet)
 *
 * Chạy an toàn nhiều lần (idempotent). Mỗi lần chạy:
 *   1. Tạo student_plans cho mọi học sinh từ schedule_details_json / registered_days.
 *   2. Mỗi suất bù pending cũ → 1 dòng ADJUST = pending × default_minutes (note: "Chuyển đổi từ suất bù cũ").
 *   3. Mỗi makeup_classes đã scheduled (chưa học) → 1 lesson kind='makeup' 60 phút.
 *   4. Mỗi tháng ĐÃ ĐÓNG tiền trong student_payments mà chưa có billing_cycle → GRANT theo công thức.
 *
 * Sử dụng:
 *   node scripts/migrate-hour-wallet.js            # Thực thi thật
 *   node scripts/migrate-hour-wallet.js --dry-run  # Chỉ in số liệu, không ghi DB
 */

const path = require("path");
const fs = require("fs");

const DRY_RUN = process.argv.includes("--dry-run");

// Tự tạo client nếu @libsql/client cài được
let createClient;
try {
  ({ createClient } = require("@libsql/client"));
} catch {
  console.error("❌ Chưa cài @libsql/client. Hãy chạy: npm install");
  process.exit(1);
}

const dbPath = path.join(process.cwd(), "data", "admin.db");
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Không tìm thấy database tại ${dbPath}`);
  process.exit(1);
}

const db = createClient({ url: `file:${dbPath}` });

const DAY = 86400000;
const WD = (d) => (d.getUTCDay() === 0 ? 8 : d.getUTCDay() + 1);

function calcCycleGrant(p) {
  const N = Math.round((p.endExclusive.getTime() - p.start.getTime()) / DAY);
  const fullWeeks = Math.floor(N / 7);
  const leftover = N % 7;
  let sessions = fullWeeks * p.weekdays.length;
  for (let i = 0; i < leftover; i++) {
    const d = new Date(p.start.getTime() + (fullWeeks * 7 + i) * DAY);
    if (p.weekdays.includes(WD(d))) sessions++;
  }
  for (const iso of p.closedDates ?? []) {
    const d = new Date(iso + "T00:00:00Z");
    if (!isNaN(d.getTime()) && d >= p.start && d < p.endExclusive && p.weekdays.includes(WD(d))) {
      sessions = Math.max(0, sessions - 1);
    }
  }
  return { days: N, fullWeeks, leftoverDays: leftover, sessions: Math.max(0, sessions), minutes: Math.max(0, sessions) * p.minutesPerSession };
}

function parseRegisteredDaysToWeekdays(registeredDays) {
  const result = [];
  const trimmed = (registeredDays || "").trim();
  if (!trimmed) return result;
  if (/T2[-_ ]*4[-_ ]*6/i.test(trimmed)) return [2, 4, 6];
  if (/T3[-_ ]*5[-_ ]*7/i.test(trimmed)) return [3, 5, 7];
  const dayMap = { "Thứ 2": 2, "Thứ 3": 3, "Thứ 4": 4, "Thứ 5": 5, "Thứ 6": 6, "Thứ 7": 7, "Chủ Nhật": 8 };
  for (const [dayName, num] of Object.entries(dayMap)) {
    if (trimmed.includes(dayName) && !result.includes(num)) result.push(num);
  }
  return result.sort((a, b) => a - b);
}

function nextMonthFirst(month) {
  const [y, m] = month.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

function firstOfMonth(month) {
  return `${month}-01`;
}

async function main() {
  console.log(`\n🔄 MIGRATION VÍ GIỜ HỌC ${DRY_RUN ? "(DRY RUN — không ghi DB)" : "(THỰC THI)"}\n`);
  console.log(`Database: ${dbPath}\n`);

  const stats = { plans: 0, adjusts: 0, adjustMinutes: 0, lessons: 0, grants: 0, grantMinutes: 0 };

  // Lấy default minutes từ settings
  const settingsRes = await db.execute("SELECT key, value FROM settings WHERE key = 'default_minutes_per_session'");
  const defaultMinutes = Number(settingsRes.rows[0]?.value || 90);
  console.log(`📋 default_minutes_per_session = ${defaultMinutes} phút/buổi\n`);

  // ---------- BƯỚC 1: Tạo student_plans ----------
  console.log("[1/4] Tạo student_plans từ lịch học hiện có...");
  const studentsRes = await db.execute("SELECT id, name, registered_days, schedule_details_json, subject_id, start_date, status FROM students WHERE status != 'dropped'");
  for (const st of studentsRes.rows) {
    const studentId = String(st.id);
    const planCheck = await db.execute({ sql: "SELECT id FROM student_plans WHERE student_id = ? LIMIT 1", args: [studentId] });
    if (planCheck.rows.length > 0) continue;

    const weekdays = parseRegisteredDaysToWeekdays(String(st.registered_days || ""));
    if (weekdays.length === 0) {
      console.log(`   ⚠️ Bỏ qua ${st.name} (${studentId}): không suy ra được thứ học`);
      continue;
    }

    let minutesPerSession = defaultMinutes;
    try {
      const items = JSON.parse(String(st.schedule_details_json || "[]"));
      if (Array.isArray(items) && items.length > 0) {
        const totalMin = items.reduce((sum, it) => {
          if (!it.start_time || !it.end_time) return sum;
          const [sh, sm] = String(it.start_time).split(":").map(Number);
          const [eh, em] = String(it.end_time).split(":").map(Number);
          return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        }, 0);
        if (totalMin > 0) minutesPerSession = Math.round(totalMin / items.length);
      }
    } catch {}

    if (!DRY_RUN) {
      await db.execute({
        sql: `INSERT INTO student_plans (id, student_id, weekdays_json, minutes_per_session, subject_id, start_date, active)
              VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(student_id) DO NOTHING`,
        args: [`plan-${studentId.slice(0, 8)}-${Date.now()}`, studentId, JSON.stringify(weekdays), minutesPerSession, st.subject_id ? String(st.subject_id) : null, st.start_date ? String(st.start_date) : null],
      });
    }
    stats.plans++;
    console.log(`   ✅ ${st.name}: weekdays [${weekdays.join(",")}] × ${minutesPerSession} phút/buổi`);
  }

  // ---------- BƯỚC 2: Chuyển suất bù pending cũ thành ADJUST ----------
  console.log("\n[2/4] Chuyển suất bù pending cũ → dòng ADJUST...");
  const pendingRes = await db.execute(`
    SELECT student_id, COUNT(*) as cnt FROM makeup_classes
    WHERE status = 'pending' GROUP BY student_id
  `);
  for (const row of pendingRes.rows) {
    const studentId = String(row.student_id);
    const cnt = Number(row.cnt || 0);
    const refId = `migrate-pending-${studentId}`;
    const dupCheck = await db.execute({ sql: "SELECT id FROM hour_ledger WHERE ref_type = 'adjust' AND ref_id = ? LIMIT 1", args: [refId] });
    if (dupCheck.rows.length > 0) continue;

    const adjustMinutes = cnt * defaultMinutes;
    if (!DRY_RUN) {
      await db.execute({
        sql: `INSERT INTO hour_ledger (id, student_id, cycle_id, type, minutes, ref_type, ref_id, note, created_by)
              VALUES (?, ?, NULL, 'ADJUST', ?, 'adjust', ?, 'Chuyển đổi từ ${cnt} suất bù cũ', 'migration')`,
        args: [`lg-${studentId.slice(0, 8)}-migrate-${Date.now()}`, studentId, adjustMinutes, refId],
      });
    }
    stats.adjusts++;
    stats.adjustMinutes += adjustMinutes;
    console.log(`   ✅ Student ${studentId}: ${cnt} suất → +${adjustMinutes} phút`);
  }

  // ---------- BƯỚC 3: Chuyển makeup_classes đã scheduled thành lessons ----------
  console.log("\n[3/4] Chuyển lịch bù đã scheduled → lessons (kind=makeup)...");
  const scheduledRes = await db.execute(`
    SELECT m.*, s.name as student_name FROM makeup_classes m
    LEFT JOIN students s ON m.student_id = s.id
    WHERE m.status = 'scheduled' AND m.makeup_date IS NOT NULL
  `);
  for (const mk of scheduledRes.rows) {
    const dupCheck = await db.execute({
      sql: "SELECT id FROM lessons WHERE student_id = ? AND date = ? AND start_time = ? AND kind = 'makeup' LIMIT 1",
      args: [String(mk.student_id), String(mk.makeup_date), String(mk.makeup_time || "18:00")],
    });
    if (dupCheck.rows.length > 0) continue;

    if (!DRY_RUN) {
      await db.execute({
        sql: `INSERT INTO lessons (id, student_id, date, start_time, planned_minutes, slot_id, kind, status, reason, created_by)
              VALUES (?, ?, ?, ?, 60, ?, 'makeup', 'scheduled', 'Chuyển đổi từ lịch bù cũ', 'migration')
              ON CONFLICT(student_id, date, start_time) DO NOTHING`,
        args: [
          `les-${String(mk.student_id).slice(0, 8)}-mk-${String(mk.makeup_date)}-${Date.now().toString(36)}`,
          String(mk.student_id),
          String(mk.makeup_date),
          String(mk.makeup_time || "18:00"),
          mk.makeup_slot_id ? String(mk.makeup_slot_id) : null,
        ],
      });
    }
    stats.lessons++;
    console.log(`   ✅ ${mk.student_name || mk.student_id}: bù ngày ${mk.makeup_date} lúc ${mk.makeup_time || "18:00"}`);
  }

  // ---------- BƯỚC 4: Cấp GRANT cho các tháng đã đóng nhưng chưa có billing_cycle ----------
  console.log("\n[4/4] Cấp GRANT cho các tháng đã đóng tiền (chưa có billing_cycle)...");
  const paidRes = await db.execute(`
    SELECT student_id, start_period, end_period FROM student_payments
    WHERE status = 'paid' GROUP BY student_id, start_period, end_period
  `);
  for (const pay of paidRes.rows) {
    const studentId = String(pay.student_id);
    let cursor = String(pay.start_period);
    const end = String(pay.end_period);
    let safety = 0;
    while (safety < 24) {
      const cycleCheck = await db.execute({
        sql: "SELECT id FROM billing_cycles WHERE student_id = ? AND cycle_month = ? LIMIT 1",
        args: [studentId, cursor],
      });
      if (cycleCheck.rows.length === 0) {
        const planRes = await db.execute({ sql: "SELECT weekdays_json, minutes_per_session FROM student_plans WHERE student_id = ? AND active = 1 LIMIT 1", args: [studentId] });
        if (planRes.rows.length > 0) {
          let weekdays = [];
          try { weekdays = JSON.parse(String(planRes.rows[0].weekdays_json || "[]")).map(Number); } catch {}
          const minsPerSession = Number(planRes.rows[0].minutes_per_session || defaultMinutes);
          const start = firstOfMonth(cursor) > String(pay.start_period) && firstOfMonth(cursor) <= String(pay.end_period) ? firstOfMonth(cursor) : String(pay.start_period) > firstOfMonth(cursor) ? String(pay.start_period) : firstOfMonth(cursor);
          const grant = calcCycleGrant({
            start: new Date(start + "T00:00:00Z"),
            endExclusive: new Date(nextMonthFirst(cursor) + "T00:00:00Z"),
            weekdays,
            minutesPerSession: minsPerSession,
          });
          if (grant.sessions > 0) {
            if (!DRY_RUN) {
              const cycleId = `cyc-${studentId.slice(0, 8)}-${cursor}-migrate`;
              await db.batch(
                [
                  {
                    sql: `INSERT INTO billing_cycles (id, student_id, cycle_month, start_date, end_date_exclusive, full_weeks, leftover_days, planned_sessions, granted_minutes, created_by)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'migration')`,
                    args: [cycleId, studentId, cursor, start, nextMonthFirst(cursor), grant.fullWeeks, grant.leftoverDays, grant.sessions, grant.minutes],
                  },
                  {
                    sql: `INSERT INTO hour_ledger (id, student_id, cycle_id, type, minutes, ref_type, ref_id, note, created_by)
                          VALUES (?, ?, ?, 'GRANT', ?, 'payment', ?, 'Cấp lại giờ tháng ${cursor} khi migration', 'migration')`,
                    args: [`lg-${studentId.slice(0, 8)}-grant-${cursor}`, studentId, cycleId, grant.minutes, `${studentId}:${cursor}`],
                  },
                ],
                "write"
              );
            }
            stats.grants++;
            stats.grantMinutes += grant.minutes;
            console.log(`   ✅ Student ${studentId} tháng ${cursor}: ${grant.sessions} buổi × ${minsPerSession} phút = ${grant.minutes} phút`);
          }
        }
      }
      if (cursor === end) break;
      const [y, m] = cursor.split("-").map(Number);
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      cursor = `${ny}-${String(nm).padStart(2, "0")}`;
      safety++;
    }
  }

  console.log("\n========== KẾT QUẢ MIGRATION ==========");
  console.log(`  student_plans tạo mới:     ${stats.plans}`);
  console.log(`  Dòng ADJUST (suất bù cũ):  ${stats.adjusts} (+${stats.adjustMinutes} phút)`);
  console.log(`  Lessons (bù đã scheduled): ${stats.lessons}`);
  console.log(`  Billing cycles + GRANT:    ${stats.grants} (+${stats.grantMinutes} phút)`);
  if (DRY_RUN) {
    console.log("\n⚠️ ĐÂY LÀ DRY RUN — KHÔNG CÓ GÌ ĐƯỢC GHI VÀO DATABASE.");
    console.log("   Chạy lại không có --dry-run để thực thi thật.");
  } else {
    console.log("\n✅ Migration hoàn tất! Chạy lại script này an toàn (idempotent).");
  }
}

main().catch((err) => {
  console.error("❌ Migration thất bại:", err);
  process.exit(1);
});
