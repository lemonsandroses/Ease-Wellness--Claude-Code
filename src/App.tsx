import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import NavBar, { type Tab } from "@/components/NavBar";
import SettingsSheet from "@/components/SettingsSheet";
import Calendar from "@/screens/Calendar";
import Splash from "@/screens/Splash";
import Onboarding from "@/screens/Onboarding";
import Auth from "@/screens/Auth";
import Paywall from "@/screens/Paywall";
import Home from "@/screens/Home";
import Body from "@/screens/Body";
import Patterns from "@/screens/Patterns";
import { useStore } from "@/lib/store";
import { page } from "@/lib/motion";
import type { Pillar } from "@/types";

type Stage = "onboarding" | "auth" | "app";

export default function App() {
  const { state, ready } = useStore();
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
  if (!ready) {
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
    return <Onboarding onDone={clear} onSignIn={() => setOverride("auth")} />;
  }
  if (stage === "auth") return <Auth onDone={clear} />;

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
          {tab === "calendar" ? <Calendar onUnlock={openPaywall} /> : null}
          {tab === "body" ? <Body pillar={pillar} onPillar={setPillar} onUnlock={openPaywall} /> : null}
          {tab === "patterns" ? <Patterns onUnlock={openPaywall} /> : null}
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
            <Paywall onClose={() => setPaywallOpen(false)} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
