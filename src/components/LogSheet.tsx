import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import { pop } from "@/lib/motion";
import { MOODS, SYMPTOMS } from "@/data/content";
import { useStore } from "@/lib/store";
import { today } from "@/lib/date";
import type { BleedLevel, DayLog, SymptomId } from "@/types";

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
  const { state, saveLog } = useStore();
  const existing = state.logs.find((l) => l.date === date);

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

  const save = () => {
    saveLog({ ...draft, loggedAt: new Date().toISOString() });
    // Hold the confirmation on screen for a beat so it registers as done.
    setSaved(true);
    setTimeout(onClose, 850);
  };

  const tracked = state.profile.baselineSymptoms.length
    ? SYMPTOMS.filter((s) => state.profile.baselineSymptoms.includes(s.id))
    : SYMPTOMS;
  const others = SYMPTOMS.filter((s) => !tracked.includes(s));

  if (saved) {
    return (
      <Sheet open={open} onClose={onClose} label="Saved">
        <div className="flex flex-col items-center py-12 text-center">
          <motion.span
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={pop}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-tangerine text-white"
          >
            <Check className="h-7 w-7" strokeWidth={2.6} />
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="display mt-4 text-[26px] text-tangerine"
          >
            Logged.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-1.5 text-[13.5px] text-mist-500"
          >
            That's another day of the picture.
          </motion.p>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} label="Today's check-in">
      <h2 className="display text-[28px] text-tangerine">How's today going?</h2>
      <p className="mt-1.5 text-[13.5px] text-mist-500">
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
            {tracked.map((s) => (
              <SymptomChip key={s.id} label={s.label} level={draft.symptoms[s.id] ?? 0} onClick={() => cycleSymptom(s.id)} />
            ))}
          </div>
          {others.length ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] font-medium text-blue">Something else</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {others.map((s) => (
                  <SymptomChip
                    key={s.id}
                    label={s.label}
                    level={draft.symptoms[s.id] ?? 0}
                    onClick={() => cycleSymptom(s.id)}
                  />
                ))}
              </div>
            </details>
          ) : null}
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
              className="h-1 flex-1 accent-[#F2701C]"
              aria-label="Hours of sleep"
            />
            <span className="numeral w-16 text-right text-[24px] text-ink">{draft.sleepHours ?? 7.5}</span>
            <span className="text-[12px] text-mist-500">hrs</span>
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
            placeholder="Anything worth remembering about today"
            className="mt-2 w-full resize-none rounded-2xl border border-mist-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-tangerine"
          />
        </section>
      </div>

      <Button full onClick={save} className="mt-7">
        Save today
      </Button>
    </Sheet>
  );
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
          ? "border-tangerine bg-tangerine-wash font-semibold text-tangerine-deep"
          : "border-mist-200 bg-white text-mist-600 hover:border-mist-300"
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
                ? "border-tangerine bg-tangerine text-white"
                : "border-mist-200 bg-white text-mist-500 hover:border-mist-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-mist-400">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}
