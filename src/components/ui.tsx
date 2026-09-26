import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { glide, snap } from "@/lib/motion";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card p-5 ${className}`}>{children}</section>;
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="mb-3">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="display mt-1 text-[26px] text-tangerine">{title}</h2>
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
    "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors disabled:opacity-40";
  const styles = {
    primary: "bg-tangerine text-white hover:bg-[#DB6316]",
    secondary: "border border-mist-300 bg-white text-ink hover:border-ink",
    ghost: "text-mist-600 hover:text-ink",
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
          ? "border-tangerine bg-tangerine-wash font-semibold text-tangerine-deep"
          : "border-mist-200 bg-white text-mist-600 hover:border-mist-300"
      }`}
    >
      {children}
    </motion.button>
  );
}

export function EmptyState({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-mist-200 px-5 py-8 text-center">
      {icon ? <div className="text-mist-300">{icon}</div> : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      <p className="max-w-[36ch] text-[13px] leading-relaxed text-mist-500">{body}</p>
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
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 backdrop-blur-[2px] sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label={label}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-bone p-5 pb-8 sm:rounded-[28px]"
            initial={{ y: "6%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "4%", opacity: 0, transition: { duration: 0.16 } }}
            transition={glide}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <Eyebrow>{label}</Eyebrow>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-mist-200 bg-white text-mist-600"
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
      <p className="numeral text-[40px] text-ink">
        {value}
        {unit ? <span className="ml-1 font-sans text-[13px] font-medium text-mist-500">{unit}</span> : null}
      </p>
      <p className="eyebrow mt-1.5">{label}</p>
    </div>
  );
}
