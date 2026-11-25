import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { glide, snap } from "@/lib/motion";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({
  children,
  className = "",
  lit,
}: {
  children: ReactNode;
  className?: string;
  /** The one panel per screen that carries the brand — gloss edge and bloom. */
  lit?: boolean;
}) {
  return <section className={`card ${lit ? "card-lit" : ""} p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="mb-3">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="display mt-1 text-[27px] text-pearl">{title}</h2>
    </header>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
  className?: string;
};

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  full,
  className = "",
}: ButtonProps) {
  const base =
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-[0.01em] transition-colors disabled:opacity-40";
  const styles = {
    primary: "btn-gloss",
    secondary: "border border-veil-strong bg-slate/70 text-pearl backdrop-blur-sm hover:border-gloss",
    ghost: "text-ash hover:text-pearl",
  }[variant];
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.975 }}
      transition={snap}
      className={`${base} ${styles} ${full ? "w-full" : ""} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export function Chip({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.94 }}
      animate={selected ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={snap}
      className={`min-h-[44px] rounded-full border px-4 text-[14px] transition-colors ${
        selected
          ? "border-gloss/70 bg-gloss-veil font-semibold text-gloss-bright shadow-[0_0_18px_-6px_rgba(255,45,135,0.6)]"
          : "border-veil bg-slate/60 text-silk hover:border-gloss/50 hover:text-pearl"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function EmptyState({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-veil-strong bg-void/30 px-5 py-8 text-center">
      {icon ? <div className="text-dusk">{icon}</div> : null}
      <p className="text-[14.5px] font-semibold text-silk">{title}</p>
      <p className="max-w-[34ch] text-[12.5px] leading-relaxed text-ash">{body}</p>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-void/75 backdrop-blur-[6px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={label}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-t border-veil-strong bg-obsidian/95 p-5 pb-8 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:rounded-[28px] sm:border"
            initial={{ y: "6%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "4%", opacity: 0, transition: { duration: 0.16 } }}
            transition={glide}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle — the only affordance saying this panel drags away. */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-veil-strong sm:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <Eyebrow>{label}</Eyebrow>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-veil bg-slate text-ash transition-colors hover:border-gloss hover:text-pearl"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Stat({ value, label, unit }: { value: string | number; label: string; unit?: string }) {
  return (
    <div>
      <p className="numeral text-[42px] text-pearl">
        {value}
        {unit ? <span className="ml-1 font-sans text-[13px] font-medium text-ash">{unit}</span> : null}
      </p>
      <p className="eyebrow mt-1.5">{label}</p>
    </div>
  );
}
