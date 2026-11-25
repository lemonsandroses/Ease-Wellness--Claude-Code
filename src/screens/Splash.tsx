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
      className="flex min-h-[calc(100dvh-var(--safe-top))] w-full flex-col items-center justify-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1
        className="display-xl lit text-[88px]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        Ease
      </motion.h1>
      <motion.p
        className="mt-5 max-w-[26ch] text-center text-[14.5px] leading-relaxed text-ash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6 }}
      >
        Track your cycle, your food and your energy in one place.
      </motion.p>
      <motion.div
        className="gilt-hair mt-12 h-px w-24"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
      />
    </motion.button>
  );
}
