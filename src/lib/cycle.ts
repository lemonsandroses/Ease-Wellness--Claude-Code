import type { CycleState, DayLog, Phase, Profile } from "@/types";
import { addDays, daysBetween, today } from "./date";

const BLEEDING = new Set(["light", "medium", "heavy"]);

/** First day of each distinct bleed run, oldest first. */
export function periodStarts(logs: DayLog[]): string[] {
  const bleedDays = logs
    .filter((l) => BLEEDING.has(l.bleeding))
    .map((l) => l.date)
    .sort();

  const starts: string[] = [];
  for (const date of bleedDays) {
    const prev = starts.length ? starts[starts.length - 1] : undefined;
    const isContinuation = bleedDays.includes(addDays(date, -1));
    if (!isContinuation && (!prev || daysBetween(prev, date) > 10)) starts.push(date);
  }
  return starts;
}

function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function phaseForDay(day: number, cycleLength: number, periodLength: number): Phase {
  if (day <= periodLength) return "menstrual";
  const ovulation = Math.round(cycleLength - 14);
  if (day < ovulation - 1) return "follicular";
  if (day <= ovulation + 1) return "ovulatory";
  return "luteal";
}

/**
 * Cycle position from logged data, falling back to the onboarding baseline.
 * `estimated` goes true when history is sparse or the logged cycles vary enough
 * that a precise day count would be a false promise — which is the common case
 * for irregular and PCOS-pattern cycles.
 */
export function computeCycleState(profile: Profile, logs: DayLog[], now = today()): CycleState {
  const starts = periodStarts(logs);
  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) lengths.push(daysBetween(starts[i - 1], starts[i]));

  const observedLength = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : undefined;
  const variance = lengths.length >= 2 ? stdev(lengths) : undefined;

  const anchor = starts.length ? starts[starts.length - 1] : profile.lastPeriodStart;
  const cycleLength = observedLength ?? profile.cycleLength;
  const periodLength = profile.periodLength;

  if (!anchor) {
    return { known: false, day: 0, phase: "follicular", estimated: true, cycleCount: 0 };
  }

  const elapsed = daysBetween(anchor, now);
  const day = ((elapsed % cycleLength) + cycleLength) % cycleLength || cycleLength;
  const overdue = elapsed >= cycleLength;

  // Sparse history, or cycles that swing by more than ~5 days, mean we present
  // the phase as an estimate rather than a precise day.
  const estimated = starts.length < 3 || (variance ?? 0) > 5 || overdue;

  const nextPeriodDate = addDays(anchor, cycleLength);

  return {
    known: true,
    day: elapsed >= 0 ? day : 1,
    phase: phaseForDay(day, cycleLength, periodLength),
    estimated,
    observedLength,
    variance,
    nextPeriodDate,
    daysUntilNext: daysBetween(now, nextPeriodDate),
    cycleCount: starts.length,
  };
}

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulatory: "Ovulatory",
  luteal: "Luteal",
};

export const PHASE_RANGE: Record<Phase, [number, number]> = {
  menstrual: [0, 0.18],
  follicular: [0.18, 0.46],
  ovulatory: [0.46, 0.57],
  luteal: [0.57, 1],
};
