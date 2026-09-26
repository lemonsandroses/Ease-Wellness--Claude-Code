import { useEffect, useState } from "react";
import { Card, Button, Eyebrow } from "@/components/ui";
import { supabase, isConfigured } from "@/lib/supabase";
import { fetchGoogleEvents, GOOGLE_CALENDAR_SCOPE } from "@/lib/google";
import { useStore } from "@/lib/store";

export default function GoogleConnect() {
  const { state, saveEvent } = useStore();
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: GOOGLE_CALENDAR_SCOPE,
          redirectTo: window.location.origin,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (err) throw err;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /provider is not enabled/i.test(msg)
          ? "Google sign-in isn't switched on for this project yet."
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
      <h2 className="mt-1 text-[17px] font-semibold text-ink">
        {providerToken ? "Connected" : "Bring your real life in"}
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-mist-600">
        {providerToken
          ? "Import your upcoming events so your meetings and shoots sit next to your cycle."
          : "Connect Google and Ease can show your meetings, shoots and appointments against your phases — so the heavy days land where you have the energy."}
      </p>

      {importedCount ? (
        <p className="mt-2 text-[12.5px] text-mist-500">
          {importedCount} event{importedCount === 1 ? "" : "s"} imported so far.
        </p>
      ) : null}

      {message ? <p className="mt-2 text-[12.5px] font-medium text-blue">{message}</p> : null}
      {error ? <p className="mt-2 text-[12.5px] font-medium text-[#B4321F]">{error}</p> : null}

      <Button full variant="secondary" onClick={providerToken ? importEvents : connect} disabled={busy} className="mt-4">
        {busy ? "Working…" : providerToken ? "Import events" : "Connect Google Calendar"}
      </Button>

      <p className="mt-3 text-[11.5px] leading-relaxed text-mist-400">
        Read-only. Ease never writes to your Google calendar, and your cycle data is never sent to Google.
      </p>
    </Card>
  );
}
