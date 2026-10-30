import { getDb } from "./db";
import { calcCycleGrant, parseRegisteredDaysToWeekdays } from "./tuition";

/* =========================================================================
 * VÍ GIỜ HỌC (HOUR WALLET) — Module trung tâm
 * Sổ cái hour_ledger là NGUỒN SỰ THẬT DUY NHẤT của số dư.
 * Mọi thay đổi = 1 dòng sổ cái mới. Không bao giờ UPDATE số dư trực tiếp.
 * Idempotency: UNIQUE index trên (ref_type, ref_id) chặn ghi trùng lặp.
 * ========================================================================= */

export interface StudentWalletInfo {
  weekdays: number[];
  minutesPerSession: number;
  subjectId?: string;
  startDate?: string;
}

export interface WalletBalance {
  balance_minutes: number;      // Tổng số dư từ sổ cái (CÓ THỂ ÂM)
  scheduled_makeup_minutes: number; // Tổng phút bù đã xếp nhưng chưa học
  available_minutes: number;    // = balance − scheduled_makeup (dùng được để xếp bù mới)
}

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAY_MS = 86400000;

function firstOfMonth(month: string): string {
  return `${month}-01`;
}

function nextMonthFirst(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

/**
 * Lấy kế hoạch học của học sinh: thứ học + phút/buổi.
 * Ưu tiên: student_plans → fallback suy ra từ schedule_details_json → registered_days.
 */
export async function getStudentWeekdays(studentId: string): Promise<StudentWalletInfo | null> {
  const db = getDb();

  // 1. Đọc từ student_plans nếu đã có
  const planRes = await db.execute({
    sql: "SELECT * FROM student_plans WHERE student_id = ? AND active = 1 LIMIT 1",
    args: [studentId],
  });
  if (planRes.rows.length > 0) {
    let weekdays: number[] = [];
    try {
      const parsed = JSON.parse(String(planRes.rows[0].weekdays_json || "[]"));
      if (Array.isArray(parsed)) weekdays = parsed.map(Number).filter(Boolean);
    } catch {}
    return {
      weekdays,
      minutesPerSession: Number(planRes.rows[0].minutes_per_session || 90),
      subjectId: planRes.rows[0].subject_id ? String(planRes.rows[0].subject_id) : undefined,
      startDate: planRes.rows[0].start_date ? String(planRes.rows[0].start_date) : undefined,
    };
  }

  // 2. Fallback: suy ra từ students.registered_days + schedule_details_json
  const stRes = await db.execute({
    sql: "SELECT registered_days, schedule_details_json, study_time_detail, subject_id, start_date, status FROM students WHERE id = ?",
    args: [studentId],
  });
  if (stRes.rows.length === 0) return null;
  const st = stRes.rows[0];

  const weekdays = parseRegisteredDaysToWeekdays(String(st.registered_days || ""));
  if (weekdays.length === 0) return null;

  // minutes_per_session: suy ra từ schedule_details_json (tổng tiếng/tuần / số buổi)
  let minutesPerSession = 90;
  try {
    const items = JSON.parse(String(st.schedule_details_json || "[]"));
    if (Array.isArray(items) && items.length > 0) {
      const totalMin = items.reduce((sum, it: any) => {
        if (!it.start_time || !it.end_time) return sum;
        const [sh, sm] = String(it.start_time).split(":").map(Number);
        const [eh, em] = String(it.end_time).split(":").map(Number);
        return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      }, 0);
      if (totalMin > 0) minutesPerSession = Math.round(totalMin / items.length);
    }
  } catch {}

  return {
    weekdays,
    minutesPerSession,
    subjectId: st.subject_id ? String(st.subject_id) : undefined,
    startDate: st.start_date ? String(st.start_date) : undefined,
  };
}

/**
 * Đảm bảo học sinh có dòng student_plans (tạo mới nếu chưa có).
 */
export async function ensureStudentPlan(studentId: string): Promise<StudentWalletInfo | null> {
  const existing = await getStudentWeekdays(studentId);
  if (existing) return existing;

  const info = await readStudentFallback(studentId);
  if (!info) return null;

  const db = getDb();
  await db.execute({
    sql: `INSERT INTO student_plans (id, student_id, weekdays_json, minutes_per_session, subject_id, start_date, active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(student_id) DO NOTHING`,
    args: [
      `plan-${studentId.slice(0, 8)}-${Date.now()}`,
      studentId,
      JSON.stringify(info.weekdays),
      info.minutesPerSession,
      info.subjectId || null,
      info.startDate || null,
    ],
  });
  return info;
}

// Helper fallback nội bộ (đọc students không ghi plans)
async function readStudentFallback(studentId: string): Promise<StudentWalletInfo | null> {
  const db = getDb();
  const stRes = await db.execute({
    sql: "SELECT registered_days, schedule_details_json, subject_id, start_date FROM students WHERE id = ?",
    args: [studentId],
  });
  if (stRes.rows.length === 0) return null;
  const st = stRes.rows[0];
  const weekdays = parseRegisteredDaysToWeekdays(String(st.registered_days || ""));
  if (weekdays.length === 0) return null;
  return {
    weekdays,
    minutesPerSession: 90,
    subjectId: st.subject_id ? String(st.subject_id) : undefined,
    startDate: st.start_date ? String(st.start_date) : undefined,
  };
}

/**
 * Cấp giờ cho 1 chu kỳ tháng (gọi khi ghi nhận đóng tiền).
 * Idempotent: nếu billing_cycles đã có (student_id, cycle_month) → bỏ qua không ghi lần 2.
 */
export async function grantCycleForPayment(p: {
  studentId: string;
  cycleMonth: string;      // 'YYYY-MM'
  startOverride?: string;  // 'YYYY-MM-DD' — dùng khi em vào học giữa tháng
  createdBy?: string;
}): Promise<{ granted: boolean; minutes: number; sessions: number; reason?: string }> {
  const db = getDb();

  // Idempotency: kiểm tra chu kỳ đã cấp chưa
  const existingCycle = await db.execute({
    sql: "SELECT id, granted_minutes FROM billing_cycles WHERE student_id = ? AND cycle_month = ? LIMIT 1",
    args: [p.studentId, p.cycleMonth],
  });
  if (existingCycle.rows.length > 0) {
    return {
      granted: false,
      minutes: Number(existingCycle.rows[0].granted_minutes || 0),
      sessions: 0,
      reason: "Chu kỳ này đã được cấp giờ trước đó (idempotent)",
    };
  }

  const info = await ensureStudentPlan(p.studentId);
  if (!info || info.weekdays.length === 0) {
    return { granted: false, minutes: 0, sessions: 0, reason: "Học sinh chưa có lịch học cố định" };
  }

  // start: ngày bắt đầu chu kỳ (nếu em vào giữa tháng → dùng start_date hoặc ngày đóng tiền)
  let startDate = firstOfMonth(p.cycleMonth);
  if (p.startOverride) {
    startDate = p.startOverride;
  } else if (info.startDate && info.startDate > firstOfMonth(p.cycleMonth) && info.startDate < nextMonthFirst(p.cycleMonth)) {
    startDate = info.startDate; // Em vào học giữa tháng này
  }
  const endDateExclusive = nextMonthFirst(p.cycleMonth);

  // Đọc ngày nghỉ lễ của trung tâm (dùng time_slots is_active = 0 hoặc setting riêng nếu có)
  const closedDates: string[] = [];
  try {
    const settingsRes = await db.execute({
      sql: "SELECT value FROM settings WHERE key = 'closed_dates_json'",
    });
    if (settingsRes.rows.length > 0) {
      const parsed = JSON.parse(String(settingsRes.rows[0].value || "[]"));
      if (Array.isArray(parsed)) closedDates.push(...parsed.map(String));
    }
  } catch {}

  const grant = calcCycleGrant({
    start: new Date(startDate + "T00:00:00Z"),
    endExclusive: new Date(endDateExclusive + "T00:00:00Z"),
    weekdays: info.weekdays,
    minutesPerSession: info.minutesPerSession,
    closedDates,
  });

  if (grant.sessions <= 0) {
    return { granted: false, minutes: 0, sessions: 0, reason: "Không có buổi học nào rơi vào chu kỳ này" };
  }

  const cycleId = `cyc-${p.studentId.slice(0, 8)}-${p.cycleMonth}-${Date.now().toString(36)}`;
  const ledgerId = `lg-${p.studentId.slice(0, 8)}-grant-${p.cycleMonth}`;

  await db.batch(
    [
      {
        sql: `INSERT INTO billing_cycles (id, student_id, cycle_month, start_date, end_date_exclusive,
                full_weeks, leftover_days, planned_sessions, granted_minutes, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          cycleId,
          p.studentId,
          p.cycleMonth,
          startDate,
          endDateExclusive,
          grant.fullWeeks,
          grant.leftoverDays,
          grant.sessions,
          grant.minutes,
          p.createdBy || "system",
        ],
      },
      {
        sql: `INSERT INTO hour_ledger (id, student_id, cycle_id, type, minutes, ref_type, ref_id, note, created_by)
              VALUES (?, ?, ?, 'GRANT', ?, 'payment', ?, ?, ?)`,
        args: [
          ledgerId,
          p.studentId,
          cycleId,
          grant.minutes,
          `${p.studentId}:${p.cycleMonth}`,
          `Cấp giờ tháng ${p.cycleMonth}: ${grant.fullWeeks} tuần + ${grant.leftoverDays} ngày = ${grant.sessions} buổi × ${info.minutesPerSession} phút`,
          p.createdBy || "system",
        ],
      },
    ],
    "write"
  );

  return { granted: true, minutes: grant.minutes, sessions: grant.sessions };
}

/**
 * Lấy số dư ví giờ của học sinh.
 * balance = SUM(minutes) từ hour_ledger.
 * scheduled_makeup = tổng phút các buổi bù đã xếp (status='scheduled') chưa học.
 * available = balance − scheduled_makeup (dùng để xếp bù mới).
 */
export async function getWalletBalance(studentId: string): Promise<WalletBalance> {
  const db = getDb();

  const balanceRes = await db.execute({
    sql: "SELECT COALESCE(SUM(minutes), 0) as balance FROM hour_ledger WHERE student_id = ?",
    args: [studentId],
  });
  const balance = Number(balanceRes.rows[0]?.balance || 0);

  const scheduledRes = await db.execute({
    sql: `SELECT COALESCE(SUM(planned_minutes), 0) as scheduled FROM lessons
          WHERE student_id = ? AND kind = 'makeup' AND status = 'scheduled'`,
    args: [studentId],
  });
  const scheduledMakeup = Number(scheduledRes.rows[0]?.scheduled || 0);

  return {
    balance_minutes: balance,
    scheduled_makeup_minutes: scheduledMakeup,
    available_minutes: balance - scheduledMakeup,
  };
}

/**
 * Ghi 1 dòng sổ cái mới (idempotent theo ref_type + ref_id).
 * Dùng db.batch để trong 1 transaction với các thao tác đi kèm nếu có.
 */
export async function appendLedger(p: {
  studentId: string;
  type: "CONSUME" | "REFUND" | "ADJUST" | "EXPIRE";
  minutes: number; // CÓ DẤU
  refType: string;
  refId: string;
  note: string;
  createdBy?: string;
  cycleId?: string;
}): Promise<{ ok: boolean; duplicate: boolean }> {
  const db = getDb();

  // Idempotency check trước
  const existing = await db.execute({
    sql: "SELECT id FROM hour_ledger WHERE ref_type = ? AND ref_id = ? LIMIT 1",
    args: [p.refType, p.refId],
  });
  if (existing.rows.length > 0) return { ok: true, duplicate: true };

  await db.execute({
    sql: `INSERT INTO hour_ledger (id, student_id, cycle_id, type, minutes, ref_type, ref_id, note, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      `lg-${p.studentId.slice(0, 8)}-${p.refType}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      p.studentId,
      p.cycleId || null,
      p.type,
      p.minutes,
      p.refType,
      p.refId,
      p.note,
      p.createdBy || "system",
    ],
  });
  return { ok: true, duplicate: false };
}

/**
 * Tính ngày kết thúc chu kỳ (ngày 1 tháng sau) từ chu kỳ 'YYYY-MM'.
 */
export function getCycleRange(cycleMonth: string): { start: string; endExclusive: string } {
  return { start: firstOfMonth(cycleMonth), endExclusive: nextMonthFirst(cycleMonth) };
}

/**
 * Kiểm tra 1 ngày có thuộc lịch học cố định của em không.
 */
export function isDateInPlan(dateIso: string, weekdays: number[]): boolean {
  const d = new Date(dateIso + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const wd = d.getUTCDay() === 0 ? 8 : d.getUTCDay() + 1;
  return weekdays.includes(wd);
}

// Re-export DAY_MS tiện dụng
export { DAY_MS };

interface CycleGrantLog {
  cycle: string;
  granted: boolean;
  minutes: number;
  sessions: number;
  reason?: string;
}

/**
 * Cấp giờ cho toàn bộ chu kỳ tháng trong khoảng [startPeriod, endPeriod].
 * Helper dùng chung cho payments API + SePay webhook. Lỗi không chặn luồng thanh toán.
 */
export async function grantHoursForPeriodUtil(
  studentId: string,
  startPeriod: string,
  endPeriod: string
): Promise<CycleGrantLog[]> {
  try {
    const { getNextMonthStr } = await import("./tuition");
    let cursor = startPeriod;
    let safety = 0;
    const results: CycleGrantLog[] = [];
    while (safety < 24) {
      const r = await grantCycleForPayment({ studentId, cycleMonth: cursor, createdBy: "sepay" });
      results.push({ cycle: cursor, ...r });
      if (cursor === endPeriod) break;
      cursor = getNextMonthStr(cursor);
      safety++;
    }
    return results;
  } catch (err) {
    console.error("grantHoursForPeriodUtil Error (không chặn thanh toán):", err);
    return [];
  }
}

/**
 * Lấy thời lượng 1 buổi học chuẩn (tính bằng phút) của học sinh.
 * Ưu tiên:
 * 1. Khớp từ schedule_details_json (nếu có dayName)
 * 2. Chia từ hours_per_week / sessions_per_week
 * 3. Đọc từ student_plans.minutes_per_session
 * 4. Đọc từ settings.default_minutes_per_session (mặc định: 90)
 */
export async function getStudentSessionMinutes(
  studentId: string,
  dayName?: string
): Promise<number> {
  const db = getDb();
  try {
    const stRes = await db.execute({
      sql: "SELECT registered_days, hours_per_week, sessions_per_week, schedule_details_json FROM students WHERE id = ?",
      args: [studentId],
    });
    if (stRes.rows.length > 0) {
      const st = stRes.rows[0];
      if (st.schedule_details_json) {
        try {
          const items = JSON.parse(String(st.schedule_details_json));
          if (Array.isArray(items) && items.length > 0) {
            const matched = dayName
              ? items.find((i: any) => String(i.day || "").toLowerCase() === dayName.toLowerCase())
              : items[0];
            const target = matched || items[0];
            if (target && target.hours) {
              const m = Math.round(Number(target.hours) * 60);
              if (m > 0) return m;
            }
            if (target && target.start_time && target.end_time) {
              const [sh, sm] = String(target.start_time).split(":").map(Number);
              const [eh, em] = String(target.end_time).split(":").map(Number);
              const diff = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
              if (diff > 0) return diff;
            }
          }
        } catch {}
      }
      const h = Number(st.hours_per_week || 0);
      const s = Number(st.sessions_per_week || 0);
      if (h > 0 && s > 0) {
        return Math.round((h / s) * 60);
      }
    }

    const planRes = await db.execute({
      sql: "SELECT minutes_per_session FROM student_plans WHERE student_id = ? AND active = 1 LIMIT 1",
      args: [studentId],
    });
    if (planRes.rows.length > 0 && Number(planRes.rows[0].minutes_per_session) > 0) {
      return Number(planRes.rows[0].minutes_per_session);
    }

    const setRes = await db.execute("SELECT value FROM settings WHERE key = 'default_minutes_per_session'");
    if (setRes.rows.length > 0 && Number(setRes.rows[0].value) > 0) {
      return Number(setRes.rows[0].value);
    }
  } catch {}

  return 90;
}

/**
 * Tự động đồng bộ các buổi báo nghỉ chưa được ghi vào sổ cái ví giờ học.
 * Giúp học sinh có sẵn các suất báo nghỉ trước đó lập tức có phút trong ví giờ.
 */
export async function syncPendingMakeupsToWallet(studentIds?: string[]): Promise<number> {
  const db = getDb();
  let synced = 0;
  try {
    let query = "SELECT id, student_id, absence_date, status FROM makeup_classes WHERE status = 'pending'";
    const args: any[] = [];
    if (studentIds && studentIds.length > 0) {
      query += ` AND student_id IN (${studentIds.map(() => "?").join(",")})`;
      args.push(...studentIds);
    }

    const pendingRes = await db.execute({ sql: query, args });
    for (const mk of pendingRes.rows) {
      const mkId = String(mk.id);
      const sid = String(mk.student_id);
      const absDate = String(mk.absence_date || "");

      // Kiểm tra xem đã có ledger với ref_id = mkId chưa
      const dup = await db.execute({
        sql: "SELECT id FROM hour_ledger WHERE ref_type = 'absence' AND ref_id = ? LIMIT 1",
        args: [mkId],
      });
      if (dup.rows.length > 0) continue;

      // Kiểm tra xem có phải đã được chuyển từ migrate-pending chưa
      const migCheck = await db.execute({
        sql: "SELECT id FROM hour_ledger WHERE ref_type = 'adjust' AND ref_id = ? LIMIT 1",
        args: [`migrate-pending-${sid}`],
      });
      if (migCheck.rows.length > 0) continue;

      const min = await getStudentSessionMinutes(sid);
      const ledgerId = `lg-${sid.slice(0, 8)}-abs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
      await db.execute({
        sql: `INSERT INTO hour_ledger (id, student_id, cycle_id, type, minutes, ref_type, ref_id, note, created_by)
              VALUES (?, ?, NULL, 'ADJUST', ?, 'absence', ?, ?, 'sync')`,
        args: [
          ledgerId,
          sid,
          min,
          mkId,
          `Báo nghỉ ngày ${absDate}: +${min} phút vào ví giờ bù`,
        ],
      });
      synced++;
    }
  } catch (err) {
    console.error("syncPendingMakeupsToWallet error:", err);
  }
  return synced;
}

