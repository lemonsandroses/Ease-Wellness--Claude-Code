import { useMemo, useState } from "react";
import { Lock, Trophy } from "lucide-react";
import { motion } from "motion/react";
import AnimatedNumber from "@/components/AnimatedNumber";
import ScreenTimeCard from "@/components/ScreenTimeCard";
import { fadeUp, pop, stagger } from "@/lib/motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, EmptyState, Eyebrow, Sheet } from "@/components/ui";
import { ACHIEVEMENTS, SYMPTOM_LABEL, SYMPTOMS } from "@/data/content";
import { computeCycleState, periodStarts, PHASE_LABEL } from "@/lib/cycle";
import { daysBetween, lastNDays, shortDate, today } from "@/lib/date";
import { computeStreak, nextMilestone, qualifyingAchievements } from "@/lib/progress";
import { buildInsights } from "@/lib/insights";
import { useStore } from "@/lib/store";
import type { Achievement, DayLog, Meal, Profile, SymptomId } from "@/types";

const RANGES = [
  { id: 7, label: "Week" },
  { id: 30, label: "Month" },
  { id: 180, label: "6 months" },
  { id: 365, label: "Year" },
] as const;

/* Chart series follow the brand ramp: gloss first, then plasma, then gilt.
   Three is the whole set on purpose — a fourth line on a phone-width chart
   is unreadable however it is coloured. */
const GLOSS = "#FF2D87";
const PLASMA = "#7B4DFF";
const GILT = "#E3B873";
const SERIES = [GLOSS, PLASMA, GILT];

