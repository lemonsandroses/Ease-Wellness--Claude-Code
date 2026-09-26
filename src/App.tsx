import { lazy, Suspense, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import NavBar, { type Tab } from "@/components/NavBar";
import SettingsSheet from "@/components/SettingsSheet";
import Splash from "@/screens/Splash";
import Home from "@/screens/Home";
import { useStore } from "@/lib/store";
import { usePurchases } from "@/lib/purchases";
import { page } from "@/lib/motion";
import type { Pillar } from "@/types";

// Home and the splash load eagerly — they're the first thing anyone sees.
// Everything else is fetched on demand, which keeps Recharts (the single
// heaviest dependency, used only by Patterns) out of the startup bundle.
const Calendar = lazy(() => import("@/screens/Calendar"));
const Body = lazy(() => import("@/screens/Body"));
const Patterns = lazy(() => import("@/screens/Patterns"));
const Onboarding = lazy(() => import("@/screens/Onboarding"));
const Auth = lazy(() => import("@/screens/Auth"));
const Paywall = lazy(() => import("@/screens/Paywall"));

/** Shown only for the instant a lazy chunk is in flight. */
function ScreenFallback() {
  return (
    <div className="mx-auto w-full max-w-md px-5 pt-10">
      <div className="skeleton h-4 w-24 rounded-full" />
      <div className="skeleton mt-4 h-9 w-48 rounded-lg" />
      <div className="skeleton mt-6 h-40 w-full rounded-[var(--radius-card)]" />
      <div className="skeleton mt-4 h-40 w-full rounded-[var(--radius-card)]" />
    </div>
  );
}

type Stage = "onboarding" | "auth" | "app";

export default function App() {
  const { state, ready } = useStore();
  const { ready: billingReady } = usePurchases();
  const [splashDone, setSplashDone] = useState(false);
  // Set only when the user navigates somewhere the derived stage wouldn't send
  // them — signing out, or reaching sign-in from the onboarding screen.
  const [override, setOverride] = useState<Stage | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [pillar, setPillar] = useState<Pillar>("nutrition");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  if (!splashDone) return <Splash onDone={() => setSplashDone(true)} />;

  // Never decide where someone belongs until their profile has loaded once, or
  // a returning user on a new device gets pushed through onboarding again.
  // Only the first load blocks — later re-syncs happen behind the UI.
  // Wait for the store too, so a paying user never sees a locked screen flash
  // before their entitlement has been confirmed.
  if (!ready || !billingReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bone">
        <p className="eyebrow">Loading your plan…</p>
      </div>
    );
  }

  // The paywall is no longer a gate. Everyone reaches the app; premium features
  // ask for an upgrade at the point the user wants them.
  const derived: Stage = state.session ? "app" : state.profile.onboardedAt ? "auth" : "onboarding";
  const stage = override ?? derived;
  const clear = () => setOverride(null);

  if (stage === "onboarding") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Onboarding onDone={clear} onSignIn={() => setOverride("auth")} />
      </Suspense>
    );
  }
  if (stage === "auth") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Auth onDone={clear} />
      </Suspense>
    );
  }

  const openPaywall = () => setPaywallOpen(true);

  return (
    <div className="min-h-[100dvh] bg-bone">
      <AnimatePresence mode="wait" initial={false}>
        <motion.main key={tab} variants={page} initial="hidden" animate="show" exit="exit">
          {tab === "home" ? (
            <Home
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenCalendar={() => setTab("calendar")}
              onOpenPillar={(p) => {
                setPillar(p);
                setTab("body");
              }}
            />
          ) : null}
          <Suspense fallback={<ScreenFallback />}>
            {tab === "calendar" ? <Calendar onUnlock={openPaywall} /> : null}
            {tab === "body" ? <Body pillar={pillar} onPillar={setPillar} onUnlock={openPaywall} /> : null}
            {tab === "patterns" ? <Patterns onUnlock={openPaywall} /> : null}
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <NavBar tab={tab} onTab={setTab} />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpgrade={openPaywall}
        onSignOut={() => {
          setTab("home");
          setOverride("auth");
        }}
      />

      <AnimatePresence>
        {paywallOpen ? (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-bone"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22 }}
          >
            <Suspense fallback={<ScreenFallback />}>
              <Paywall onClose={() => setPaywallOpen(false)} />
            </Suspense>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
