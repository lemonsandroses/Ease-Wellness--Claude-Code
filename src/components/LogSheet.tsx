import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import AnimatedNumber from "@/components/AnimatedNumber";
import Confetti from "@/components/Confetti";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import { pop } from "@/lib/motion";
import { MOODS, SYMPTOMS } from "@/data/content";
import { computeStreak } from "@/lib/progress";
import { useStore } from "@/lib/store";
import { shortDate, today } from "@/lib/date";
import type { BleedLevel, DayLog, SymptomId } from "@/types";

/** Logs needed before Patterns has enough to draw a trend. Matches the
 *  `first_pattern` achievement in lib/progress, so the promise made here and
 *  the badge granted there can't drift apart. */
const PATTERN_THRESHOLD = 14;

const BLEED: { id: BleedLevel; label: string }[] = [
  { id: "none", label: "None" },
  { id: "spotting", label: "Spotting" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "heavy", label: "Heavy" },
];

const SEVERITY = ["", "Mild", "Moderate", "Strong"];
const MOVEMENTS = ["Rest", "Walk", "Strength", "Pilates or yoga", "Cardio"];

export default function LogSheet({
  open,
  onClose,
  date = today(),
}: {
  open: boolean;
  onClose: () => void;
  date?: string;
}) {
  const isToday = date === today();
  return (
    <Sheet open={open} onClose={onClose} label={isToday ? "Today's check-in" : `Check-in · ${shortDate(date)}`}>
      {/* The form lives inside the sheet so it unmounts on close. Holding this
          state a level up left the save confirmation frozen on screen the next
          time the sheet opened, and kept a stale draft when the date changed. */}
      <LogForm date={date} onClose={onClose} />
    </Sheet>
  );
}

