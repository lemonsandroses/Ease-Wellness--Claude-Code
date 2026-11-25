import { motion, useReducedMotion } from "motion/react";
import AnimatedNumber from "@/components/AnimatedNumber";
import type { Phase } from "@/types";
import { PHASE_LABEL } from "@/lib/cycle";
import { glide } from "@/lib/motion";

const SIZE = 272;
const R = 116;
const CENTER = SIZE / 2;

/* Each phase is a pane of the stained glass, and the four of them close a
   hue loop: magenta at the bleed, violet as it builds, pale lilac at the
   brightest point, then orchid carrying it back round to magenta. A ring
   whose colour returns to where it started is the whole idea of a cycle.

   Gold is deliberately absent. It is a micro-accent in this system — 1px
   strokes and nothing more — and across an arc this long it desaturates into
   a muddy tan that belongs to no part of the palette. */
const PHASE_COLOR: Record<Phase, string> = {
  menstrual: "#FF2D87",
  follicular: "#7B4DFF",
  ovulatory: "#AE93FF",
  luteal: "#D14FC4",
};

function polar(fraction: number, radius: number) {
  const angle = fraction * 2 * Math.PI - Math.PI / 2;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function arc(from: number, to: number, radius: number) {
  const a = polar(from, radius);
  const b = polar(to, radius);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
}

export default function CycleRing({
  day,
  cycleLength,
  periodLength,
  phase,
  estimated,
}: {
  day: number;
  cycleLength: number;
  periodLength: number;
  phase: Phase;
  estimated: boolean;
}) {
  const reduced = useReducedMotion();
  const ovulation = Math.round(cycleLength - 14);
  const segments: { phase: Phase; from: number; to: number }[] = [
    { phase: "menstrual", from: 0, to: periodLength / cycleLength },
    { phase: "follicular", from: periodLength / cycleLength, to: (ovulation - 1) / cycleLength },
    { phase: "ovulatory", from: (ovulation - 1) / cycleLength, to: (ovulation + 1) / cycleLength },
    { phase: "luteal", from: (ovulation + 1) / cycleLength, to: 0.999 },
  ];

  const progress = Math.min(day / cycleLength, 1);
  const marker = polar(progress, R);
  const accent = PHASE_COLOR[phase];

  /* The HUD scale: one tick per day, drawn outside the ring. It makes the
     ring an instrument you can read a position off, not just a decoration. */
  const ticks = Array.from({ length: Math.max(1, Math.round(cycleLength)) }, (_, i) => i);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      {/* The bloom: a soft pool of phase colour behind the ring, breathing
          slowly. This is the liquid-gloss glow — it belongs under the glass,
          never on top of it. */}
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[58px] ${
          reduced ? "" : "bloom"
        }`}
        style={{ background: accent, opacity: reduced ? 0.24 : undefined }}
        aria-hidden
      />

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        // Same reason the header no longer says "of 31" past day 31: a
        // denominator the number has overtaken is wrong read aloud too.
        aria-label={
          day > cycleLength
            ? `Cycle day ${day}, past the usual ${cycleLength} days, ${PHASE_LABEL[phase]} phase`
            : `Cycle day ${day} of about ${cycleLength}, ${PHASE_LABEL[phase]} phase`
        }
        className="relative"
      >
        <defs>
          {/* Glow for the live segment and the marker. */}
          <filter id="ring-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Day ticks — the telemetry scale. */}
        <g opacity={0.8}>
          {ticks.map((i) => {
            const f = i / cycleLength;
            const inner = polar(f, R + 9);
            const outer = polar(f, R + (i % 7 === 0 ? 16 : 12.5));
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={i < day ? accent : "#5B4A7D"}
                strokeWidth={i % 7 === 0 ? 1.4 : 0.8}
                strokeLinecap="round"
                opacity={i < day ? 1 : 0.75}
              />
            );
          })}
        </g>

        {/* The unlit track the phases sit on. */}
        <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="#241A3C" strokeWidth={1.5} />

        {segments.map((s, i) => (
          <motion.path
            key={s.phase}
            d={arc(s.from, s.to, R)}
            fill="none"
            stroke={PHASE_COLOR[s.phase]}
            strokeWidth={s.phase === phase ? 7 : 2.5}
            strokeLinecap="round"
            filter={s.phase === phase ? "url(#ring-glow)" : undefined}
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: s.phase === phase ? 1 : 0.4 }}
            transition={{
              pathLength: { duration: 0.85, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 + i * 0.09 },
              opacity: { duration: 0.4, delay: 0.1 + i * 0.09 },
            }}
          />
        ))}

        {/* The marker travels around to today's position rather than appearing there. */}
        <motion.g
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75, duration: 0.3 }}
        >
          <motion.circle
            cx={marker.x}
            cy={marker.y}
            r={13}
            fill="none"
            stroke={accent}
            strokeWidth={1}
            opacity={0.45}
            animate={reduced ? {} : { r: [13, 19, 13], opacity: [0.45, 0.04, 0.45] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />
          {/* Rhinestone: a pearl bead with a gloss core, so today's position
              catches the light the way a set stone would. */}
          <motion.circle
            cx={marker.x}
            cy={marker.y}
            r={7}
            fill="#EFE6FF"
            filter="url(#ring-glow)"
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...glide, delay: 0.8 }}
            style={{ originX: `${marker.x}px`, originY: `${marker.y}px` }}
          />
          <circle cx={marker.x} cy={marker.y} r={3} fill={accent} />
        </motion.g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="eyebrow mb-1.5"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {estimated ? "Around day" : "Day"}
        </motion.span>

        <AnimatedNumber value={day} className="numeral text-[72px] text-pearl" />

        <motion.span
          className="mt-2.5 text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: accent }}
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, ...glide }}
        >
          {PHASE_LABEL[phase]}
        </motion.span>
      </div>
    </div>
  );
}
