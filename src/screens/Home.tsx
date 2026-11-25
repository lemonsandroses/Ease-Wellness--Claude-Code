import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Plus, Settings } from "lucide-react";
import { motion } from "motion/react";
import CycleRing from "@/components/CycleRing";
import AnimatedNumber from "@/components/AnimatedNumber";
import MealThumb from "@/components/MealThumb";
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
  /** What the day count is measured against: the average of logged
   *  cycles once there are any, else the length given at onboarding. */
  const usualLength = cycle.observedLength ?? state.profile.cycleLength;
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
          className="flex h-11 w-11 items-center justify-center rounded-full border border-veil bg-slate/70 text-ash transition-colors hover:border-gloss hover:text-pearl"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
        <p className="eyebrow">
          {!cycle.known ? "Ease" : cycle.estimated ? "Estimated phase" : "Your cycle"}
        </p>
        <button
          onClick={onOpenCalendar}
          aria-label="Calendar"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-veil bg-slate/70 text-ash transition-colors hover:border-gloss hover:text-pearl"
        >
          <CalendarDays className="h-[18px] w-[18px]" />
        </button>
      </header>

      <div className="mt-6">
        <h1 className="display-xl lit text-[38px]">
          {cycle.known ? phase.headline : "Start by logging a period."}
        </h1>
        <p className="mt-1.5 text-[14px] text-ash">
          {cycle.known
            ? `${firstName ? `${firstName} · ` : ""}${cycle.estimated ? "Around day" : "Day"} ${cycle.day}${
                // "Day 41 of 31" states a denominator the number has already
                // passed. The count climbing past the usual length is correct and
                // deliberate — a long cycle is the signal this app exists to
                // surface — so the number stays and the phrasing changes.
                cycle.day > usualLength ? ` · usually ${usualLength} days` : ` of ${usualLength}`
              }`
            : "Ease needs one bleeding day before it can place you in a phase."}
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
          <Eyebrow>Step one</Eyebrow>
          <h2 className="display mt-1.5 text-[25px] text-pearl">Set your last period start date.</h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-silk">
            Ease places you in your cycle from a single bleeding day. Log today if your period has started, or open
            the calendar and select the day it began.
          </p>
          <Button full onClick={() => setLogOpen(true)} className="mt-4">
My period started today
          </Button>
          <Button full variant="ghost" onClick={onOpenCalendar} className="mt-2">
