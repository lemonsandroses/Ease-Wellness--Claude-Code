import { Activity, CalendarDays, House, TrendingUp } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { snap } from "@/lib/motion";

export type Tab = "home" | "calendar" | "body" | "patterns";

const TABS: { id: Tab; label: string; Icon: typeof House }[] = [
  { id: "home", label: "Home", Icon: House },
  { id: "calendar", label: "Calendar", Icon: CalendarDays },
  { id: "body", label: "Body", Icon: Activity },
  { id: "patterns", label: "Patterns", Icon: TrendingUp },
];

export default function NavBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const reduced = useReducedMotion();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-mist-200 bg-bone/95 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-md justify-around px-5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <motion.button
              key={id}
              onClick={() => onTab(id)}
              aria-current={active}
              whileTap={{ scale: 0.92 }}
              transition={snap}
              className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
                active ? "text-tangerine" : "text-mist-400"
              }`}
            >
              {/* The wash slides between tabs instead of blinking on and off. */}
              {active && !reduced ? (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-2 inset-y-0 -z-10 rounded-2xl bg-tangerine-wash"
                  transition={snap}
                />
              ) : null}

              <motion.span animate={active ? { y: -1, scale: 1.06 } : { y: 0, scale: 1 }} transition={snap}>
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.7} />
              </motion.span>
              <span className="text-[11px] font-semibold tracking-wide">{label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
