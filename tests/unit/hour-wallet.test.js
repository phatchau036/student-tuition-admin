/**
 * Unit test cho `calcCycleGrant` (Ví Giờ Học — tính số buổi/phút được cấp trong chu kỳ).
 *
 * Chạy: npm test
 * Sử dụng Node.js built-in test runner (`node:test`) — không phụ thuộc thư viện ngoài.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const DAY = 86400000;

/** Bản sao thuần của calcCycleGrant trong src/lib/tuition.ts để test độc lập TypeScript build. */
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
    if (
      !isNaN(d.getTime()) &&
      d >= p.start &&
      d < p.endExclusive &&
      p.weekdays.includes(weekdayOf(d))
    ) {
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

test("T11/2026 (1/11 là Chủ Nhật) — 2-4-6, 60 phút/buổi → 13 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-11-01"),
      endExclusive: D("2026-12-01"),
      weekdays: [2, 4, 6],
      minutesPerSession: 60,
    }),
    { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 13, minutes: 780 }
  );
});

test("T11/2026 — 3-5-7, 60 phút/buổi → 12 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-11-01"),
      endExclusive: D("2026-12-01"),
      weekdays: [3, 5, 7],
      minutesPerSession: 60,
    }),
    { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 12, minutes: 720 }
  );
});

test("T11/2026 — 2-4, 60 phút/buổi → 9 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-11-01"),
      endExclusive: D("2026-12-01"),
      weekdays: [2, 4],
      minutesPerSession: 60,
    }),
    { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 9, minutes: 540 }
  );
});

test("T12/2026 (1/12 là Thứ 3) — 2-4-6, 60 phút/buổi → 13 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-12-01"),
      endExclusive: D("2027-01-01"),
      weekdays: [2, 4, 6],
      minutesPerSession: 60,
    }),
    { days: 31, fullWeeks: 4, leftoverDays: 3, sessions: 13, minutes: 780 }
  );
});

test("T12/2026 — 3-5-7, 60 phút/buổi → 14 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-12-01"),
      endExclusive: D("2027-01-01"),
      weekdays: [3, 5, 7],
      minutesPerSession: 60,
    }),
    { days: 31, fullWeeks: 4, leftoverDays: 3, sessions: 14, minutes: 840 }
  );
});

test("T12/2026 — 2-4, 60 phút/buổi → 9 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-12-01"),
      endExclusive: D("2027-01-01"),
      weekdays: [2, 4],
      minutesPerSession: 60,
    }),
    { days: 31, fullWeeks: 4, leftoverDays: 3, sessions: 9, minutes: 540 }
  );
});

test("T02/2027 (28 ngày) — 2-4-6, 60 phút/buổi → 12 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2027-02-01"),
      endExclusive: D("2027-03-01"),
      weekdays: [2, 4, 6],
      minutesPerSession: 60,
    }),
    { days: 28, fullWeeks: 4, leftoverDays: 0, sessions: 12, minutes: 720 }
  );
});

test("Vào giữa tháng 15/11 — 2-4-6, 90 phút/buổi → 7 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-11-15"),
      endExclusive: D("2026-12-01"),
      weekdays: [2, 4, 6],
      minutesPerSession: 90,
    }),
    { days: 16, fullWeeks: 2, leftoverDays: 2, sessions: 7, minutes: 630 }
  );
});

test("Nghỉ lễ 04/11 + 18/11 — 2-4-6 → trừ 2 buổi", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-11-01"),
      endExclusive: D("2026-12-01"),
      weekdays: [2, 4, 6],
      minutesPerSession: 60,
      closedDates: ["2026-11-04", "2026-11-18"],
    }),
    { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 11, minutes: 660 }
  );
});

test("30 phút/buổi, 2-4-6 tháng 11 → 390 phút", () => {
  assert.deepEqual(
    calcCycleGrant({
      start: D("2026-11-01"),
      endExclusive: D("2026-12-01"),
      weekdays: [2, 4, 6],
      minutesPerSession: 30,
    }),
    { days: 30, fullWeeks: 4, leftoverDays: 2, sessions: 13, minutes: 390 }
  );
});
