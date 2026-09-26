import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Eyebrow } from "@/components/ui";
import { PHASE_CONTENT, PILLARS } from "@/data/content";
import { computeCycleState, PHASE_LABEL } from "@/lib/cycle";
import { useStore } from "@/lib/store";
import type { Pillar } from "@/types";
import { ease, fadeUp, stagger } from "@/lib/motion";
import Locked from "@/components/Locked";
import { LOCK_COPY, usePremium } from "@/lib/premium";

/** Nutrition is the free pillar — everything else is premium. */
const FREE_PILLARS: Pillar[] = ["nutrition"];

export default function Body({
  pillar,
  onPillar,
  onUnlock,
}: {
  pillar: Pillar;
  onPillar: (p: Pillar) => void;
  onUnlock: () => void;
}) {
  const { state } = useStore();
  const premium = usePremium();
  const cycle = computeCycleState(state.profile, state.logs);
  const active = PILLARS.find((p) => p.id === pillar) ?? PILLARS[0];
  const [open, setOpen] = useState<string | null>(active.cards[0]?.title ?? null);
  const locked = !premium && !FREE_PILLARS.includes(active.id);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
      <Eyebrow>
        {cycle.estimated ? "Estimated" : PHASE_LABEL[cycle.phase]} · {PHASE_CONTENT[cycle.phase].headline}
      </Eyebrow>
      <h1 className="display mt-2 text-[36px] text-tangerine">Body</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-mist-500">
        What to eat, how to move, and why your symptoms do what they do — six things, one at a time.
      </p>

      <nav className="no-bar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5" aria-label="Body sections">
        {PILLARS.map((p) => {
          const pillarLocked = !premium && !FREE_PILLARS.includes(p.id);
          return (
            <button
              key={p.id}
              onClick={() => {
                onPillar(p.id);
                setOpen(PILLARS.find((x) => x.id === p.id)?.cards[0]?.title ?? null);
              }}
              aria-current={p.id === pillar}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                p.id === pillar
                  ? "border-ink bg-ink text-white"
                  : "border-mist-200 bg-white text-mist-600 hover:border-mist-300"
              }`}
            >
              {p.label}
              {pillarLocked ? <Lock className="h-3 w-3 opacity-70" /> : null}
            </button>
          );
        })}
      </nav>

      <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <p className="mt-7 text-[15px] leading-relaxed text-ink">{active.tagline}</p>

        {locked ? (
          <div className="mt-5">
            <Locked title={LOCK_COPY.pillar.title} body={LOCK_COPY.pillar.body} onUnlock={onUnlock} minHeight={340}>
              <div className="space-y-3">
                {active.cards.map((card) => (
                  <article key={card.title} className="card p-5">
                    <p className="text-[16px] font-semibold text-ink">{card.title}</p>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-mist-600">{card.why}</p>
                  </article>
                ))}
              </div>
            </Locked>
          </div>
        ) : (
        <div className="mt-5 space-y-3">
          {active.cards.map((card) => {
            const expanded = open === card.title;
            return (
              <article key={card.title} className="card overflow-hidden p-0">
                <button
                  onClick={() => setOpen(expanded ? null : card.title)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[16px] font-semibold text-ink">{card.title}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-mist-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: ease, opacity: { duration: 0.18 } }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        variants={stagger(0.05)}
                        initial="hidden"
                        animate="show"
                        className="space-y-4 px-5 pb-5"
                      >
                        <motion.p variants={fadeUp} className="text-[13.5px] leading-relaxed text-mist-600">
                          {card.why}
                        </motion.p>

                        <motion.div variants={fadeUp}>
                          <Eyebrow>Do this</Eyebrow>
                          <ul className="mt-2 space-y-2">
                            {card.actions.map((a) => (
                              <li key={a} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink">
                                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-tangerine" />
                                {a}
                              </li>
                            ))}
                          </ul>
                        </motion.div>

                        {card.avoid?.length ? (
                          <motion.div variants={fadeUp} className="rounded-2xl bg-blue-wash px-4 py-3">
                            <Eyebrow>Go easy on</Eyebrow>
                            <ul className="mt-1.5 space-y-1">
                              {card.avoid.map((a) => (
                                <li key={a} className="text-[13px] leading-relaxed text-blue">
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        ) : null}
                      </motion.div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
        )}
      </motion.div>
    </div>
  );
}
