import { useEffect } from "react";
import { motion } from "motion/react";

export default function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.button
      onClick={onDone}
      aria-label="Continue"
      className="flex min-h-[calc(100dvh-var(--safe-top))] w-full flex-col items-center justify-center bg-bone px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="display text-[76px] text-tangerine"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        Ease
      </motion.h1>
      <motion.p
        className="mt-4 max-w-[26ch] text-center text-[15px] leading-relaxed text-mist-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        Your cycle, your food, your energy — finally in one place.
      </motion.p>
      <motion.div
        className="mt-12 h-px w-16 bg-tangerine"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
      />
    </motion.button>
  );
}
