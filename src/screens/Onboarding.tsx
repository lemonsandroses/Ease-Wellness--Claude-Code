import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import { Button, Chip, Eyebrow } from "@/components/ui";
import { FOCUS_OPTIONS, SYMPTOMS } from "@/data/content";
import { useStore } from "@/lib/store";
import { today } from "@/lib/date";
import type { Pillar, Profile, SymptomId } from "@/types";

const ENERGY_RHYTHMS = [
  "Steady through the day",
  "Slow mornings, better evenings",
  "Afternoon slump around 3–4pm",
  "Crashes in the week before my period",
];

const SLEEP_TENDENCIES = [
  "I sleep well most nights",
  "Hard to fall asleep",
  "I wake through the night",
  "Worse before my period",
];

const MOVEMENT_STYLES = [
  "Walking and daily movement",
  "Pilates, yoga, barre",
  "Strength training",
  "Nothing regular yet",
];

const CYCLE_LENGTHS = [24, 26, 28, 30, 32, 35];
const PERIOD_LENGTHS = [3, 4, 5, 6, 7];

type Draft = Pick<
  Profile,
  | "name"
  | "birthDate"
  | "lastPeriodStart"
  | "cycleLength"
  | "periodLength"
  | "focus"
  | "baselineSymptoms"
  | "energyRhythm"
  | "sleepTendency"
  | "movementStyle"
>;

