import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Counts up to a value. Used for the numbers that carry weight — cycle day,
 * streak, macros — so they land rather than just appear.
 */
export default function AnimatedNumber({
  value,
  duration = 700,
  decimals = 0,
  className = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  // Don't animate into a tab nobody is looking at: requestAnimationFrame is
  // paused while hidden, which would leave the number frozen at zero.
  const skip = reduced || (typeof document !== "undefined" && document.hidden);
  const [display, setDisplay] = useState(skip ? value : 0);
  const from = useRef(0);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (skip) {
      setDisplay(value);
      from.current = value;
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = value - origin;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out cubic: fast start, gentle settle.
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(origin + delta * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else from.current = value;
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration, skip]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
