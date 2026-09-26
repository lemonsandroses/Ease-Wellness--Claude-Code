import type { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui";
import { glide } from "@/lib/motion";

/**
 * Shows the real content blurred behind the pitch rather than hiding it.
 * Seeing what you're missing converts far better than an empty box — and it's
 * honest about what's actually there.
 */
export default function Locked({
  title,
  body,
  onUnlock,
  children,
  minHeight = 260,
}: {
  title: string;
  body: string;
  onUnlock: () => void;
  children?: ReactNode;
  minHeight?: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)]" style={{ minHeight }}>
      {children ? (
        <div aria-hidden className="pointer-events-none select-none blur-[6px] saturate-[0.85] opacity-60">
          {children}
        </div>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center bg-bone/55 px-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={glide}
          className="card w-full max-w-[19rem] p-5 text-center"
        >
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-tangerine-wash text-tangerine">
            <Lock className="h-[18px] w-[18px]" />
          </span>
          <h3 className="mt-3 text-[16px] font-semibold text-ink">{title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-mist-500">{body}</p>
          <Button full onClick={onUnlock} className="mt-4">
            <Sparkles className="h-4 w-4" /> Unlock premium
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
