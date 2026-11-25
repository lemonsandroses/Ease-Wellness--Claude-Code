import { motion } from "motion/react";
import { Eyebrow } from "@/components/ui";
import { PHASE_CONTENT, PILLARS } from "@/data/content";
import { computeCycleState, PHASE_LABEL } from "@/lib/cycle";
import { useStore } from "@/lib/store";
import type { Pillar } from "@/types";
import { fadeUp, stagger } from "@/lib/motion";

export default function Body({
  pillar,
  onPillar,
}: {
  pillar: Pillar;
  onPillar: (p: Pillar) => void;
}) {
  const { state } = useStore();
  const cycle = computeCycleState(state.profile, state.logs);
  const active = PILLARS.find((p) => p.id === pillar) ?? PILLARS[0];

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
      {/* With no period logged there is no phase to name, and claiming one
          would invent the very thing the user came here to find out. */}
      <Eyebrow>
        {!cycle.known
          ? "Log a period to see this by phase"
          : `${cycle.estimated ? "Estimated" : PHASE_LABEL[cycle.phase]} · ${PHASE_CONTENT[cycle.phase].headline}`}
      </Eyebrow>
      <h1 className="display-xl lit mt-2 text-[42px]">Body</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ash">
        Pick an area. Each one gives you the mechanism behind it and the steps that follow from it.
      </p>

      <nav className="no-bar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5" aria-label="Body sections">
        {PILLARS.map((p) => {
          return (
            <button
              key={p.id}
              onClick={() => onPillar(p.id)}
              aria-current={p.id === pillar}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
                p.id === pillar
                  ? "border-pearl bg-pearl text-void"
                  : "border-veil bg-slate text-silk hover:border-gloss/50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </nav>

      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="mt-7 text-[15px] leading-relaxed text-pearl">{active.tagline}</p>

        {/* One section per area. It used to be three, behind an accordion;
            with a single section that toggle did nothing except let someone
            collapse the only content on the screen, so the section is simply
            open. */}
        <div className="mt-5 space-y-3">
          {active.cards.map((card) => (
            <motion.article
              key={card.title}
              variants={stagger(0.05)}
              initial="hidden"
              animate="show"
              className="card p-5"
            >
              <motion.h2 variants={fadeUp} className="display text-[23px] text-pearl">
                {card.title}
              </motion.h2>

              <motion.p variants={fadeUp} className="mt-2.5 text-[13.5px] leading-relaxed text-silk">
                {card.why}
              </motion.p>

              <motion.div variants={fadeUp} className="mt-5">
                <Eyebrow>Do this</Eyebrow>
                <ul className="mt-2.5 space-y-2.5">
                  {card.actions.map((a) => (
                    <li key={a} className="flex gap-2.5 text-[13.5px] leading-relaxed text-pearl">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-gloss" />
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.div>

              {card.avoid?.length ? (
                <motion.div
                  variants={fadeUp}
                  className="mt-5 rounded-2xl border border-plasma/25 bg-plasma-veil px-4 py-3"
                >
                  <Eyebrow>Go easy on</Eyebrow>
                  <ul className="mt-1.5 space-y-1">
                    {card.avoid.map((a) => (
                      <li key={a} className="text-[13px] leading-relaxed text-plasma-bright">
                        {a}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ) : null}
            </motion.article>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
