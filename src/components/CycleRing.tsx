import { motion, useReducedMotion } from "motion/react";
import AnimatedNumber from "@/components/AnimatedNumber";
import type { Phase } from "@/types";
import { PHASE_LABEL } from "@/lib/cycle";
import { glide } from "@/lib/motion";

const SIZE = 260;
const R = 112;
const CENTER = SIZE / 2;

const PHASE_COLOR: Record<Phase, string> = {
  menstrual: "#F2701C",
  follicular: "#4E6E8E",
  ovulatory: "#7FA0BC",
  luteal: "#E9A97C",
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

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Cycle day ${day} of about ${cycleLength}, ${PHASE_LABEL[phase]} phase`}
      >
        <circle cx={CENTER} cy={CENTER} r={R} fill="none" stroke="#F0EBE6" strokeWidth={1} />

        {segments.map((s, i) => (
          <motion.path
            key={s.phase}
            d={arc(s.from, s.to, R)}
            fill="none"
            stroke={PHASE_COLOR[s.phase]}
            strokeWidth={s.phase === phase ? 7 : 3}
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: s.phase === phase ? 1 : 0.28 }}
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
            stroke="#14110F"
            strokeWidth={1}
            opacity={0.18}
            animate={reduced ? {} : { r: [13, 17, 13], opacity: [0.18, 0.05, 0.18] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          />
          <motion.circle
            cx={marker.x}
            cy={marker.y}
            r={7}
            fill="#14110F"
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...glide, delay: 0.8 }}
            style={{ originX: `${marker.x}px`, originY: `${marker.y}px` }}
          />
        </motion.g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="eyebrow mb-1"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {estimated ? "Around day" : "Day"}
        </motion.span>

        <AnimatedNumber value={day} className="numeral text-[68px] text-ink" />

        <motion.span
          className="mt-2 text-[13px] font-semibold tracking-wide text-tangerine"
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
