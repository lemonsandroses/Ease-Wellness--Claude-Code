import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * A one-shot burst, sized for a sheet rather than a full screen.
 *
 * Colours come from the palette, not the usual confetti primaries: on obsidian
 * a red/green/blue scatter reads as a party popper pasted onto the app. Gloss,
 * plasma, gilt and mint keep it inside the design system.
 *
 * Absolutely positioned and pointer-events-none, so it never sits between the
 * user and the content underneath.
 */

const COLORS = ["#FF2D87", "#FF7AB8", "#7B4DFF", "#AE93FF", "#E3B873", "#5FE3C0", "#EFE6FF"];

export default function Confetti({ count = 30 }: { count?: number }) {
  const reduced = useReducedMotion();

  // Randomised once per mount. The sheet unmounts on close, so every save gets
  // a fresh scatter rather than the same frozen arrangement each time.
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        const spread = 40 + Math.random() * 130;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          xMid: dir * spread * 0.55,
          xEnd: dir * spread,
          lift: -(50 + Math.random() * 90),
          fall: 130 + Math.random() * 150,
          rotate: (Math.random() * 2 - 1) * 320,
          width: 5 + Math.random() * 5,
          height: 8 + Math.random() * 8,
          delay: Math.random() * 0.18,
          duration: 1.3 + Math.random() * 0.7,
          round: Math.random() > 0.7,
        };
      }),
    [count],
  );

  // Not a decorative flourish worth overriding someone's motion setting for.
  if (reduced) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={{
            x: [0, p.xMid, p.xEnd],
            y: [0, p.lift, p.fall],
            rotate: [0, p.rotate],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.17, 0.67, 0.5, 1], times: [0, 0.3, 0.75, 1] }}
          style={{
            position: "absolute",
            left: "50%",
            top: 46,
            width: p.width,
            height: p.height,
            borderRadius: p.round ? "50%" : 2,
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
