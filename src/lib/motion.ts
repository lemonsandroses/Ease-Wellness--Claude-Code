import type { Transition, Variants } from "motion/react";

/**
 * One motion vocabulary for the whole app. Two springs and two durations —
 * everything else is a variation, so nothing feels borrowed from another app.
 */

/** Interface feedback: fast, barely perceptible. */
export const snap: Transition = { type: "spring", stiffness: 520, damping: 34, mass: 0.6 };

/** Things entering or moving across the screen. */
export const glide: Transition = { type: "spring", stiffness: 260, damping: 28, mass: 0.9 };

/** Celebratory — only for genuine achievements. */
export const pop: Transition = { type: "spring", stiffness: 400, damping: 14, mass: 0.8 };

export const ease: Transition = { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: glide },
};

/** Parent of a list — children arrive one after another rather than all at once. */
export const stagger = (delay = 0.04): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: delay, delayChildren: 0.02 } },
});

export const page: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.24, ease: [0.22, 0.61, 0.36, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14 } },
};

/** Press feedback for anything tappable. */
export const press = { whileTap: { scale: 0.97 }, transition: snap };