export default function Patterns() {
  const { state } = useStore();
  const [range, setRange] = useState<number>(30);
  const [badge, setBadge] = useState<Achievement | null>(null);

  const streak = useMemo(() => computeStreak(state.logs), [state.logs]);
  const earned = useMemo(() => qualifyingAchievements(state), [state]);
  const cycle = useMemo(() => computeCycleState(state.profile, state.logs), [state.profile, state.logs]);

  const window = lastNDays(Math.min(range, 365));
  const logsInRange = useMemo(
    () => state.logs.filter((l) => window.includes(l.date)),
    [state.logs, window],
  );
  const mealsInRange = useMemo(
    () => state.meals.filter((m) => window.includes(m.date)),
    [state.meals, window],
  );

  const milestones = ACHIEVEMENTS.filter((a) => a.threshold);
  const next = nextMilestone(streak.longest);
  const badges = ACHIEVEMENTS.filter((a) => !a.threshold);

  const enough = state.logs.length >= 5;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
      <Eyebrow>Your journey</Eyebrow>
      <h1 className="display-xl lit mt-2 text-[42px]">
        {streak.current > 0 ? "Keep the streak going." : "Log today to start a streak."}
      </h1>

      <Card className="mt-5">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Current streak</Eyebrow>
            <p className="numeral mt-1.5 text-[60px] text-pearl">
              <AnimatedNumber value={streak.current} duration={900} />
            </p>
            <p className="text-[12px] text-ash">day{streak.current === 1 ? "" : "s"} in a row</p>
          </div>
          <div className="text-right">
            <Eyebrow>Best</Eyebrow>
            <p className="numeral mt-1.5 text-[32px] text-pearl">
              <AnimatedNumber value={streak.longest} duration={900} />
            </p>
          </div>
        </div>

        {next ? (
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-[12px] text-ash">
              <span>Next trophy at {next} days</span>
              <span>{Math.max(next - streak.current, 0)} to go</span>
            </div>
            <div className="hud-track mt-2 h-1.5 overflow-hidden rounded-full">
              <motion.div
                className="hud-fill h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((streak.current / next) * 100, 100)}%` }}
                transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], delay: 0.2 }}
              />
            </div>
          </div>
        ) : null}

        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          animate="show"
          className="no-bar -mx-5 mt-6 flex gap-3 overflow-x-auto px-5"
        >
          {milestones.map((m) => {
            const unlocked = earned.has(m.id);
            return (
              <motion.button
                key={m.id}
                variants={fadeUp}
                onClick={() => setBadge(m)}
                whileTap={{ scale: 0.95 }}
                className={`flex w-[92px] shrink-0 flex-col items-center gap-2 rounded-2xl border px-2 py-4 transition-colors ${
                  unlocked ? "border-gloss bg-gloss-veil" : "border-veil bg-slate"
                }`}
              >
                <motion.span
                  // Earned trophies land with a bounce; locked ones just sit there.
                  initial={unlocked ? { scale: 0.4, rotate: -12 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={pop}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    unlocked ? "bg-gloss text-white" : "bg-slate text-dusk"
                  }`}
                >
                  {unlocked ? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </motion.span>
                <span className="numeral text-[20px] text-pearl">{m.threshold}</span>
                <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-dusk">
                  days
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </Card>

      <section className="mt-5">
        <Eyebrow>Badges</Eyebrow>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {badges.map((b) => {
            const unlocked = earned.has(b.id);
            return (
              <button
                key={b.id}
                onClick={() => setBadge(b)}
                className={`card p-3.5 text-left transition-colors ${unlocked ? "" : "opacity-55"}`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    unlocked ? "bg-gloss-veil text-gloss" : "bg-slate text-dusk"
                  }`}
                >
                  {unlocked ? <Trophy className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className="mt-2.5 block text-[13.5px] font-semibold text-pearl">{b.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ash">{b.detail}</span>
              </button>
            );
          })}
        </div>
      </section>

      <header className="mt-10 flex items-baseline justify-between">
        <h2 className="display-xl lit text-[32px]">Health patterns</h2>
      </header>

      <div className="no-bar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            aria-current={range === r.id}
            className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
              range === r.id ? "border-pearl bg-pearl text-void" : "border-veil bg-slate text-silk"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!enough ? (
        <div className="mt-5">
          <EmptyState
            title="Log five days to unlock patterns"
            body="The charts need about five days of entries before they mean anything. This is a limit of the maths, not of your progress."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <CycleCard cycleCount={cycle.cycleCount} observed={cycle.observedLength} variance={cycle.variance} logs={state.logs} />

          <SymptomFrequency logs={logsInRange} />
          <SymptomTrend logs={logsInRange} ids={["acne", "hairfall", "inflammation"]} title="Skin and hair" />
          <SymptomTrend logs={logsInRange} ids={["cramps", "bloating", "headache"]} title="Pain and bloating" />
          <EnergySleep logs={logsInRange} />
          <MoodSpread logs={logsInRange} />
          <NutritionCard meals={mealsInRange} days={window.length} />
          <MovementCard logs={logsInRange} />
          {/* Device-derived, so it sits after the things you logged yourself. Renders
              nothing at all until the native Screen Time plugin is in the build. */}
          <ScreenTimeCard logs={logsInRange} />
          <Consistency logs={state.logs} />
          <Insights logs={state.logs} meals={state.meals} profile={state.profile} />
        </div>
      )}

      <Sheet open={!!badge} onClose={() => setBadge(null)} label="Badge">
        {badge ? (
          <div className="pb-2 text-center">
            <span
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                earned.has(badge.id) ? "bg-gloss text-white" : "bg-slate text-dusk"
              }`}
            >
              {earned.has(badge.id) ? <Trophy className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
            </span>
            <h2 className="display mt-4 text-[29px] text-pearl">{badge.title}</h2>
            <p className="mt-2 text-[14px] text-silk">{badge.detail}</p>
            <p className="mt-4 text-[12.5px] text-dusk">
              {earned.has(badge.id)
                ? state.achievements[badge.id]
                  ? `Earned ${shortDate(state.achievements[badge.id])}`
                  : "Earned"
                : "Not yet earned"}
            </p>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="mt-4 h-[168px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const axis = { stroke: "#B4A8C8", fontSize: 11, tickLine: false } as const;

/* Recharts ships a white tooltip with dark text — invisible intent on an
   obsidian page. One shared style so every chart reads the same. */
const tooltipStyle = {
  contentStyle: {
    background: "rgba(20, 14, 34, 0.96)",
    border: "1px solid #38294F",
    borderRadius: 14,
    boxShadow: "0 18px 44px -20px rgba(0,0,0,0.9)",
    fontSize: 12,
  },
  labelStyle: { color: "#F6F1F8", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "#C8BDD8" },
} as const;

function CycleCard({
  cycleCount,
  observed,
  variance,
  logs,
}: {
  cycleCount: number;
  observed?: number;
  variance?: number;
  logs: DayLog[];
}) {
  const starts = periodStarts(logs);
  const data = starts.slice(1).map((s, i) => ({
    label: shortDate(s),
    length: daysBetween(starts[i], s),
  }));
  const remaining = Math.max(3 - cycleCount, 1);

  return (
    <Card>
      <Eyebrow>Cycle</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">Cycle length and regularity</h3>
      {data.length < 2 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ash">
          {/* Two gaps between starts needs three starts in total, and the
              plural has to follow that number, not the count logged so far. */}
          Log the start of {remaining} more period{remaining === 1 ? "" : "s"} and Ease can show how much your cycle
          varies.
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="numeral text-[30px] text-pearl">{observed ?? "—"}</p>
              <p className="eyebrow mt-1">Average days</p>
            </div>
            <div>
              <p className="numeral text-[30px] text-pearl">±{Math.round(variance ?? 0)}</p>
              <p className="eyebrow mt-1">Variation</p>
            </div>
          </div>
          <ChartFrame>
            <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#241A3C" />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(174,147,255,0.1)" }} />
              <Bar dataKey="length" fill={GLOSS} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ash">
            {/* No diagnosis is named here. Cycles swing for many reasons —
                perimenopause, coming off hormonal contraception, thyroid,
                stress — and asserting a condition the user never told us about
                is both wrong and alarming. */}
            {(variance ?? 0) > 5
              ? "Your cycles vary by more than five days, so Ease plans around ranges rather than exact dates. Raise it with a doctor if that variation is new or widening."
              : "Your cycles are consistent, so you can rely on the predictions here."}
          </p>
        </>
      )}
    </Card>
  );
}

function SymptomFrequency({ logs }: { logs: DayLog[] }) {
  const counts = SYMPTOMS.map((s) => ({
    label: s.label,
    days: logs.filter((l) => (l.symptoms[s.id] ?? 0) > 0).length,
  }))
    .filter((d) => d.days > 0)
    .sort((a, b) => b.days - a.days)
    .slice(0, 6);

  return (
    <Card>
      <Eyebrow>Symptoms</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">What shows up most</h3>
      {counts.length === 0 ? (
        <p className="mt-3 text-[13px] text-ash">No symptoms logged in this range.</p>
      ) : (
        <ChartFrame>
          <BarChart data={counts} layout="vertical" margin={{ top: 4, right: 12, left: 44, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#241A3C" />
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={96} {...axis} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(174,147,255,0.1)" }} />
            <Bar dataKey="days" fill={PLASMA} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartFrame>
      )}
    </Card>
  );
}

function SymptomTrend({ logs, ids, title }: { logs: DayLog[]; ids: SymptomId[]; title: string }) {
  const data = logs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => {
      const row: Record<string, string | number> = { label: shortDate(l.date) };
      ids.forEach((id) => (row[id] = l.symptoms[id] ?? 0));
      return row;
    });

  const anyLogged = data.some((row) => ids.some((id) => (row[id] as number) > 0));

  return (
    <Card>
      <Eyebrow>{title}</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">{ids.map((i) => SYMPTOM_LABEL[i]).join(" · ")}</h3>
      {!anyLogged ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ash">
          Nothing logged here yet. Tap these in your daily check-in and the trend builds itself.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {ids.map((id, i) => (
              <span key={id} className="flex items-center gap-1.5 text-[11.5px] text-ash">
                <span
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: SERIES[i % SERIES.length] }}
                />
                {SYMPTOM_LABEL[id]}
              </span>
            ))}
          </div>
          <ChartFrame>
            <LineChart data={data} margin={{ top: 8, right: 6, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#241A3C" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} {...axis} />
              <Tooltip {...tooltipStyle} cursor={{ stroke: "#38294F" }} />
              {ids.map((id, i) => (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  name={SYMPTOM_LABEL[id]}
                  stroke={SERIES[i % SERIES.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartFrame>
        </>
      )}
    </Card>
  );
}

function EnergySleep({ logs }: { logs: DayLog[] }) {
  const data = logs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => ({ label: shortDate(l.date), energy: l.energy ?? null, sleep: l.sleepHours ?? null, stress: l.stress ?? null }));

  const has = data.some((d) => d.energy || d.sleep);

  return (
    <Card>
      <Eyebrow>Body</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">Energy, sleep and stress</h3>
      {!has ? (
        <p className="mt-3 text-[13px] text-ash">Log energy and sleep to see how they track together.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {["Energy", "Sleep (hrs)", "Stress"].map((label, i) => (
              <span key={label} className="flex items-center gap-1.5 text-[11.5px] text-ash">
                <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES[i] }} />
                {label}
              </span>
            ))}
          </div>
          <ChartFrame>
            <LineChart data={data} margin={{ top: 8, right: 6, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#241A3C" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis {...axis} />
              <Tooltip {...tooltipStyle} cursor={{ stroke: "#38294F" }} />
              <Line type="monotone" dataKey="energy" name="Energy" stroke={SERIES[0]} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke={SERIES[1]} strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="stress" name="Stress" stroke={SERIES[2]} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ChartFrame>
        </>
      )}
    </Card>
  );
}

function MoodSpread({ logs }: { logs: DayLog[] }) {
  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    if (l.mood) counts[l.mood] = (counts[l.mood] ?? 0) + 1;
  });
  const data = Object.entries(counts).map(([label, days]) => ({ label, days }));

  return (
    <Card>
      <Eyebrow>Mood</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">How your days felt</h3>
      {!data.length ? (
        <p className="mt-3 text-[13px] text-ash">No moods logged in this range.</p>
      ) : (
        <ChartFrame>
          <BarChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#241A3C" />
            <XAxis dataKey="label" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(174,147,255,0.1)" }} />
            <Bar dataKey="days" fill={GLOSS} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartFrame>
      )}
    </Card>
  );
}

function NutritionCard({
  meals,
  days,
}: {
  meals: { date: string; protein: number; fibre: number; calories: number; source?: "manual" | "ai" }[];
  days: number;
}) {
  const byDate: Record<string, { protein: number; fibre: number; calories: number }> = {};
  meals.forEach((m) => {
    byDate[m.date] = byDate[m.date] ?? { protein: 0, fibre: 0, calories: 0 };
    byDate[m.date].protein += m.protein;
    byDate[m.date].fibre += m.fibre;
    byDate[m.date].calories += m.calories;
  });
  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ label: shortDate(date), ...v }));

  const avg = (pick: (d: (typeof data)[number]) => number) =>
    data.length ? Math.round(data.reduce((s, d) => s + pick(d), 0) / data.length) : 0;
  const avgProtein = avg((d) => d.protein);
  const avgFibre = avg((d) => d.fibre);
  const avgCalories = avg((d) => d.calories);

  // Days whose calories came wholly from a photo estimate carry more error than
  // a deliberate entry, so the card says how much of the range that covers
  // rather than presenting every figure as equally solid.
  const estimated = meals.filter((m) => m.source === "ai").length;

  return (
    <Card>
      <Eyebrow>Nutrition</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">Calories, protein and fibre</h3>
      {!data.length ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ash">
          No meals logged in this range. These two numbers move your symptoms more than anything else you can track.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="numeral text-[28px] text-pearl">{avgCalories}</p>
              <p className="eyebrow mt-1">Avg kcal</p>
            </div>
            <div>
              <p className="numeral text-[28px] text-pearl">{avgProtein}g</p>
              <p className="eyebrow mt-1">Protein · 60</p>
            </div>
            <div>
              <p className="numeral text-[28px] text-pearl">{avgFibre}g</p>
              <p className="eyebrow mt-1">Fibre · 30</p>
            </div>
          </div>

          {/* Calories run on their own axis: a 2,000kcal bar beside a 20g one
              flattens the macros into an unreadable strip. */}
          <ChartFrame>
            <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#241A3C" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis {...axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(174,147,255,0.1)" }} />
              <Bar dataKey="calories" name="Calories" fill={GILT} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
          <ChartFrame>
            <BarChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#241A3C" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis {...axis} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(174,147,255,0.1)" }} />
              <Bar dataKey="protein" name="Protein" fill={GLOSS} radius={[4, 4, 0, 0]} />
              <Bar dataKey="fibre" name="Fibre" fill={PLASMA} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
          <p className="mt-2 text-[12.5px] text-ash">
            Logged on {data.length} of the last {days} days.
            {estimated ? ` ${estimated} meal${estimated === 1 ? "" : "s"} estimated from a photo.` : ""}
          </p>
        </>
      )}
    </Card>
  );
}

function MovementCard({ logs }: { logs: DayLog[] }) {
  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    if (l.movement) counts[l.movement] = (counts[l.movement] ?? 0) + 1;
  });
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);

  return (
    <Card>
      <Eyebrow>Movement</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">How you moved</h3>
      {!entries.length ? (
        <p className="mt-3 text-[13px] text-ash">No movement logged in this range.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {entries.map(([label, n]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between text-[13.5px]">
                <span className="text-pearl">{label}</span>
                <span className="text-dusk">
                  {n} day{n === 1 ? "" : "s"}
                </span>
              </div>
              <div className="hud-track mt-1.5 h-1 rounded-full">
                <div className="hud-fill h-1 rounded-full" style={{ width: `${(n / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Consistency({ logs }: { logs: DayLog[] }) {
  const days = lastNDays(35);
  const window = new Set(days);
  const logged = new Set(logs.map((l) => l.date).filter((d) => window.has(d)));
  return (
    <Card>
      <Eyebrow>Consistency</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">Last five weeks</h3>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <span
            key={d}
            title={shortDate(d)}
            className={`aspect-square rounded-[6px] ${
              logged.has(d) ? "bg-gloss" : d === today() ? "border border-pearl bg-transparent" : "bg-slate"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ash">
        {logged.size} of the last 35 days logged.
      </p>
    </Card>
  );
}

function Insights({ logs, meals, profile }: { logs: DayLog[]; meals: Meal[]; profile: Profile }) {
  const report = useMemo(() => buildInsights(logs, meals, profile), [logs, meals, profile]);

  return (
    <Card>
      <Eyebrow>What Ease noticed</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">Your patterns</h3>

      {report.tooEarly ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ash">
          {report.needed} more logged day{report.needed === 1 ? "" : "s"} and Ease starts testing your data for
          patterns. Everything you log before then still counts.
        </p>
      ) : report.insights.length === 0 ? (
        // Saying "we looked and found nothing" is a real answer. The old copy
        // told someone with nine months of data to keep logging, which read as
        // the feature not working.
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-ash">
            Ease checked {report.checked} relationships across your {report.days} logged days — sleep, stress,
            nutrition, movement and every symptom against your cycle — and nothing stood out strongly enough to be
            worth calling a pattern yet.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ash">
            That is a genuine result, not a gap. It usually means your symptoms are not tracking one obvious driver.
          </p>
        </>
      ) : (
        <>
          <ul className="mt-3 space-y-3.5">
            {report.insights.map((i) => (
              <li key={i.id} className="flex gap-2.5 text-[13.5px] leading-relaxed text-silk">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gloss" />
                <span>
                  {i.text}
                  <span className="mt-1 block text-[11.5px] text-dusk">
                    {i.strong ? "Strong signal" : "Worth watching"} · {i.n} {i.unit}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-veil pt-3 text-[11.5px] leading-relaxed text-dusk">
            From {report.checked} relationships tested across {report.days} logged days. These are patterns in what
            you recorded, not medical findings — worth raising with a doctor, not acting on alone.
          </p>
        </>
      )}
    </Card>
  );
}

export { PHASE_LABEL };
