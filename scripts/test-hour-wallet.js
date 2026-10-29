/**
 * Unit test cho calcCycleGrant (Ví Giờ Học)
 * Chạy: node scripts/test-hour-wallet.js
 * Không cần thư viện ngoài — tự assertion và in kết quả PASS/FAIL.
 */

const DAY = 86400000;

// Copy thuần của calcCycleGrant để test không phụ thuộc TypeScript build
function weekdayOf(d) {
  return d.getUTCDay() === 0 ? 8 : d.getUTCDay() + 1;
}

function calcCycleGrant(p) {
  const N = Math.round((p.endExclusive.getTime() - p.start.getTime()) / DAY);
  const fullWeeks = Math.floor(N / 7);
  const leftover = N % 7;
  let sessions = fullWeeks * p.weekdays.length;
  for (let i = 0; i < leftover; i++) {
    const d = new Date(p.start.getTime() + (fullWeeks * 7 + i) * DAY);
    if (p.weekdays.includes(weekdayOf(d))) sessions++;
  }
  for (const iso of p.closedDates ?? []) {
    const d = new Date(iso + "T00:00:00Z");
    if (!isNaN(d.getTime()) && d >= p.start && d < p.endExclusive && p.weekdays.includes(weekdayOf(d))) {
      sessions = Math.max(0, sessions - 1);
    }
  }
  return {
    days: N,
    fullWeeks,
    leftoverDays: leftover,
    sessions: Math.max(0, sessions),
    minutes: Math.max(0, sessions) * p.minutesPerSession,
  };
}

function D(iso) {
  return new Date(iso + "T00:00:00Z");
}

let passed = 0;
let failed = 0;

function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}\n     Expected: ${JSON.stringify(expected)}\n     Actual:   ${JSON.stringify(actual)}`);
  }
}

console.log("=== TEST CALC CYCLE GRANT (Ví Giờ Học) ===\n");

// --- Bảng test bắt buộc: mỗi buổi 60 phút, không nghỉ lễ ---
console.log("[T11/2026 — 1/11/2026 là Chủ Nhật]");
assert(
  "2-4-6 → 4 tuần + 2 ngày (CN 29, T2 30) → 13 buổi → 13 giờ",
  calcCycleGrant({ start: D("2026-11-01"), endExclusive: D("2026-12-01"), weekdays: [2, 4, 6], minutesPerSession: 60 }),
  { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 13, minutes: 780 }
);
assert(
  "3-5-7 → 4 tuần + 2 ngày → 12 buổi → 12 giờ",
  calcCycleGrant({ start: D("2026-11-01"), endExclusive: D("2026-12-01"), weekdays: [3, 5, 7], minutesPerSession: 60 }),
  { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 12, minutes: 720 }
);
assert(
  "2-4 → 4 tuần + 2 ngày → 9 buổi → 9 giờ",
  calcCycleGrant({ start: D("2026-11-01"), endExclusive: D("2026-12-01"), weekdays: [2, 4], minutesPerSession: 60 }),
  { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 9, minutes: 540 }
);

console.log("\n[T12/2026 — 1/12/2026 là Thứ 3]");
assert(
  "2-4-6 → 4 tuần + 3 ngày (T3 29, T4 30, T5 31) → 13 buổi → 13 giờ",
  calcCycleGrant({ start: D("2026-12-01"), endExclusive: D("2027-01-01"), weekdays: [2, 4, 6], minutesPerSession: 60 }),
  { days: 31, fullWeeks: 4, leftoverDays: 3, sessions: 13, minutes: 780 }
);
assert(
  "3-5-7 → 4 tuần + 3 ngày → 14 buổi → 14 giờ",
  calcCycleGrant({ start: D("2026-12-01"), endExclusive: D("2027-01-01"), weekdays: [3, 5, 7], minutesPerSession: 60 }),
  { days: 31, fullWeeks: 4, leftoverDays: 3, sessions: 14, minutes: 840 }
);
assert(
  "2-4 → 4 tuần + 3 ngày → 9 buổi → 9 giờ",
  calcCycleGrant({ start: D("2026-12-01"), endExclusive: D("2027-01-01"), weekdays: [2, 4], minutesPerSession: 60 }),
  { days: 31, fullWeeks: 4, leftoverDays: 3, sessions: 9, minutes: 540 }
);

console.log("\n[T02/2027 — 28 ngày]");
assert(
  "2-4-6 → 4 tuần + 0 ngày → 12 buổi → 12 giờ",
  calcCycleGrant({ start: D("2027-02-01"), endExclusive: D("2027-03-01"), weekdays: [2, 4, 6], minutesPerSession: 60 }),
  { days: 28, fullWeeks: 4, leftoverDays: 0, sessions: 12, minutes: 720 }
);

console.log("\n[Case mở rộng]");
// Vào giữa tháng: 15/11 (Chủ Nhật) đến 01/12 → 16 ngày = 2 tuần + 2 ngày; 2-4-6: 2*3 + CN 29 (không, CN không trong 2-4-6), T2 30 có → 6+1 = 7
assert(
  "Vào giữa tháng 15/11, 2-4-6, 90 phút/buổi → 7 buổi → 630 phút",
  calcCycleGrant({ start: D("2026-11-15"), endExclusive: D("2026-12-01"), weekdays: [2, 4, 6], minutesPerSession: 90 }),
  { days: 16, fullWeeks: 2, leftoverDays: 2, sessions: 7, minutes: 630 }
);
// Ngày nghỉ lễ: T11/2026, 2-4-6, nghỉ 2 ngày (04/11 = T4, 18/11 = T4)
assert(
  "Nghỉ lễ 04/11 + 18/11 (2 thứ T4), 2-4-6 → 13-2 = 11 buổi → 660 phút",
  calcCycleGrant({ start: D("2026-11-01"), endExclusive: D("2026-12-01"), weekdays: [2, 4, 6], minutesPerSession: 60, closedDates: ["2026-11-04", "2026-11-18"] }),
  { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 11, minutes: 660 }
);
// 30 phút mỗi buổi
assert(
  "30 phút/buổi, 2-4-6 tháng 11 → 13 buổi → 390 phút",
  calcCycleGrant({ start: D("2026-11-01"), endExclusive: D("2026-12-01"), weekdays: [2, 4, 6], minutesPerSession: 30 }),
  { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 13, minutes: 390 }
);

console.log(`\n=== KẾT QUẢ: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
