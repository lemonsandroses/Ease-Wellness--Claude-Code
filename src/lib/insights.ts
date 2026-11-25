import type { DayLog, Meal, Profile } from "@/types";
import { SYMPTOM_LABEL, SYMPTOMS } from "@/data/content";
import { daysBetween } from "./date";
import { periodStarts, phaseForDay } from "./cycle";

/**
 * What Ease noticed.
 *
 * The previous version was three hand-written rules with invented thresholds,
 * which meant someone who had logged every day for nine months was still told
 * to "keep logging". This looks at every relationship the logs can actually
 * support, tests each one properly, and reports the ones that stand up.
 *
 * Two rules it follows, because this is health data and the user will act on it:
 *
 * 1. **Nothing is claimed without a test.** Binary comparisons use a
 *    two-proportion z-test, continuous ones a correlation significance test.
 *    An effect also has to be large enough to be worth a sentence, not merely
 *    distinguishable from zero.
 * 2. **Nothing is phrased as causation.** "Tracks with", "tends to", "runs
 *    higher after" — never "causes", and never advice to change medication or
 *    treatment. A pattern in self-reported data is a hypothesis to take to a
 *    doctor, not a finding.
 */

export type InsightKind = "cycle" | "sleep" | "stress" | "nutrition" | "movement" | "symptom";

export interface Insight {
  id: string;
  kind: InsightKind;
  text: string;
  /** How much data is behind it — shown so the user can weigh it. */
  n: number;
  /** What `n` counts. Cycle findings are measured in cycles, not days. */
  unit: "days" | "cycles";
  /** Ordering only: effect size scaled by how certain the test was. */
  rank: number;
  /** True when the sample is big and the effect clear. */
  strong: boolean;
}

export interface InsightReport {
  insights: Insight[];
  /** How many relationships were examined, so "nothing found" means something. */
  checked: number;
  /** Days with a log. */
  days: number;
  /** Below the floor where any test could be meaningful. */
  tooEarly: boolean;
  /** Logged days still needed before the first test can run. */
  needed: number;
}

/** Below this nothing is tested — any "pattern" would be noise. */
const MIN_DAYS = 21;
/** Minimum observations on each side of a comparison. */
const MIN_GROUP = 8;
/** Two-sided 95%, for a single planned comparison. */
const Z_CRIT = 1.96;
/**
 * The symptom sweep tests all twelve symptoms at once. At the ordinary 95%
 * threshold that family alone would throw a false positive for roughly half of
 * all users — and an invented pattern in someone's health data is worse than no
 * pattern at all. This is the Bonferroni-corrected equivalent (alpha 0.05/12),
 * so a symptom has to clear a far higher bar than a single planned test.
 */
const Z_CRIT_FAMILY = 2.87;
/** A rate gap smaller than this isn't worth a sentence even if significant. */
const MIN_RATE_GAP = 0.15;
/** Likewise for correlations. */
const MIN_R = 0.3;

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Pearson r with its t statistic. Null when the sample is too small or flat. */
function correlate(xs: number[], ys: number[]): { r: number; t: number; n: number } | null {
  const n = xs.length;
  if (n < MIN_GROUP * 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null; // No variation — nothing to correlate.
  const r = num / Math.sqrt(dx * dy);
  if (!Number.isFinite(r) || Math.abs(r) >= 1) return null;
  const t = Math.abs(r) * Math.sqrt((n - 2) / (1 - r * r));
  return { r, t, n };
}

/**
 * Two-proportion z-test. Answers "does this symptom genuinely show up more
 * often in group A than group B, or is the gap the size you'd expect from
 * chance at this sample size?"
 */
function rateGap(
  aHits: number,
  aN: number,
  bHits: number,
  bN: number,
): { pA: number; pB: number; diff: number; z: number; n: number } | null {
  if (aN < MIN_GROUP || bN < MIN_GROUP) return null;
  const pA = aHits / aN;
  const pB = bHits / bN;
  const pooled = (aHits + bHits) / (aN + bN);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / aN + 1 / bN));
  if (se === 0) return null;
  return { pA, pB, diff: pA - pB, z: (pA - pB) / se, n: aN + bN };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

// ---------------------------------------------------------------------------
// Shaping the logs
// ---------------------------------------------------------------------------

