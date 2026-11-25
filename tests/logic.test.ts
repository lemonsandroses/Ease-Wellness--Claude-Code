/**
 * Regression tests for the pure logic underneath the UI.
 *
 * These exist because the screens are about to be redesigned. Everything here
 * is a rule the product depends on but which no screen enforces — if a rewrite
 * breaks one of them it does so silently, and the first person to notice is a
 * user being told the wrong day of her cycle.
 *
 *   npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { addDays, daysBetween, isAdult, lastNDays, toKey, fromKey } from "@/lib/date";
import { computeCycleState, phaseForDay, periodStarts, PHASE_RANGE } from "@/lib/cycle";
import { buildInsights } from "@/lib/insights";
import type { DayLog, Meal, Profile } from "@/types";

const profile = (over: Partial<Profile> = {}): Profile =>
  ({
    name: "Test",
    cycleLength: 28,
    periodLength: 5,
    focus: [],
    symptoms: [],
    subscribed: false,
    ...over,
  }) as Profile;

const bleed = (date: string): DayLog => ({
  date,
  bleeding: "medium",
  symptoms: {},
  loggedAt: `${date}T09:00:00.000Z`,
});

/** A logged day with no bleeding. `symptoms` is required on DayLog, never null. */
const day = (date: string, over: Partial<DayLog> = {}): DayLog => ({
  date,
  bleeding: "none",
  symptoms: {},
  loggedAt: `${date}T09:00:00.000Z`,
  ...over,
});

// ---------------------------------------------------------------- date -----

test("daysBetween is signed and symmetric", () => {
  assert.equal(daysBetween("2026-01-01", "2026-01-08"), 7);
  assert.equal(daysBetween("2026-01-08", "2026-01-01"), -7);
  assert.equal(daysBetween("2026-01-01", "2026-01-01"), 0);
});

test("addDays crosses month, year and leap-day boundaries", () => {
  assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29"); // 2028 is a leap year
  assert.equal(addDays("2027-02-28", 1), "2027-03-01"); // 2027 is not
});

test("date keys survive a round trip", () => {
  for (const k of ["2026-01-01", "2026-02-29", "2026-11-25", "2028-02-29"]) {
    const back = toKey(fromKey(k));
    if (k === "2026-02-29") continue; // not a real date; normalisation is fine
    assert.equal(back, k, `round trip failed for ${k}`);
  }
});

test("lastNDays returns n ascending days ending today", () => {
  const days = lastNDays(7, "2026-11-25");
  assert.equal(days.length, 7);
  assert.equal(days[0], "2026-11-19");
  assert.equal(days[6], "2026-11-25");
});

// ------------------------------------------------------- the 18+ gate -----

test("isAdult enforces 18 exactly, including the birthday boundary", () => {
  // Turns 18 on 2026-11-25.
  assert.equal(isAdult("2008-11-25", "2026-11-24"), false, "day before 18th birthday");
  assert.equal(isAdult("2008-11-25", "2026-11-25"), true, "on the 18th birthday");
  assert.equal(isAdult("2008-11-26", "2026-11-25"), false, "one day short");
  assert.equal(isAdult("1992-01-01", "2026-11-25"), true);
});

test("isAdult rejects missing, malformed and future dates", () => {
  assert.equal(isAdult(undefined), false);
  assert.equal(isAdult(""), false);
  assert.equal(isAdult("not-a-date"), false);
  assert.equal(isAdult("2030-01-01", "2026-11-25"), false, "born in the future");
});

test("isAdult handles a 29 February birthday", () => {
  // Born 2008-02-29; in non-leap 2026 the birthday effectively falls on 1 March.
  assert.equal(isAdult("2008-02-29", "2026-02-28"), false);
  assert.equal(isAdult("2008-02-29", "2026-03-01"), true);
});

// --------------------------------------------------------------- cycle -----

test("the first day of bleeding is day 1, not day 0", () => {
  // The off-by-one this guards against showed "Day 28 · Luteal" to someone
  // whose period had just started.
  const s = computeCycleState(profile(), [bleed("2026-11-25")], "2026-11-25");
  assert.equal(s.day, 1);
  assert.equal(s.phase, "menstrual");
  assert.equal(s.known, true);
  assert.equal(s.overdue, false);
});

test("cycle day advances one per day", () => {
  const logs = [bleed("2026-11-01")];
  assert.equal(computeCycleState(profile(), logs, "2026-11-01").day, 1);
  assert.equal(computeCycleState(profile(), logs, "2026-11-07").day, 7);
  assert.equal(computeCycleState(profile(), logs, "2026-11-28").day, 28);
});

test("an overdue cycle keeps counting instead of wrapping to day 1", () => {
  // A 45-day cycle is an ordinary PCOS month. Wrapping would bury the single
  // signal this app exists to surface.
  const s = computeCycleState(profile(), [bleed("2026-10-01")], "2026-11-14"); // day 45
  assert.equal(s.day, 45);
  assert.equal(s.overdue, true, "45 days into a 28-day cycle must read as overdue");
});

test("no logs means nothing is claimed about the cycle", () => {
  const s = computeCycleState(profile(), [], "2026-11-25");
  assert.equal(s.known, false, "must not invent a phase with no data");
});