Select an earlier date
          </Button>
        </Card>
      )}

      <div className="mt-6 flex justify-between gap-1">
        {days.map((d) => {
          const isToday = d === todayKey;
          const logged = state.logs.some((l) => l.date === d);
          return (
            <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-dusk">
                {weekdayInitial(d)}
              </span>
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ${
                  isToday
                    ? "bg-pearl text-void shadow-[0_0_20px_-6px_rgba(239,230,255,0.7)]"
                    : logged
                      ? "border border-gloss/40 bg-gloss-veil text-gloss-bright"
                      : "text-dusk"
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
        <Card lit>
          <Eyebrow>{cycle.estimated ? `Around day ${cycle.day}` : `Day ${cycle.day}`}</Eyebrow>
          <h2 className="display mt-1.5 text-[25px] text-pearl">
            {cycle.overdue ? "Keep logging — this cycle is running long." : "What to do this week"}
          </h2>
          {/* No diagnosis is assumed here. Plenty of people with long cycles
              don't have PCOS — perimenopause, coming off hormonal birth
              control, illness and stress all do this — and naming a condition
              the user never told us about is both wrong and alarming. */}
          <p className="mt-2 text-[14px] leading-relaxed text-silk">
            {cycle.overdue
              ? "A longer cycle than usual is not on its own a reason to worry. Record the day bleeding starts; the length of this cycle is the useful part, and worth showing a doctor if long cycles repeat."
              : phase.body}
          </p>

          {/* The ring says "Ovulatory" in large orange type, from nothing more
              than cycleLength − 14. Someone trying to conceive will read that
              as a fertile window and act on it. Saying so here is the only
              place that reaches her — the Terms of Use are on a website. */}
          {!cycle.overdue && cycle.phase === "ovulatory" ? (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ash">
              This is estimated from your dates. Ease does not detect ovulation — do not use it to plan or avoid
              pregnancy.
            </p>
          ) : null}
          {cycle.overdue && cycle.nextPeriodDate ? (
            <p className="mt-3 rounded-xl border border-gloss/25 bg-gloss-veil px-3.5 py-2.5 text-[12.5px] leading-relaxed text-gloss-bright">
              {cycle.daysLate === 0
                ? `A period was expected around today (${shortDate(cycle.nextPeriodDate)}). Log the first bleeding day when it arrives.`
                : `${cycle.daysLate} day${cycle.daysLate === 1 ? "" : "s"} past the ${shortDate(
                    cycle.nextPeriodDate,
                  )} estimate. Log the first bleeding day when it arrives; Ease recalculates from there.`}
            </p>
          ) : cycle.estimated ? (
            <p className="mt-3 rounded-xl border border-plasma/30 bg-plasma-veil px-3.5 py-2.5 text-[12.5px] leading-relaxed text-plasma-bright">
              {cycle.cycleCount < 3
                ? "This is an estimate while Ease learns your pattern. Log two more cycles to sharpen it."
                : "Your cycles vary by more than a few days, so Ease shows a range rather than a single date."}
            </p>
          ) : null}
          <div className="mt-4 grid gap-2.5 border-t border-veil/70 pt-4">
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
              <h2 className="display mt-1.5 text-[25px] text-pearl">Log what you ate</h2>
            </div>
            <button
              onClick={() => setMealOpen(true)}
              className="btn-gloss flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Meal
            </button>
          </div>

          {todayMeals.length ? (
            <>
              <div className="mt-5 flex items-baseline justify-between">
                <p className="numeral text-[34px] text-pearl">
                  <AnimatedNumber value={Math.round(macros.calories)} />
                  <span className="ml-1.5 font-sans text-[12px] font-medium text-ash">kcal today</span>
                </p>
                <p className="text-[11.5px] text-dusk">
                  {todayMeals.length} meal{todayMeals.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <Macro label="Protein" value={macros.protein} target={60} />
                <Macro label="Fibre" value={macros.fibre} target={30} />
                <Macro label="Carbs" value={macros.carbs} />
                <Macro label="Fats" value={macros.fats} />
              </div>
              <ul className="mt-4 space-y-2 border-t border-veil pt-4">
                {todayMeals.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <MealThumb path={m.photoPath} alt={m.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-pearl">{m.name}</span>
                      <span className="mt-0.5 block text-[11.5px] text-dusk">
                        {m.calories ? `${Math.round(m.calories)} kcal · ` : ""}
                        {m.protein}g protein
                        {m.source === "ai" ? " · estimated" : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="No meals logged today"
                body="Add one meal. Ease then tracks protein and fibre against the targets that keep blood sugar steady."
              />
            </div>
          )}
        </Card>
        </motion.div>

        <motion.section variants={fadeUp}>
          <Eyebrow>Work on these</Eyebrow>
          <div className="mt-3 space-y-2.5">
            {focusPillars.map((p) => (
              <button
                key={p.id}
                onClick={() => onOpenPillar(p.id)}
                className="card flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:border-gloss/50"
              >
                <span>
                  <span className="block text-[15px] font-semibold text-pearl">{p.label}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ash">{p.tagline}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-gloss" />
              </button>
            ))}
          </div>
        </motion.section>

        <motion.div variants={fadeUp}>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Consistency</Eyebrow>
              <p className="numeral mt-1.5 text-[44px] text-pearl">
                <AnimatedNumber value={streak.current} />
                <span className="ml-2 font-sans text-[13px] font-medium text-ash">
                  day{streak.current === 1 ? "" : "s"}
                </span>
              </p>
            </div>
            <div className="text-right">
              <Eyebrow>Logged</Eyebrow>
              <p className="numeral mt-1.5 text-[44px] text-pearl">
                <AnimatedNumber value={state.logs.length} />
              </p>
            </div>
          </div>
          <div className="gilt-hair mt-4 h-px w-full" />
          <p className="mt-3 text-[13px] leading-relaxed text-ash">
            {streak.current === 0
              ? "Log today to start a streak. Two weeks of data unlocks your first pattern."
              : state.logs.length < 14
                ? `Log ${14 - state.logs.length} more day${14 - state.logs.length === 1 ? "" : "s"} to unlock your first patterns.`
                : "You have enough data. Open the Patterns tab."}
          </p>
        </Card>
        </motion.div>

        {cycle.known && cycle.nextPeriodDate && !cycle.estimated ? (
          <motion.p variants={fadeUp} className="text-center text-[12.5px] text-dusk">
            Expect your next period around {shortDate(cycle.nextPeriodDate)}
          </motion.p>
        ) : null}
      </motion.div>

      <LogSheet open={logOpen} onClose={() => setLogOpen(false)} />
      <MealSheet open={mealOpen} onClose={() => setMealOpen(false)} />
    </div>
  );
}


function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="eyebrow w-10 shrink-0 pt-0.5">{label}</span>
      <span className="text-[13.5px] leading-relaxed text-silk">{value}</span>
    </div>
  );
}

function Macro({ label, value, target }: { label: string; value: number; target?: number }) {
  const pct = target ? Math.min(value / target, 1) : 0;
  return (
    <div>
      <p className="numeral text-[22px] text-pearl">
        <AnimatedNumber value={Math.round(value)} duration={600} />
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-dusk">{label}</p>
      {target ? (
        <div className="hud-track mt-1.5 h-1 overflow-hidden rounded-full">
          <motion.div
            className="hud-fill h-1 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
          />
        </div>
      ) : null}
    </div>
  );
}
