import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Plus, Settings } from "lucide-react";
import { motion } from "motion/react";
import CycleRing from "@/components/CycleRing";
import AnimatedNumber from "@/components/AnimatedNumber";
import LogSheet from "@/components/LogSheet";
import MealSheet from "@/components/MealSheet";
import { Button, Card, EmptyState, Eyebrow } from "@/components/ui";
import { PHASE_CONTENT, PILLARS } from "@/data/content";
import { computeCycleState } from "@/lib/cycle";
import { lastNDays, shortDate, today, weekdayInitial } from "@/lib/date";
import { computeStreak } from "@/lib/progress";
import { useStore } from "@/lib/store";
import type { Pillar } from "@/types";
import { fadeUp, stagger } from "@/lib/motion";

export default function Home({
  onOpenSettings,
  onOpenCalendar,
  onOpenPillar,
}: {
  onOpenSettings: () => void;
  onOpenCalendar: () => void;
  onOpenPillar: (p: Pillar) => void;
}) {
  const { state } = useStore();
  const [logOpen, setLogOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);

  const cycle = useMemo(() => computeCycleState(state.profile, state.logs), [state.profile, state.logs]);
  const streak = useMemo(() => computeStreak(state.logs), [state.logs]);
  const phase = PHASE_CONTENT[cycle.phase];
  const days = lastNDays(7);
  const todayKey = today();
  const loggedToday = state.logs.some((l) => l.date === todayKey);

  const todayMeals = state.meals.filter((m) => m.date === todayKey);
  const macros = todayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fats: acc.fats + m.fats,
      fibre: acc.fibre + m.fibre,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fibre: 0 },
  );

  const focusPillars = PILLARS.filter((p) =>
    state.profile.focus.length ? state.profile.focus.includes(p.id) : ["nutrition", "metabolism", "skin"].includes(p.id),
  );

  const firstName = state.profile.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-5">
      <header className="flex items-center justify-between">
        <button
          onClick={onOpenSettings}
          aria-label="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-mist-200 bg-white text-mist-600"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
        <p className="eyebrow">
          {!cycle.known ? "Ease" : cycle.estimated ? "Estimated phase" : "Your cycle"}
        </p>
        <button
          onClick={onOpenCalendar}
          aria-label="Calendar"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-mist-200 bg-white text-mist-600"
        >
          <CalendarDays className="h-[18px] w-[18px]" />
        </button>
      </header>

      <div className="mt-6">
        <h1 className="display text-[30px] leading-[1.1] text-tangerine">
          {firstName ? `${greeting()}, ${firstName}.` : "Welcome back."}
        </h1>
        <p className="mt-1.5 text-[14px] text-mist-500">
          {cycle.known ? phase.headline : "Let's find where you are in your cycle."}
        </p>
      </div>

      {cycle.known ? (
        <div className="mt-7">
          <CycleRing
            day={cycle.day}
            cycleLength={cycle.observedLength ?? state.profile.cycleLength}
            periodLength={state.profile.periodLength}
            phase={cycle.phase}
            estimated={cycle.estimated}
          />
        </div>
      ) : (
        <Card className="mt-7">
          <Eyebrow>First step</Eyebrow>
          <h2 className="display mt-1.5 text-[24px] text-tangerine">When did your last period start?</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mist-600">
            Ease needs one date to place you in your cycle. Log a bleeding day from the calendar, or mark today if
            you're on your period now.
          </p>
          <Button full onClick={onOpenCalendar} className="mt-4">
            Open calendar
          </Button>
        </Card>
      )}

      <div className="mt-6 flex justify-between gap-1">
        {days.map((d) => {
          const isToday = d === todayKey;
          const logged = state.logs.some((l) => l.date === d);
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-mist-400">
                {weekdayInitial(d)}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ${
                  isToday ? "bg-ink text-white" : logged ? "bg-tangerine-wash text-tangerine-deep" : "text-mist-400"
                }`}
              >
                {Number(d.slice(-2))}
              </span>
            </div>
          );
        })}
      </div>

      <Button
        full
        variant={cycle.known ? "primary" : "secondary"}
        onClick={() => setLogOpen(true)}
        className="mt-6"
      >
        {loggedToday ? "Update today's log" : "Log today"}
      </Button>

      <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="mt-8 space-y-4">
        {cycle.known ? (
        <motion.div variants={fadeUp}>
        <Card>
          <Eyebrow>{cycle.estimated ? `Around day ${cycle.day}` : `Day ${cycle.day}`}</Eyebrow>
          <h2 className="display mt-1.5 text-[24px] text-tangerine">{phase.headline}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-mist-600">{phase.body}</p>
          {cycle.estimated ? (
            <p className="mt-3 rounded-xl bg-blue-wash px-3.5 py-2.5 text-[12.5px] leading-relaxed text-blue">
              {cycle.cycleCount < 3
                ? "This is an estimate while Ease learns your pattern. Log a couple of cycles and it sharpens."
                : "Your cycles vary by more than a few days, so Ease shows a range rather than pretending to be precise."}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2.5 border-t border-mist-200 pt-4">
            <Line label="Eat" value={phase.eat} />
            <Line label="Move" value={phase.move} />
          </div>
        </Card>
        </motion.div>
        ) : null}

        <motion.div variants={fadeUp}>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>Today's food</Eyebrow>
              <h2 className="display mt-1.5 text-[24px] text-tangerine">Nutrient bank</h2>
            </div>
            <button
              onClick={() => setMealOpen(true)}
              className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Meal
            </button>
          </div>

          {todayMeals.length ? (
            <>
              <div className="mt-5 grid grid-cols-4 gap-2">
                <Macro label="Protein" value={macros.protein} target={60} />
                <Macro label="Fibre" value={macros.fibre} target={30} />
                <Macro label="Carbs" value={macros.carbs} />
                <Macro label="Fats" value={macros.fats} />
              </div>
              <ul className="mt-4 space-y-2 border-t border-mist-200 pt-4">
                {todayMeals.map((m) => (
                  <li key={m.id} className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] text-ink">{m.name}</span>
                    <span className="text-[12px] text-mist-400">{m.protein}g protein</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Nothing logged yet today"
                body="Add one meal and Ease starts tracking protein and fibre against what keeps your blood sugar steady."
              />
            </div>
          )}
        </Card>
        </motion.div>

        <motion.section variants={fadeUp}>
          <Eyebrow>Your focus</Eyebrow>
          <div className="mt-3 space-y-2.5">
            {focusPillars.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenPillar(p.id)}
                className="card flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:border-mist-300"
              >
                <span>
                  <span className="block text-[15px] font-semibold text-ink">{p.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-mist-500">{p.tagline}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-tangerine" />
              </button>
            ))}
          </div>
        </motion.section>

        <motion.div variants={fadeUp}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Consistency</Eyebrow>
              <p className="numeral mt-1.5 text-[44px] text-ink">
                <AnimatedNumber value={streak.current} />
                <span className="ml-2 font-sans text-[13px] font-medium text-mist-500">
                  day{streak.current === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <div className="text-right">
              <Eyebrow>Logged</Eyebrow>
              <p className="numeral mt-1.5 text-[44px] text-ink">
                <AnimatedNumber value={state.logs.length} />
              </p>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-mist-500">
            {streak.current === 0
              ? "Log today to start a streak. Two weeks of data is enough for Ease to find your first pattern."
              : state.logs.length < 14
                ? `${14 - state.logs.length} more days of logging and your first patterns unlock.`
                : "Enough data for patterns — check the Patterns tab."}
          </p>
        </Card>
        </motion.div>

        {cycle.known && cycle.nextPeriodDate && !cycle.estimated ? (
          <motion.p variants={fadeUp} className="text-center text-[12.5px] text-mist-400">
            Next period expected around {shortDate(cycle.nextPeriodDate)}
          </motion.p>
        ) : null}
      </motion.div>

      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} />
      <MealSheet open={mealOpen} onClose={() => setMealOpen(false)} />
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="eyebrow w-10 shrink-0 pt-0.5">{label}</span>
      <span className="text-[13.5px] leading-relaxed text-mist-600">{value}</span>
    </div>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target?: number }) {
  const pct = target ? Math.min(value / target, 1) : 0;
  return (
    <div>
      <p className="numeral text-[22px] text-ink">
        <AnimatedNumber value={Math.round(value)} duration={600} />
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-mist-400">{label}</p>
      {target ? (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-mist-100">
          <motion.div
            className="h-1 rounded-full bg-tangerine"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
          />
        </div>
      ) : null}
    </div>
  );
}