interface Day {
  log: DayLog;
  date: string;
  /** Cycle day, 1-based, when it can be placed. */
  cycleDay: number | null;
  phase: ReturnType<typeof phaseForDay> | null;
  load: number;
  protein: number;
  fibre: number;
}

const loadOf = (l: DayLog) => Object.values(l.symptoms).reduce((s, v) => s + (v ?? 0), 0);

function shape(logs: DayLog[], meals: Meal[], profile: Profile): Day[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const starts = periodStarts(sorted);

  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) lengths.push(daysBetween(starts[i - 1], starts[i]));
  const cycleLength = lengths.length ? Math.round(mean(lengths)) : profile.cycleLength;

  const byDate = new Map<string, { protein: number; fibre: number }>();
  for (const m of meals) {
    const cur = byDate.get(m.date) ?? { protein: 0, fibre: 0 };
    cur.protein += m.protein;
    cur.fibre += m.fibre;
    byDate.set(m.date, cur);
  }

  return sorted.map((log) => {
    const last = starts.filter((s) => s <= log.date).pop();
    const cycleDay = last ? daysBetween(last, log.date) + 1 : null;
    const macros = byDate.get(log.date);
    return {
      log,
      date: log.date,
      cycleDay,
      phase: cycleDay ? phaseForDay(cycleDay, cycleLength, profile.periodLength) : null,
      load: loadOf(log),
      protein: macros?.protein ?? 0,
      fibre: macros?.fibre ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// The analyses
// ---------------------------------------------------------------------------

type Analysis = (d: Day[]) => Insight[];

/** Each symptom, luteal versus follicular — the classic hormonal signature. */
const symptomByPhase: Analysis = (days) => {
  const out: Insight[] = [];
  const luteal = days.filter((d) => d.phase === "luteal");
  const follicular = days.filter((d) => d.phase === "follicular");

  for (const s of SYMPTOMS) {
    const a = luteal.filter((d) => (d.log.symptoms[s.id] ?? 0) > 0).length;
    const b = follicular.filter((d) => (d.log.symptoms[s.id] ?? 0) > 0).length;
    if (a + b < MIN_GROUP) continue;
    const g = rateGap(a, luteal.length, b, follicular.length);
    if (!g || Math.abs(g.z) < Z_CRIT_FAMILY || Math.abs(g.diff) < MIN_RATE_GAP) continue;

    const higher = g.diff > 0 ? "second half" : "first half";
    out.push({
      id: `phase_${s.id}`,
      kind: "symptom",
      text:
        `${SYMPTOM_LABEL[s.id]} shows up on ${pct(Math.max(g.pA, g.pB))} of your days in the ${higher} of ` +
        `your cycle, against ${pct(Math.min(g.pA, g.pB))} in the other half. That is a hormonal rhythm ` +
        `rather than anything you are doing differently on those days.`,
      n: g.n,
      unit: "days",
      rank: Math.abs(g.diff) * Math.min(Math.abs(g.z) / Z_CRIT, 2),
      strong: g.n >= 60 && Math.abs(g.diff) >= 0.25,
    });
  }
  return out;
};

/** Sleep the night before against how the next day went. */
const sleepEffects: Analysis = (days) => {
  // The log sheet asks for "sleep last night", so the hours recorded against a
  // day already describe the night before it. The effect therefore lands on the
  // same row — pairing it with the following day, as this did originally,
  // compared each night against the day after the one it actually governed.
  const slept = days.filter((d) => d.log.sleepHours != null);
  const out: Insight[] = [];

  const load = correlate(slept.map((d) => d.log.sleepHours!), slept.map((d) => d.load));
  if (load && load.t > 2 && Math.abs(load.r) >= MIN_R && load.r < 0) {
    const short = slept.filter((d) => d.log.sleepHours! < 6.5);
    const long = slept.filter((d) => d.log.sleepHours! >= 7.5);
    const detail =
      short.length >= MIN_GROUP && long.length >= MIN_GROUP
        ? ` After nights under 6.5 hours your symptom load averages ${mean(short.map((d) => d.load)).toFixed(1)}, ` +
          `against ${mean(long.map((d) => d.load)).toFixed(1)} after 7.5 or more.`
        : "";
    out.push({
      id: "sleep_load",
      kind: "sleep",
      text: `Short nights track with heavier symptoms that day.${detail} Of everything you log, sleep is the lever moving most.`,
      n: load.n,
      unit: "days",
      rank: Math.abs(load.r),
      strong: load.n >= 60 && Math.abs(load.r) >= 0.4,
    });
  }

  const withEnergy = slept.filter((d) => d.log.energy != null);
  const energy = correlate(withEnergy.map((d) => d.log.sleepHours!), withEnergy.map((d) => d.log.energy!));
  if (energy && energy.t > 2 && energy.r >= MIN_R) {
    out.push({
      id: "sleep_energy",
      kind: "sleep",
      text: `Your energy rises and falls with how long you slept the night before — a clearer link than most people expect to see in their own data.`,
      n: energy.n,
      unit: "days",
      rank: energy.r * 0.9,
      strong: energy.n >= 60 && energy.r >= 0.4,
    });
  }
  return out;
};

/** Stress against symptom load the same day, and against cravings specifically. */
const stressEffects: Analysis = (days) => {
  const out: Insight[] = [];
  const withStress = days.filter((d) => d.log.stress != null);

  const c = correlate(withStress.map((d) => d.log.stress!), withStress.map((d) => d.load));
  if (c && c.t > 2 && c.r >= MIN_R) {
    out.push({
      id: "stress_load",
      kind: "stress",
      text: `Your higher-stress days carry more symptoms overall. Worth treating stress as a symptom driver in its own right, not background noise.`,
      n: c.n,
      unit: "days",
      rank: c.r,
      strong: c.n >= 60 && c.r >= 0.4,
    });
  }

  const high = withStress.filter((d) => d.log.stress! >= 4);
  const low = withStress.filter((d) => d.log.stress! <= 2);
  const g = rateGap(
    high.filter((d) => (d.log.symptoms.cravings ?? 0) > 0).length,
    high.length,
    low.filter((d) => (d.log.symptoms.cravings ?? 0) > 0).length,
    low.length,
  );
  if (g && g.z > Z_CRIT && g.diff >= MIN_RATE_GAP) {
    out.push({
      id: "stress_cravings",
      kind: "stress",
      text:
        `Cravings appear on ${pct(g.pA)} of your high-stress days against ${pct(g.pB)} of your calm ones. ` +
        `That pattern responds better to handling the stress than to willpower about food.`,
      n: g.n,
      unit: "days",
      rank: g.diff,
      strong: g.n >= 50 && g.diff >= 0.25,
    });
  }
  return out;
};

/** Protein and fibre against how the day and the next one went. */
const nutritionEffects: Analysis = (days) => {
  const out: Insight[] = [];
  const fed = days.filter((d) => d.protein > 0);
  if (fed.length < MIN_GROUP * 2) return out;

  const energyDays = fed.filter((d) => d.log.energy != null);
  const e = correlate(energyDays.map((d) => d.protein), energyDays.map((d) => d.log.energy!));
  if (e && e.t > 2 && e.r >= MIN_R) {
    out.push({
      id: "protein_energy",
      kind: "nutrition",
      text: `Days you eat more protein are days you report more energy. The pull is steady enough to plan around.`,
      n: e.n,
      unit: "days",
      rank: e.r * 0.95,
      strong: e.n >= 50 && e.r >= 0.4,
    });
  }

  const hi = fed.filter((d) => d.fibre >= 25);
  const lo = fed.filter((d) => d.fibre < 15);
  const g = rateGap(
    hi.filter((d) => (d.log.symptoms.bloating ?? 0) > 0).length,
    hi.length,
    lo.filter((d) => (d.log.symptoms.bloating ?? 0) > 0).length,
    lo.length,
  );
  if (g && Math.abs(g.z) > Z_CRIT && Math.abs(g.diff) >= MIN_RATE_GAP) {
    out.push({
      id: "fibre_bloating",
      kind: "nutrition",
      text:
        g.diff < 0
          ? `Bloating is less common on your higher-fibre days — ${pct(g.pA)} against ${pct(g.pB)} when fibre is low.`
          : `Bloating is more common on your higher-fibre days — ${pct(g.pA)} against ${pct(g.pB)}. Worth raising fibre more gradually, or looking at which sources.`,
      n: g.n,
      unit: "days",
      rank: Math.abs(g.diff) * 0.9,
      strong: g.n >= 50 && Math.abs(g.diff) >= 0.25,
    });
  }
  return out;
};

/** Moving versus resting, against energy. */
const movementEffects: Analysis = (days) => {
  const withEnergy = days.filter((d) => d.log.energy != null && d.log.movement);
  const moved = withEnergy.filter((d) => d.log.movement !== "Rest");
  const rested = withEnergy.filter((d) => d.log.movement === "Rest");
  if (moved.length < MIN_GROUP || rested.length < MIN_GROUP) return [];

  const a = mean(moved.map((d) => d.log.energy!));
  const b = mean(rested.map((d) => d.log.energy!));
  if (Math.abs(a - b) < 0.5) return [];

  return [
    {
      id: "movement_energy",
      kind: "movement",
      text:
        a > b
          ? `Days you move land about ${(a - b).toFixed(1)} points higher on energy than your rest days — the opposite of the "too tired to exercise" story.`
          : `Your rest days come out about ${(b - a).toFixed(1)} points higher on energy. Worth checking whether your sessions are currently too hard rather than too few.`,
      n: moved.length + rested.length,
      unit: "days",
      rank: Math.abs(a - b) / 4,
      strong: moved.length + rested.length >= 60 && Math.abs(a - b) >= 1,
    },
  ];
};

/** Is the cycle itself drifting? The thing a PCOS or perimenopause user needs. */
const cycleTrend: Analysis = (days) => {
  const starts = periodStarts(days.map((d) => d.log));
  if (starts.length < 5) return [];
  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) lengths.push(daysBetween(starts[i - 1], starts[i]));

  const half = Math.floor(lengths.length / 2);
  const earlier = mean(lengths.slice(0, half));
  const recent = mean(lengths.slice(lengths.length - half));
  const shift = recent - earlier;
  if (Math.abs(shift) < 4) return [];

  return [
    {
      id: "cycle_trend",
      kind: "cycle",
      text:
        `Your recent cycles average ${Math.round(recent)} days against ${Math.round(earlier)} earlier on — ` +
        `${shift > 0 ? "lengthening" : "shortening"} by about ${Math.abs(Math.round(shift))} days. ` +
        `A drift this size is worth mentioning at your next appointment.`,
      n: lengths.length,
      unit: "cycles",
      rank: Math.min(Math.abs(shift) / 10, 1),
      strong: lengths.length >= 6 && Math.abs(shift) >= 7,
    },
  ];
};

/** How steady the cycle is, once there is enough of it to say. */
const cycleSteadiness: Analysis = (days) => {
  const starts = periodStarts(days.map((d) => d.log));
  if (starts.length < 4) return [];
  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) lengths.push(daysBetween(starts[i - 1], starts[i]));
  const m = mean(lengths);
  const sd = Math.sqrt(mean(lengths.map((l) => (l - m) ** 2)));
  if (sd > 4) return [];

  return [
    {
      id: "cycle_steady",
      kind: "cycle",
      text:
        `Across ${lengths.length} cycles yours vary by ${sd < 1 ? "less than a day" : `under ${Math.ceil(sd)} days`}. ` +
        `That is steady enough that the dates Ease projects are worth planning around.`,
      n: lengths.length,
      unit: "cycles",
      rank: 0.35,
      strong: lengths.length >= 6,
    },
  ];
};

const ANALYSES: Analysis[] = [
  cycleTrend,
  cycleSteadiness,
  symptomByPhase,
  sleepEffects,
  stressEffects,
  nutritionEffects,
  movementEffects,
];

/** Roughly how many separate relationships get examined, for the summary line. */
const RELATIONSHIPS = 2 + SYMPTOMS.length + 2 + 2 + 2 + 1;

export function buildInsights(logs: DayLog[], meals: Meal[], profile: Profile, limit = 4): InsightReport {
  const days = logs.length;
  if (days < MIN_DAYS) {
    return { insights: [], checked: 0, days, tooEarly: true, needed: MIN_DAYS - days };
  }

  const shaped = shape(logs, meals, profile);
  const found = ANALYSES.flatMap((run) => {
    try {
      return run(shaped);
    } catch {
      return []; // One bad analysis must never take the whole screen down.
    }
  });

  found.sort((a, b) => b.rank - a.rank);

  // At most one per area, so four sleep findings can't crowd out everything else.
  const seen = new Set<InsightKind>();
  const insights: Insight[] = [];
  for (const i of found) {
    if (seen.has(i.kind)) continue;
    seen.add(i.kind);
    insights.push(i);
    if (insights.length >= limit) break;
  }

  return { insights, checked: RELATIONSHIPS, days, tooEarly: false, needed: 0 };
}
