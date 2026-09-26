import { useMemo, useState } from "react";
import { Lock, Trophy } from "lucide-react";
import { motion } from "motion/react";
import AnimatedNumber from "@/components/AnimatedNumber";
import { fadeUp, pop, stagger } from "@/lib/motion";
import Locked from "@/components/Locked";
import { LOCK_COPY, usePremium } from "@/lib/premium";
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
import { useStore } from "@/lib/store";
import type { Achievement, DayLog, SymptomId } from "@/types";

const RANGES = [
  { id: 7, label: "Week" },
  { id: 30, label: "Month" },
  { id: 180, label: "6 months" },
  { id: 365, label: "Year" },
] as const;

const TANGERINE = "#F2701C";
const BLUE = "#4E6E8E";
const SERIES = [TANGERINE, BLUE, "#E9A97C"];

export default function Patterns({ onUnlock }: { onUnlock: () => void }) {
  const { state } = useStore();
  const premium = usePremium();
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
      <h1 className="display mt-2 text-[36px] text-tangerine">
        {streak.current > 0 ? "You're building something." : "Start your streak."}
      </h1>

      <Card className="mt-5">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Current streak</Eyebrow>
            <p className="numeral mt-1.5 text-[60px] text-ink">
              <AnimatedNumber value={streak.current} duration={900} />
            </p>
            <p className="text-[12px] text-mist-500">day{streak.current === 1 ? "" : "s"} in a row</p>
          </div>
          <div className="text-right">
            <Eyebrow>Best</Eyebrow>
            <p className="numeral mt-1.5 text-[32px] text-ink">
              <AnimatedNumber value={streak.longest} duration={900} />
            </p>
          </div>
        </div>

        {next ? (
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-[12px] text-mist-500">
              <span>Next trophy at {next} days</span>
              <span>{Math.max(next - streak.current, 0)} to go</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist-100">
              <motion.div
                className="h-1.5 rounded-full bg-tangerine"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((streak.current / next) * 100, 100)}%` }}
                transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], delay: 0.2 }}
              />
            </div>
          </div>
        ) : null}

        {!premium ? (
          <div className="mt-6">
            <Locked title={LOCK_COPY.journey.title} body={LOCK_COPY.journey.body} onUnlock={onUnlock} minHeight={190}>
              <div className="flex gap-3">
                {milestones.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex w-[92px] flex-col items-center gap-2 rounded-2xl border border-mist-200 bg-white px-2 py-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-tangerine text-white">
                      <Trophy className="h-5 w-5" />
                    </span>
                    <span className="numeral text-[20px] text-ink">{m.threshold}</span>
                  </div>
                ))}
              </div>
            </Locked>
          </div>
        ) : (
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
                  unlocked ? "border-tangerine bg-tangerine-wash" : "border-mist-200 bg-white"
                }`}
              >
                <motion.span
                  // Earned trophies land with a bounce; locked ones just sit there.
                  initial={unlocked ? { scale: 0.4, rotate: -12 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={pop}
                  className={`flex h-11 w-11 items-center justify-center rounded-full ${
                    unlocked ? "bg-tangerine text-white" : "bg-mist-100 text-mist-400"
                  }`}
                >
                  {unlocked ? <Trophy className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </motion.span>
                <span className="numeral text-[20px] text-ink">{m.threshold}</span>
                <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-mist-400">
                  days
                </span>
              </motion.button>
            );
          })}
        </motion.div>
        )}
      </Card>

      {premium ? (
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
                    unlocked ? "bg-tangerine-wash text-tangerine" : "bg-mist-100 text-mist-400"
                  }`}
                >
                  {unlocked ? <Trophy className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </span>
                <span className="mt-2.5 block text-[13.5px] font-semibold text-ink">{b.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-mist-500">{b.detail}</span>
              </button>
            );
          })}
        </div>
      </section>
      ) : null}

      <header className="mt-10 flex items-baseline justify-between">
        <h2 className="display text-[28px] text-tangerine">Health patterns</h2>
      </header>

      <div className="no-bar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            aria-current={range === r.id}
            className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors ${
              range === r.id ? "border-ink bg-ink text-white" : "border-mist-200 bg-white text-mist-600"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {!enough ? (
        <div className="mt-5">
          <EmptyState
            title="Patterns unlock as you log"
            body="Ease needs about five days of entries before the charts mean anything. You're not behind — this is just how the maths works."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <CycleCard cycleCount={cycle.cycleCount} observed={cycle.observedLength} variance={cycle.variance} logs={state.logs} />

          {!premium ? (
            <Locked title={LOCK_COPY.patterns.title} body={LOCK_COPY.patterns.body} onUnlock={onUnlock} minHeight={420}>
              <div className="space-y-4">
                <SymptomFrequency logs={logsInRange} />
                <SymptomTrend logs={logsInRange} ids={["acne", "hairfall", "inflammation"]} title="Skin and hair" />
              </div>
            </Locked>
          ) : (
          <>
          <SymptomFrequency logs={logsInRange} />
          <SymptomTrend logs={logsInRange} ids={["acne", "hairfall", "inflammation"]} title="Skin and hair" />
          <SymptomTrend logs={logsInRange} ids={["cramps", "bloating", "headache"]} title="Pain and bloating" />
          <EnergySleep logs={logsInRange} />
          <MoodSpread logs={logsInRange} />
          <NutritionCard meals={mealsInRange} days={window.length} />
          <MovementCard logs={logsInRange} />
          <Consistency logs={state.logs} />
          <Insights logs={state.logs} />
          </>
          )}
        </div>
      )}

      <Sheet open={!!badge} onClose={() => setBadge(null)} label="Badge">
        {badge ? (
          <div className="pb-2 text-center">
            <span
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                earned.has(badge.id) ? "bg-tangerine text-white" : "bg-mist-100 text-mist-400"
              }`}
            >
              {earned.has(badge.id) ? <Trophy className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
            </span>
            <h2 className="display mt-4 text-[28px] text-tangerine">{badge.title}</h2>
            <p className="mt-2 text-[14px] text-mist-600">{badge.detail}</p>
            <p className="mt-4 text-[12.5px] text-mist-400">
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

const axis = { stroke: "#D3CCC5", fontSize: 11, tickLine: false } as const;

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

  return (
    <Card>
      <Eyebrow>Cycle</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-ink">Cycle length and regularity</h3>
      {data.length < 2 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-mist-500">
          Log the start of {2 - Math.max(cycleCount - 1, 0)} more period{cycleCount >= 1 ? "" : "s"} and Ease can show
          how much your cycle varies.
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="numeral text-[30px] text-ink">{observed ?? "—"}</p>
              <p className="eyebrow mt-1">Average days</p>
            </div>
            <div>
              <p className="numeral text-[30px] text-ink">±{Math.round(variance ?? 0)}</p>
              <p className="eyebrow mt-1">Variation</p>
            </div>
          </div>
          <ChartFrame>
            <BarChart data={data} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#F0EBE6" />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} />
              <Tooltip cursor={{ fill: "#F6F3F0" }} />
              <Bar dataKey="length" fill={TANGERINE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
          <p className="mt-2 text-[12.5px] leading-relaxed text-mist-500">
            {(variance ?? 0) > 5
              ? "Your cycles swing by more than five days. That's common with PCOS — Ease plans around ranges rather than exact dates."
              : "Your cycles are fairly consistent, so predictions here are reliable."}
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
      <h3 className="mt-1 text-[17px] font-semibold text-ink">What shows up most</h3>
      {counts.length === 0 ? (
        <p className="mt-3 text-[13px] text-mist-500">No symptoms logged in this range.</p>
      ) : (
        <ChartFrame>
          <BarChart data={counts} layout="vertical" margin={{ top: 4, right: 12, left: 44, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#F0EBE6" />
            <XAxis type="number" {...axis} allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={96} {...axis} />
            <Tooltip cursor={{ fill: "#F6F3F0" }} />
            <Bar dataKey="days" fill={BLUE} radius={[0, 4, 4, 0]} />
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
      <h3 className="mt-1 text-[17px] font-semibold text-ink">{ids.map((i) => SYMPTOM_LABEL[i]).join(" · ")}</h3>
      {!anyLogged ? (
        <p className="mt-3 text-[13px] leading-relaxed text-mist-500">
          Nothing logged here yet. Tap these in your daily check-in and the trend builds itself.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {ids.map((id, i) => (
              <span key={id} className="flex items-center gap-1.5 text-[11.5px] text-mist-500">
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
              <CartesianGrid vertical={false} stroke="#F0EBE6" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} {...axis} />
              <Tooltip />
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
      <h3 className="mt-1 text-[17px] font-semibold text-ink">Energy, sleep and stress</h3>
      {!has ? (
        <p className="mt-3 text-[13px] text-mist-500">Log energy and sleep to see how they track together.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {["Energy", "Sleep (hrs)", "Stress"].map((label, i) => (
              <span key={label} className="flex items-center gap-1.5 text-[11.5px] text-mist-500">
                <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES[i] }} />
                {label}
              </span>
            ))}
          </div>
          <ChartFrame>
            <LineChart data={data} margin={{ top: 8, right: 6, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#F0EBE6" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis {...axis} />
              <Tooltip />
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
      <h3 className="mt-1 text-[17px] font-semibold text-ink">How your days felt</h3>
      {!data.length ? (
        <p className="mt-3 text-[13px] text-mist-500">No moods logged in this range.</p>
      ) : (
        <ChartFrame>
          <BarChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#F0EBE6" />
            <XAxis dataKey="label" {...axis} />
            <YAxis allowDecimals={false} {...axis} />
            <Tooltip cursor={{ fill: "#F6F3F0" }} />
            <Bar dataKey="days" fill={TANGERINE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartFrame>
      )}
    </Card>
  );
}

function NutritionCard({ meals, days }: { meals: { date: string; protein: number; fibre: number }[]; days: number }) {
  const byDate: Record<string, { protein: number; fibre: number }> = {};
  meals.forEach((m) => {
    byDate[m.date] = byDate[m.date] ?? { protein: 0, fibre: 0 };
    byDate[m.date].protein += m.protein;
    byDate[m.date].fibre += m.fibre;
  });
  const data = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ label: shortDate(date), ...v }));

  const avgProtein = data.length ? Math.round(data.reduce((s, d) => s + d.protein, 0) / data.length) : 0;
  const avgFibre = data.length ? Math.round(data.reduce((s, d) => s + d.fibre, 0) / data.length) : 0;

  return (
    <Card>
      <Eyebrow>Nutrition</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-ink">Protein and fibre</h3>
      {!data.length ? (
        <p className="mt-3 text-[13px] leading-relaxed text-mist-500">
          No meals logged in this range. These two numbers move your symptoms more than anything else you can track.
        </p>
      ) : (
        <>
          <div className="mt-3 flex gap-6">
            <div>
              <p className="numeral text-[30px] text-ink">{avgProtein}g</p>
              <p className="eyebrow mt-1">Avg protein · target 60</p>
            </div>
            <div>
              <p className="numeral text-[30px] text-ink">{avgFibre}g</p>
              <p className="eyebrow mt-1">Avg fibre · target 30</p>
            </div>
          </div>
          <ChartFrame>
            <BarChart data={data} margin={{ top: 8, right: 4, left: -26, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#F0EBE6" />
              <XAxis dataKey="label" {...axis} minTickGap={24} />
              <YAxis {...axis} />
              <Tooltip cursor={{ fill: "#F6F3F0" }} />
              <Bar dataKey="protein" name="Protein" fill={TANGERINE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="fibre" name="Fibre" fill={BLUE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>
          <p className="mt-2 text-[12.5px] text-mist-500">
            Logged on {data.length} of the last {days} days.
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
      <h3 className="mt-1 text-[17px] font-semibold text-ink">How you moved</h3>
      {!entries.length ? (
        <p className="mt-3 text-[13px] text-mist-500">No movement logged in this range.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {entries.map(([label, n]) => (
            <li key={label}>
              <div className="flex items-baseline justify-between text-[13.5px]">
                <span className="text-ink">{label}</span>
                <span className="text-mist-400">
                  {n} day{n === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-mist-100">
                <div className="h-1 rounded-full bg-tangerine" style={{ width: `${(n / total) * 100}%` }} />
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
      <h3 className="mt-1 text-[17px] font-semibold text-ink">Last five weeks</h3>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <span
            key={d}
            title={shortDate(d)}
            className={`aspect-square rounded-[6px] ${
              logged.has(d) ? "bg-tangerine" : d === today() ? "border border-ink bg-white" : "bg-mist-100"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-mist-500">
        {logged.size} of the last 35 days logged.
      </p>
    </Card>
  );
}

function Insights({ logs }: { logs: DayLog[] }) {
  const insights: string[] = [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));

  // Short sleep versus next-day symptom load.
  const pairs = sorted.slice(0, -1).map((l, i) => ({ night: l, next: sorted[i + 1] }));
  const shortNights = pairs.filter((p) => (p.night.sleepHours ?? 8) < 6.5);
  const goodNights = pairs.filter((p) => (p.night.sleepHours ?? 0) >= 7.5);
  const load = (l: DayLog) => Object.values(l.symptoms).reduce((s, v) => s + (v ?? 0), 0);
  if (shortNights.length >= 3 && goodNights.length >= 3) {
    const a = shortNights.reduce((s, p) => s + load(p.next), 0) / shortNights.length;
    const b = goodNights.reduce((s, p) => s + load(p.next), 0) / goodNights.length;
    if (a > b * 1.25) {
      insights.push("After nights under 6.5 hours, your symptoms the next day run noticeably higher. Sleep looks like your biggest lever.");
    }
  }

  // Acne load in the luteal half versus the follicular half of the cycle.
  const acneDays = sorted.filter((l) => (l.symptoms.acne ?? 0) > 0);
  if (acneDays.length >= 4) {
    const starts = periodStarts(sorted);
    const sinceStart = (d: string) => {
      const last = starts.filter((s) => s <= d).pop();
      return last ? daysBetween(last, d) + 1 : null;
    };
    const dated = sorted.map((l) => ({ log: l, day: sinceStart(l.date) })).filter((x) => x.day !== null);
    const lateHalf = dated.filter((x) => x.day! > 14);
    const earlyHalf = dated.filter((x) => x.day! <= 14);
    const rate = (rows: typeof dated) =>
      rows.length ? rows.filter((r) => (r.log.symptoms.acne ?? 0) > 0).length / rows.length : 0;

    if (lateHalf.length >= 5 && earlyHalf.length >= 5 && rate(lateHalf) > rate(earlyHalf) * 1.4) {
      insights.push(
        `Acne shows up far more in the second half of your cycle than the first — a classic hormonal pattern rather than anything you're doing to your skin.`,
      );
    } else {
      insights.push(
        `Acne appeared on ${acneDays.length} of your ${sorted.length} logged days. Keep logging and Ease will tell you whether it tracks your cycle or something else.`,
      );
    }
  }

  const stressed = sorted.filter((l) => (l.stress ?? 0) >= 4);
  if (stressed.length >= 4) {
    const withCravings = stressed.filter((l) => (l.symptoms.cravings ?? 0) > 0).length;
    if (withCravings / stressed.length > 0.5) {
      insights.push("Cravings track with your high-stress days more often than not — worth treating as a stress signal rather than a food problem.");
    }
  }

  return (
    <Card>
      <Eyebrow>What Ease noticed</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-ink">Your patterns</h3>
      {insights.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-mist-500">
          Nothing conclusive yet. Insights appear once there's enough logged data to be confident — usually two weeks
          in, and stronger after a full cycle.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {insights.map((i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-mist-600">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-tangerine" />
              {i}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export { PHASE_LABEL };
