import type { AppState, DayLog, Meal } from "@/types";
import { ACHIEVEMENTS } from "@/data/content";
import { addDays, daysBetween, today } from "./date";
import { periodStarts } from "./cycle";

export interface Streak {
  current: number;
  longest: number;
  dates: Set<string>;
}

export function computeStreak(logs: DayLog[], now = today()): Streak {
  const dates = new Set(logs.map((l) => l.date));
  if (!dates.size) return { current: 0, longest: 0, dates };

  // A streak stays alive if you logged today or yesterday.
  let cursor = dates.has(now) ? now : dates.has(addDays(now, -1)) ? addDays(now, -1) : null;
  let current = 0;
  while (cursor && dates.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...dates].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  return { current, longest: Math.max(longest, current), dates };
}

function mealsHitProteinFor(meals: Meal[], date: string): boolean {
  const total = meals.filter((m) => m.date === date).reduce((sum, m) => sum + m.protein, 0);
  return total >= 60;
}

function consecutiveDays(dates: string[], n: number, test: (d: string) => boolean): boolean {
  if (dates.length < n) return false;
  const sorted = [...new Set(dates)].sort();
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    const contiguous = i === 0 || daysBetween(sorted[i - 1], sorted[i]) === 1;
    run = contiguous && test(sorted[i]) ? run + 1 : test(sorted[i]) ? 1 : 0;
    if (run >= n) return true;
  }
  return false;
}

/** Ids the user currently qualifies for, regardless of when they were granted. */
export function qualifyingAchievements(state: AppState): Set<string> {
  const { logs, meals } = state;
  const streak = computeStreak(logs);
  const logDates = logs.map((l) => l.date);
  const earned = new Set<string>();

  for (const a of ACHIEVEMENTS) {
    if (a.threshold && streak.longest >= a.threshold) earned.add(a.id);
  }

  if (logs.length >= 1) earned.add("first_log");
  if (periodStarts(logs).length >= 2) earned.add("first_cycle");
  if (meals.length >= 25) earned.add("meals_25");
  if (meals.length >= 100) earned.add("meals_100");
  if (consecutiveDays(logDates, 7, (d) => mealsHitProteinFor(meals, d))) earned.add("protein_week");
  if (consecutiveDays(logDates, 7, (d) => !!logs.find((l) => l.date === d)?.movement)) earned.add("movement_week");

  if (logs.length >= 7) earned.add("consistent_7");
  if (logs.length >= 30) earned.add("consistent_30");
  if (logs.length >= 90) earned.add("consistent_90");

  const complete = logs.some(
    (l) => Object.keys(l.symptoms).length > 0 && l.energy && l.mood && l.sleepHours && l.stress,
  );
  if (complete) earned.add("full_day");

  if (logs.length >= 14) earned.add("first_pattern");

  return earned;
}

export const MILESTONES = ACHIEVEMENTS.filter((a) => a.threshold).map((a) => a.threshold!) as number[];

export function nextMilestone(current: number): number | null {
  return MILESTONES.find((m) => m > current) ?? null;
}