test("a zero or negative cycle length cannot produce NaN", () => {
  for (const cycleLength of [0, -5]) {
    const s = computeCycleState(profile({ cycleLength }), [bleed("2026-11-20")], "2026-11-25");
    assert.ok(Number.isFinite(s.day), `day was ${s.day} for cycleLength ${cycleLength}`);
    assert.ok(!Number.isNaN(s.day));
  }
});

test("phaseForDay covers every day of a cycle with no gaps", () => {
  for (let d = 1; d <= 28; d++) {
    const p = phaseForDay(d, 28, 5);
    assert.ok(
      ["menstrual", "follicular", "ovulatory", "luteal"].includes(p),
      `day ${d} produced ${p}`,
    );
  }
  assert.equal(phaseForDay(1, 28, 5), "menstrual");
  assert.equal(phaseForDay(5, 28, 5), "menstrual", "last day of a 5-day period");
  assert.equal(phaseForDay(6, 28, 5), "follicular", "day after bleeding ends");
});

test("PHASE_RANGE tiles the whole cycle with no gaps or overlaps", () => {
  // These are fractions of a cycle, not day numbers, so they must run 0 -> 1
  // with each phase starting exactly where the previous one ended. A gap here
  // is a day the UI can render with no phase at all.
  const order = ["menstrual", "follicular", "ovulatory", "luteal"] as const;
  let prevEnd = 0;
  for (const phase of order) {
    const [start, end] = PHASE_RANGE[phase];
    assert.ok(start < end, `${phase} range is empty or inverted`);
    assert.equal(start, prevEnd, `${phase} does not begin where the previous phase ended`);
    prevEnd = end;
  }
  assert.equal(prevEnd, 1, "phases must cover the entire cycle");
});

test("periodStarts groups consecutive bleeding days into one start", () => {
  const logs = [
    bleed("2026-11-01"), bleed("2026-11-02"), bleed("2026-11-03"),
    bleed("2026-11-29"), bleed("2026-11-30"),
  ];
  assert.deepEqual(periodStarts(logs), ["2026-11-01", "2026-11-29"]);
});

test("periodStarts is order-independent", () => {
  const forward = [bleed("2026-11-01"), bleed("2026-11-02"), bleed("2026-11-29")];
  const shuffled = [bleed("2026-11-29"), bleed("2026-11-02"), bleed("2026-11-01")];
  assert.deepEqual(periodStarts(shuffled), periodStarts(forward));
});

// ------------------------------------------------------------ insights -----

test("insights stay silent until there is enough history", () => {
  const logs = Array.from({ length: 10 }, (_, i) => day(addDays("2026-11-01", i)));
  const r = buildInsights(logs, [], profile());
  assert.equal(r.tooEarly, true, "10 days must not produce findings");
  assert.equal(r.insights.length, 0);
  assert.ok(r.needed > 0, "must tell the user how much more is needed");
});

test("insights report no findings on pure noise", () => {
  // Deterministic pseudo-random so this test cannot flake.
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const logs: DayLog[] = Array.from({ length: 120 }, (_, i) =>
    day(addDays("2026-06-01", i), {
      bleeding: rand() < 0.15 ? "medium" : "none",
      energy: Math.round(rand() * 4) + 1,
      sleepHours: 4 + rand() * 5,
      stress: Math.round(rand() * 4) + 1,
      symptoms: rand() < 0.3 ? { bloating: 2 } : {},
    }),
  );

  const r = buildInsights(logs, [], profile());
  // The Bonferroni correction guards the symptom sweep, which tests all twelve
  // symptoms at once. At the ordinary 95% threshold that family alone would
  // throw a false positive for roughly half of all users. Descriptive cycle
  // findings are not part of that family and may legitimately appear here.
  const symptomFindings = r.insights.filter((i) => i.kind === "symptom");
  assert.equal(
    symptomFindings.length,
    0,
    `noise produced ${symptomFindings.length} symptom finding(s): ${symptomFindings
      .map((i) => i.text)
      .join(" | ")}`,
  );
  const effectFindings = r.insights.filter((i) =>
    ["sleep", "stress", "nutrition", "movement"].includes(i.kind),
  );
  assert.equal(
    effectFindings.length,
    0,
    `noise produced ${effectFindings.length} effect finding(s): ${effectFindings
      .map((i) => i.text)
      .join(" | ")}`,
  );
});

test("buildInsights never exceeds its limit and always reports what it checked", () => {
  const logs = Array.from({ length: 90 }, (_, i) =>
    day(addDays("2026-08-01", i), {
      bleeding: i % 30 < 4 ? "medium" : "none",
      energy: 3,
      sleepHours: 7,
    }),
  );
  const r = buildInsights(logs, [] as Meal[], profile(), 2);
  assert.ok(r.insights.length <= 2, "limit not respected");
  assert.ok(r.checked > 0, "checked count must be reported");
  assert.ok(r.days > 0);
});

test("buildInsights tolerates sparse input without throwing", () => {
  assert.doesNotThrow(() => buildInsights([], [], profile()));
  // A day logged with nothing but a date: every optional field absent.
  assert.doesNotThrow(() => buildInsights([day("2026-11-25")], [], profile()));
  // A long run of days where only bleeding was ever recorded.
  const sparse = Array.from({ length: 60 }, (_, i) => day(addDays("2026-09-01", i)));
  assert.doesNotThrow(() => buildInsights(sparse, [], profile()));
});
