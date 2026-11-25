import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Card, Button, Eyebrow } from "@/components/ui";
import { glide } from "@/lib/motion";
import { supabase, isConfigured } from "@/lib/supabase";
import { fetchGoogleEvents, GOOGLE_CALENDAR_SCOPE } from "@/lib/google";
import { authRedirectUrl } from "@/lib/authRedirect";
import { useStore } from "@/lib/store";

/**
 * The OAuth flow below is built and working — it just isn't switched on yet,
 * so the connect button shows a "coming soon" notice instead of starting it.
 * Flip this to true to ship the feature; nothing else needs to change.
 *
 * Typed as `boolean` rather than left to infer the literal `false`, so the
 * branches that depend on it don't get narrowed away as unreachable.
 */
const GOOGLE_CALENDAR_ENABLED: boolean = false;

export default function GoogleConnect() {
  const { state, saveEvent } = useStore();
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [comingSoon, setComingSoon] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // The Google token only lives on the session object, and only right after the
  // OAuth redirect — Supabase does not refresh it for us.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setProviderToken(data.session?.provider_token ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setProviderToken(session?.provider_token ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const connect = async () => {
    if (!supabase) return;
    setError("");
    setBusy(true);
    try {
      // linkIdentity, not signInWithOAuth: the user is already signed in with
      // email and password, and signInWithOAuth starts a *new* session against
      // whatever identity Google returns — landing them in a second, empty
      // account with their logs stranded in the first. Needs Manual Linking
      // enabled under Supabase → Authentication → Providers.
      const { error: err } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          scopes: GOOGLE_CALENDAR_SCOPE,
          redirectTo: authRedirectUrl(),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (err) throw err;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /provider is not enabled/i.test(msg)
          ? "Google sign-in isn't switched on for this project yet."
          : /manual linking/i.test(msg)
            ? "Account linking isn't switched on for this project yet."
            : "Couldn't start the Google connection.",
      );
      setBusy(false);
    }
  };

  const importEvents = async () => {
    if (!providerToken) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const from = new Date();
      from.setMonth(from.getMonth() - 1);
      const to = new Date();
      to.setMonth(to.getMonth() + 3);

      const events = await fetchGoogleEvents(providerToken, from.toISOString(), to.toISOString());
      // Upserting by the stable g_<id> key means re-importing updates instead
      // of creating duplicates.
      for (const e of events) saveEvent(e);
      setMessage(
        events.length ? `Brought in ${events.length} event${events.length === 1 ? "" : "s"}.` : "No events found.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!isConfigured || !state.session) return null;

  const importedCount = state.events.filter((e) => e.googleId).length;

  return (
    <Card className="mt-8">
      <Eyebrow>Google Calendar</Eyebrow>
      <h2 className="display mt-1.5 text-[25px] text-pearl">
        {providerToken ? "Connected" : "Add your calendar"}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-silk">
        {providerToken
          ? "Import your upcoming events to place them next to your cycle."
          : "Connect Google to see your meetings, shoots and appointments against your phases, so you can place demanding days where your energy is highest."}
      </p>

      {importedCount ? (
        <p className="mt-2 text-[12.5px] text-ash">
          {importedCount} event{importedCount === 1 ? "" : "s"} imported so far.
        </p>
      ) : null}

      {message ? <p className="mt-2 text-[12.5px] font-medium text-plasma-bright">{message}</p> : null}
      {error ? <p className="mt-2 text-[12.5px] font-medium text-alarm">{error}</p> : null}

      <AnimatePresence mode="wait" initial={false}>
        {comingSoon ? (
          <motion.div
            key="soon"
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.14 } }}
            transition={glide}
            /* Plasma, not gloss: this is the system's voice for anything
               provisional, and a feature that doesn't exist yet is exactly
               that. Gloss would promise something the panel can't deliver. */
            className="mt-4 rounded-[18px] border border-plasma/35 bg-plasma-veil p-4"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-plasma/40 text-plasma-bright">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <div>
                <h3 className="display text-[19px] text-pearl">Coming soon</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-silk">
                  Calendar sync is not switched on yet. Add plans by hand in the meantime. Nothing of yours has
                  been sent anywhere.
                </p>
              </div>
            </div>
            <Button full variant="ghost" onClick={() => setComingSoon(false)} className="mt-2">
              Got it
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <Button
              full
              variant="secondary"
              onClick={
                providerToken ? importEvents : GOOGLE_CALENDAR_ENABLED ? connect : () => setComingSoon(true)
              }
              disabled={busy}
              className="mt-4"
            >
              {busy ? "Working…" : providerToken ? "Import events" : "Connect Google Calendar"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-3 text-[11.5px] leading-relaxed text-dusk">
        Read-only. Ease never writes to your Google calendar, and your cycle data is never sent to Google.
      </p>
    </Card>
  );
}
