import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import { Button, Chip, Eyebrow } from "@/components/ui";
import { FOCUS_OPTIONS, SYMPTOMS } from "@/data/content";
import { useStore } from "@/lib/store";
import { isAdult, today } from "@/lib/date";
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
        eyebrow: "Step 1 of 5 · About you",
        title: "Enter two details.",
        body: "Your name and date of birth. Both stay on your device until you create an account.",
        // Date of birth is required and gated. The DPDP Act treats everyone
        // under 18 as a Child, which obliges us to obtain verifiable consent
        // from a parent before processing anything they log. We have no way to
        // do that, so the honest answer is not to open the account at all.
        valid: draft.name.trim().length > 0 && isAdult(draft.birthDate),
        content: (
          <div className="space-y-4">
            <Field label="Your name">
              <input
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Jasmine"
                className="w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                max={today()}
                value={draft.birthDate}
                onChange={(e) => set("birthDate", e.target.value)}
                className="w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
              />
            </Field>
            {draft.birthDate && !isAdult(draft.birthDate) ? (
              <p role="alert" className="text-[13px] leading-relaxed text-alarm">
                Ease is only available to people aged 18 and over. We're sorry — the rules on handling health data for
                under-18s are strict, and we would rather turn you away than handle yours badly.
              </p>
            ) : null}
          </div>
        ),
      },
      {
        eyebrow: "Step 2 of 5 · Your cycle",
        title: "Set your last period start date.",
        body: "An approximate date is enough. Ease refines it as you log, so it never needs to be exact.",
        valid: true,
        content: (
          <div className="space-y-5">
            <Field label="Last period started">
              <input
                type="date"
                max={today()}
                value={draft.lastPeriodStart}
                onChange={(e) => set("lastPeriodStart", e.target.value)}
                className="w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
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
              <p className="mt-2 text-[12px] leading-relaxed text-ash">
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
        eyebrow: "Step 3 of 5 · Your focus",
        title: "Choose what to work on first.",
        body: "Select as many as apply. This decides what Ease puts in front of you on the home screen.",
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
                    selected ? "border-gloss bg-gloss-veil" : "border-veil bg-slate hover:border-gloss/50"
                  }`}
                >
                  <span>
                    <span className="block text-[15px] font-semibold text-pearl">{opt.label}</span>
                    <span className="block text-[12.5px] text-ash">{opt.blurb}</span>
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-gloss" /> : null}
                </button>
              );
            })}
          </div>
        ),
      },
      {
        eyebrow: "Step 4 of 5 · Your symptoms",
        title: "Select the symptoms you get.",
        body: "Ease tracks each one against your cycle, so you can see what actually moves it.",
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
        eyebrow: "Step 5 of 5 · Your rhythm",
        title: "Describe a normal day.",
        body: "Energy, sleep and movement. Ease matches the steps it gives you to your real capacity.",
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
        <Eyebrow>Setup complete</Eyebrow>
        <h1 className="display-xl lit mt-2 text-[42px]">
          {draft.name ? `${draft.name}, here is your setup.` : "Here is your setup."}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-silk">
          Your cycle timeline is built and your first focus is set. Work through it one step at a time — none of it
          has to happen at once.
        </p>

        <div className="card mt-7 divide-y divide-veil p-0">
          <SummaryRow label="Cycle" value={`${draft.cycleLength}-day cycle · ${draft.periodLength}-day period`} />
          <SummaryRow label="Focus" value={focusLabels.join(" · ") || "Start with the basics"} />
          <SummaryRow
            label="Tracking"
            value={
              draft.baselineSymptoms.length
                ? `${draft.baselineSymptoms.length} symptoms against your cycle`
                : "Add symptoms whenever you log"
            }
          />
          <SummaryRow label="Movement" value={draft.movementStyle ?? "Start gentle"} />
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
            className={`h-[3px] flex-1 rounded-full transition-colors ${i <= step ? "bg-gloss" : "bg-veil"}`}
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
        <h1 className="display-xl lit mt-2 text-[36px]">{current.title}</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ash">{current.body}</p>
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
          <p className="mt-5 text-center text-[13px] text-ash">
            Already have an account?{" "}
            <button onClick={onSignIn} className="font-semibold text-plasma-bright underline-offset-4 hover:underline">
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
              ? "border-gloss bg-gloss-veil font-semibold text-gloss-bright"
              : "border-veil bg-slate text-silk hover:border-gloss/50"
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
      <span className="text-right text-[14px] font-medium text-pearl">{value}</span>
    </div>
  );
}
