import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import NavBar, { type Tab } from "@/components/NavBar";
import SettingsSheet from "@/components/SettingsSheet";
import Splash from "@/screens/Splash";
import Home from "@/screens/Home";
import { useStore } from "@/lib/store";
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

/** The lit space every screen sits in. Fixed, so it never scrolls away. */
function Atmosphere() {
  return (
    <>
      <div className="atmosphere" aria-hidden />
      {/* Keeps scrolled content from colliding with the status bar glyphs. */}
      <div className="status-scrim" aria-hidden />
    </>
  );
}

export default function App() {
  const { state, ready } = useStore();
  const [splashDone, setSplashDone] = useState(false);
  // Set only when the user navigates somewhere the derived stage wouldn't send
  // them — signing out, or reaching sign-in from the onboarding screen.
  const [override, setOverride] = useState<Stage | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [pillar, setPillar] = useState<Pillar>("nutrition");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Each screen is a fresh page, so it starts at the top. Document scroll is
  // shared across them: without this, signing up lands on Home still scrolled
  // by however far the keyboard pushed the auth form, tucking the header under
  // the notch on a new user's very first view.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, override, state.session?.id, splashDone]);

  if (!splashDone)
    return (
      <>
        <Atmosphere />
        <Splash onDone={() => setSplashDone(true)} />
      </>
    );

  // Never decide where someone belongs until their profile has loaded once, or
  // a returning user on a new device gets pushed through onboarding again.
  // Only the first load blocks — later re-syncs happen behind the UI.
  if (!ready) {
    return (
      <div className="flex min-h-[calc(100dvh-var(--safe-top))] items-center justify-center">
        <p className="eyebrow">Loading your plan…</p>
      </div>
    );
  }

  // Every feature is free. Nothing in the app is gated on payment.
  const derived: Stage = state.session ? "app" : state.profile.onboardedAt ? "auth" : "onboarding";
  const stage = override ?? derived;
  const clear = () => setOverride(null);

  if (stage === "onboarding") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Atmosphere />
        <Onboarding onDone={clear} onSignIn={() => setOverride("auth")} />
      </Suspense>
    );
  }
  if (stage === "auth") {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <Atmosphere />
        <Auth onDone={clear} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-var(--safe-top))]">
      <Atmosphere />
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
            {tab === "calendar" ? <Calendar /> : null}
            {tab === "body" ? <Body pillar={pillar} onPillar={setPillar} /> : null}
            {tab === "patterns" ? <Patterns /> : null}
          </Suspense>
        </motion.main>
      </AnimatePresence>

      <NavBar tab={tab} onTab={setTab} />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignOut={() => {
          setTab("home");
          setOverride("auth");
        }}
      />
    </div>
  );
}