export default function Onboarding({ onDone, onSignIn }: { onDone: () => void; onSignIn: () => void }) {
  const { saveProfile } = useStore();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    birthDate: "",
    lastPeriodStart: "",
    cycleLength: 28,
    periodLength: 5,
    focus: [],
    baselineSymptoms: [],
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const steps = useMemo(
    () => [
      {
        eyebrow: "About you",
        title: "Let's start with the basics.",
        body: "Two details so the app can speak to you, not at you.",
        valid: draft.name.trim().length > 0,
        content: (
          <div className="space-y-4">
            <Field label="Your name">
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jasmine"
                className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={draft.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
              />
            </Field>
          </div>
        ),
      },
      {
        eyebrow: "Your cycle",
        title: "When did your last period start?",
        body: "A rough date is fine. Ease refines this as you log — it never needs you to be exact.",
        valid: true,
        content: (
          <div className="space-y-5">
            <Field label="Last period started">
              <input
                type="date"
                max={today()}
                value={draft.lastPeriodStart}
                onChange={(e) => set("lastPeriodStart", e.target.value)}
                className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
              />
            </Field>
            <Field label="Usual cycle length">
              <div className="flex flex-wrap gap-2">
                {CYCLE_LENGTHS.map((n) => (
                  <Chip key={n} selected={draft.cycleLength === n} onClick={() => set("cycleLength", n)}>
                    {n} days
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-mist-500">
                Not sure, or it changes a lot? Pick the closest — irregular cycles are expected here, and Ease adjusts
                around them.
              </p>
            </Field>
            <Field label="Usual period length">
              <div className="flex flex-wrap gap-2">
                {PERIOD_LENGTHS.map((n) => (
                  <Chip key={n} selected={draft.periodLength === n} onClick={() => set("periodLength", n)}>
                    {n} days
                  </Chip>
                ))}
              </div>
            </Field>
          </div>
        ),
      },
      {
        eyebrow: "Your focus",
        title: "What would you most like to change?",
        body: "Pick as many as apply. This sets what Ease puts in front of you first.",
        valid: draft.focus.length > 0,
        content: (
          <div className="grid gap-2.5">
            {FOCUS_OPTIONS.map((opt) => {
              const selected = draft.focus.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => set("focus", toggle<Pillar>(draft.focus, opt.id))}
                  aria-pressed={selected}
                  className={`flex min-h-[64px] items-center justify-between rounded-2xl border px-4 text-left transition-colors ${
                    selected ? "border-tangerine bg-tangerine-wash" : "border-mist-200 bg-white hover:border-mist-300"
                  }`}
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{opt.label}</span>
                    <span className="block text-[12.5px] text-mist-500">{opt.blurb}</span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-tangerine" /> : null}
                </button>
              );
            })}
          </div>
        ),
      },
      {
        eyebrow: "Your symptoms",
        title: "What shows up for you?",
        body: "These become the things Ease tracks against your cycle, so you can see what actually moves them.",
        valid: true,
        content: (
          <div className="flex flex-wrap gap-2">
            {SYMPTOMS.map((s) => (
              <Chip
                key={s.id}
                selected={draft.baselineSymptoms.includes(s.id)}
                onClick={() => set("baselineSymptoms", toggle<SymptomId>(draft.baselineSymptoms, s.id))}
              >
                {s.label}
              </Chip>
            ))}
          </div>
        ),
      },
      {
        eyebrow: "Your rhythm",
        title: "How does a normal day feel?",
        body: "Energy, sleep and movement — so plans match your real capacity.",
        valid: true,
        content: (
          <div className="space-y-5">
            <Field label="Energy through the day">
              <Options value={draft.energyRhythm} options={ENERGY_RHYTHMS} onPick={(v) => set("energyRhythm", v)} />
            </Field>
            <Field label="Sleep">
              <Options value={draft.sleepTendency} options={SLEEP_TENDENCIES} onPick={(v) => set("sleepTendency", v)} />
            </Field>
            <Field label="Movement you actually enjoy">
              <Options value={draft.movementStyle} options={MOVEMENT_STYLES} onPick={(v) => set("movementStyle", v)} />
            </Field>
          </div>
        ),
      },
    ],
    [draft],
  );

  const isSummary = step === steps.length;
  const current = steps[Math.min(step, steps.length - 1)];

  const finish = () => {
    saveProfile({ ...draft, onboardedAt: today() });
    onDone();
  };

  if (isSummary) {
    const focusLabels = FOCUS_OPTIONS.filter((f) => draft.focus.includes(f.id)).map((f) => f.label);
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-10 pt-14">
        <Eyebrow>Calibration complete</Eyebrow>
        <h1 className="display mt-2 text-[38px] text-tangerine">
          {draft.name ? `${draft.name}, your plan is ready.` : "Your plan is ready."}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mist-600">
          Ease has set up your cycle timeline and picked the first things worth changing. Nothing here needs to happen
          all at once.
        </p>

        <div className="card mt-7 divide-y divide-mist-200 p-0">
          <SummaryRow label="Cycle" value={`${draft.cycleLength}-day cycle · ${draft.periodLength}-day period`} />
          <SummaryRow label="Focus" value={focusLabels.join(" · ") || "Whole-body basics"} />
          <SummaryRow
            label="Tracking"
            value={
              draft.baselineSymptoms.length
                ? `${draft.baselineSymptoms.length} symptoms against your cycle`
                : "Add symptoms any time"
            }
          />
          <SummaryRow label="Movement" value={draft.movementStyle ?? "We'll start gentle"} />
        </div>

        <div className="mt-auto pt-8">
          <Button full onClick={finish}>
            Create my account <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-8 pt-12">
      <div className="mb-8 flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-[3px] flex-1 rounded-full transition-colors ${i <= step ? "bg-tangerine" : "bg-mist-200"}`}
          />
        ))}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Eyebrow>{current.eyebrow}</Eyebrow>
        <h1 className="display mt-2 text-[32px] text-tangerine">{current.title}</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-mist-500">{current.body}</p>
        <div className="mt-7">{current.content}</div>
      </motion.div>

      <div className="mt-auto pt-10">
        <div className="flex items-center gap-3">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          ) : null}
          <Button full disabled={!current.valid} onClick={() => setStep((s) => s + 1)}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Returning users on a new device land here with no local profile —
            without this they'd have to redo onboarding just to reach sign-in. */}
        {step === 0 ? (
          <p className="mt-5 text-center text-[13px] text-mist-500">
            Already have an account?{" "}
            <button onClick={onSignIn} className="font-semibold text-blue underline-offset-4 hover:underline">
              Sign in
            </button>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function Options({ value, options, onPick }: { value?: string; options: string[]; onPick: (v: string) => void }) {
  return (
    <div className="grid gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onPick(opt)}
          aria-pressed={value === opt}
          className={`min-h-[48px] rounded-2xl border px-4 py-3 text-left text-[14.5px] transition-colors ${
            value === opt
              ? "border-tangerine bg-tangerine-wash font-semibold text-tangerine-deep"
              : "border-mist-200 bg-white text-mist-600 hover:border-mist-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-4">
      <span className="eyebrow">{label}</span>
      <span className="text-right text-[14px] font-medium text-ink">{value}</span>
    </div>
  );
}