function LogForm({ date, onClose }: { date: string; onClose: () => void }) {
  const { state, saveLog } = useStore();
  const existing = state.logs.find((l) => l.date === date);
  const isToday = date === today();

  const [draft, setDraft] = useState<DayLog>(
    existing ?? { date, bleeding: "none", symptoms: {}, loggedAt: new Date().toISOString() },
  );

  const set = <K extends keyof DayLog>(key: K, value: DayLog[K]) => setDraft((d) => ({ ...d, [key]: value }));

  // One tap cycles a symptom through mild → moderate → strong → off, so logging
  // severity costs no extra screens.
  const cycleSymptom = (id: SymptomId) => {
    setDraft((d) => {
      const next = ((d.symptoms[id] ?? 0) + 1) % 4;
      const symptoms = { ...d.symptoms };
      if (next === 0) delete symptoms[id];
      else symptoms[id] = next;
      return { ...d, symptoms };
    });
  };

  const [saved, setSaved] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const save = () => {
    saveLog({ ...draft, loggedAt: new Date().toISOString() });
    // Long enough to read a streak number and a line of text, and to let the
    // confetti land. The old 850ms was tuned for a bare checkmark.
    setSaved(true);
    closeTimer.current = setTimeout(onClose, 2600);
  };

  // Counted with this entry included. Reading state.logs alone would show the
  // streak as it was a moment before saving — off by one on the very day the
  // number is being celebrated.
  const { streak, logCount } = useMemo(() => {
    const logs = state.logs.some((l) => l.date === date) ? state.logs : [...state.logs, { ...draft, date }];
    return { streak: computeStreak(logs).current, logCount: logs.length };
  }, [state.logs, date, draft]);

  // Every symptom is on screen, no disclosure. Hiding two thirds of the list
  // behind "Something else" meant a symptom you have but didn't pick at
  // onboarding went unlogged — and an unlogged symptom is a hole in the
  // pattern. The ones you said you track come first, so the common taps stay
  // nearest the top; the rest follow in the same grid.
  const tracked = state.profile.baselineSymptoms.length
    ? SYMPTOMS.filter((s) => state.profile.baselineSymptoms.includes(s.id))
    : SYMPTOMS;
  const others = SYMPTOMS.filter((s) => !tracked.includes(s));
  const allSymptoms = [...tracked, ...others];

  if (saved) {
    return (
      <div className="relative flex flex-col items-center py-10 text-center">
        <Confetti />

        <motion.span
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={pop}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gloss text-void"
        >
          <Check className="h-7 w-7" strokeWidth={2.6} />
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="display mt-4 text-[27px] text-pearl"
        >
          Logged.
        </motion.h2>

        {/* The streak is the reason to come back tomorrow, so it gets the
            weight on this screen — bigger than the heading above it. */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 flex flex-col items-center"
        >
          <AnimatedNumber value={streak} className="numeral text-[56px] leading-none text-gloss-bright lit" />
          <span className="mt-1 text-[12px] uppercase tracking-[0.18em] text-ash">
            {streak === 1 ? "day in a row" : "days in a row"}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 max-w-[17rem] text-[13.5px] leading-[1.5] text-silk"
        >
          {encouragement(streak, logCount)}
        </motion.p>
      </div>
    );
  }

  return (
    <>
      <h2 className="display text-[29px] text-pearl">
        {isToday ? "Log today." : `Log ${shortDate(date)}.`}
      </h2>
      <p className="mt-1.5 text-[13.5px] text-ash">
        Log what you notice. Anything you skip just stays empty — there's no streak penalty for a short entry.
      </p>

      <div className="mt-6 space-y-6">
        <section>
          <Eyebrow>Bleeding</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {BLEED.map((b) => (
              <Chip key={b.id} selected={draft.bleeding === b.id} onClick={() => set("bleeding", b.id)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <Eyebrow>Symptoms — tap again for stronger</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {allSymptoms.map((s) => (
              <SymptomChip key={s.id} label={s.label} level={draft.symptoms[s.id] ?? 0} onClick={() => cycleSymptom(s.id)} />
            ))}
          </div>
        </section>

        <section>
          <Eyebrow>Energy</Eyebrow>
          <Scale value={draft.energy} onPick={(v) => set("energy", v)} low="Drained" high="Full" />
        </section>

        <section>
          <Eyebrow>Mood</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <Chip key={m} selected={draft.mood === m} onClick={() => set("mood", m)}>
                {m}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <Eyebrow>Stress</Eyebrow>
          <Scale value={draft.stress} onPick={(v) => set("stress", v)} low="Calm" high="Maxed" />
        </section>

        <section>
          <Eyebrow>Sleep last night</Eyebrow>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={3}
              max={11}
              step={0.5}
              value={draft.sleepHours ?? 7.5}
              onChange={(e) => set("sleepHours", Number(e.target.value))}
              className="h-1 flex-1 accent-[#FF2D87]"
              aria-label="Hours of sleep"
            />
            <span className="numeral w-16 text-right text-[24px] text-pearl">{draft.sleepHours ?? 7.5}</span>
            <span className="text-[12px] text-ash">hrs</span>
          </div>
        </section>

        <section>
          <Eyebrow>Movement</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOVEMENTS.map((m) => (
              <Chip key={m} selected={draft.movement === m} onClick={() => set("movement", m)}>
                {m}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <Eyebrow>Notes</Eyebrow>
          <textarea
            value={draft.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Note anything worth remembering"
            className="mt-2 w-full resize-none rounded-2xl border border-veil bg-slate px-4 py-3 text-[14px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
          />
        </section>
      </div>

      <Button full onClick={save} className="mt-7">
        {isToday ? "Save today" : `Save ${shortDate(date)}`}
      </Button>
    </>
  );
}

/**
 * What to do next, not how to feel about what just happened. The whole point
 * of the streak is that symptoms only become a pattern when they're marked on
 * consecutive days, so the copy says that plainly and names the number of days
 * still to go rather than cheering.
 */
function encouragement(streak: number, logCount: number): string {
  if (logCount >= PATTERN_THRESHOLD) {
    return "Your patterns are ready. Open Patterns to see what your symptoms move with.";
  }
  const left = PATTERN_THRESHOLD - logCount;
  const days = left === 1 ? "1 more day" : `${left} more days`;
  if (streak <= 1) {
    return `Mark your symptoms again tomorrow. Patterns build from consecutive days — ${days} and yours start to show.`;
  }
  return `Keep marking your symptoms every day. ${days} and Ease can show you your first pattern.`;
}

function SymptomChip({ label, level, onClick }: { label: string; level: number; onClick: () => void }) {
  const active = level > 0;
  return (
    <motion.button
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.94 }}
      // Each tap up the severity scale gives a slightly bigger nudge back.
      animate={{ scale: active ? [1, 1.04 + level * 0.02, 1] : 1 }}
      transition={{ duration: 0.28 }}
      className={`min-h-[44px] rounded-full border px-4 text-[14px] transition-colors ${
        active
          ? "border-gloss bg-gloss-veil font-semibold text-gloss-bright"
          : "border-veil bg-slate text-silk hover:border-gloss/50"
      }`}
    >
      {label}
      {active ? <span className="ml-2 text-[11px] font-medium opacity-70">{SEVERITY[level]}</span> : null}
    </motion.button>
  );
}

function Scale({
  value,
  onPick,
  low,
  high,
}: {
  value?: number;
  onPick: (v: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onPick(n)}
            aria-pressed={value === n}
            aria-label={`${n} out of 5`}
            className={`h-11 flex-1 rounded-xl border text-[14px] font-semibold transition-colors ${
              value === n
                ? "border-gloss bg-gloss text-void"
                : "border-veil bg-slate text-ash hover:border-gloss/50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-dusk">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
