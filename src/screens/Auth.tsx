import { useState } from "react";
import { ArrowRight, Lock, Mail, MailCheck } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { useStore } from "@/lib/store";
import { supabase, isConfigured } from "@/lib/supabase";
import { authRedirectUrl } from "@/lib/authRedirect";
import { availableProviders, signInWithProvider, SocialCancelled, type SocialProvider } from "@/lib/socialAuth";

type Mode = "signup" | "signin" | "forgot";

/** Supabase error messages are terse and sometimes leak internals — map them. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Confirm your email first. Open the link in your inbox, then sign in.";
  if (m.includes("already registered")) return "That email already has an account. Sign in instead.";
  // This one is the mail server's quota, not the person's behaviour — telling
  // them to "stop trying" when they have typed their address once is both wrong
  // and unhelpful about how long to wait.
  if (m.includes("email rate limit") || m.includes("over_email_send_rate_limit"))
    return "The email service is over its limit. Wait a few minutes, then try again.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("email") && m.includes("invalid")) return "That email address was not accepted. Check it and re-enter it.";
  if (m.includes("password")) return "Password needs at least 8 characters.";
  return "That did not go through. Try again in a moment.";
}

export default function Auth({ onDone }: { onDone: () => void }) {
  const { state } = useStore();
  const [mode, setMode] = useState<Mode>(state.profile.onboardedAt ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [social, setSocial] = useState<SocialProvider | null>(null);

  const providers = availableProviders();

  const useProvider = async (provider: SocialProvider) => {
    setError("");
    setSocial(provider);
    try {
      await signInWithProvider(provider);
      // The store's auth listener picks the session up and moves the app on.
    } catch (err) {
      // Backing out of the provider sheet is a choice, not an error.
      if (!(err instanceof SocialCancelled)) {
        setError(
          provider === "apple"
            ? "Apple sign-in did not complete. Try again, or use your email below."
            : "Google sign-in did not complete. Try again, or use your email below.",
        );
      }
    } finally {
      setSocial(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }

    // No backend configured yet — keep the app usable locally.
    if (!isConfigured || !supabase) {
      onDone();
      return;
    }

    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl(),
        });
        if (err) throw err;
        setResetSent(true);
        return;
      }

      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: authRedirectUrl(),
            data: { name: state.profile.name },
          },
        });
        if (err) throw err;

        // Confirmation is on for this project, so there's no session yet.
        if (!data.session) {
          setSentTo(email);
          return;
        }
        onDone();
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(friendly(err instanceof Error ? err.message : ""));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-10 pt-20">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gloss-veil text-gloss">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="display-xl lit mt-5 text-[40px]">Open your email.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-silk">
          A confirmation link is in <span className="font-semibold text-pearl">{sentTo}</span>. Tap it, then return
          here and sign in. Your answers are already saved.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-ash">
          If nothing arrives within a minute, check the spam folder, or go back and enter a different address.
        </p>

        <div className="mt-auto space-y-2.5 pt-10">
          <Button full onClick={() => { setSentTo(null); setMode("signin"); }}>
            I've confirmed — sign in
          </Button>
          <Button full variant="ghost" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-10 pt-20">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gloss-veil text-gloss">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="display-xl lit mt-5 text-[40px]">Check that inbox.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-silk">
          If an account exists for <span className="font-semibold text-pearl">{email}</span>, a reset link is in that
          inbox now. Open it to set a new password.
        </p>
        <div className="mt-auto pt-10">
          <Button full onClick={() => { setResetSent(false); setMode("signin"); }}>
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  const heading =
    mode === "signup" ? "You start here." : mode === "forgot" ? "Set a new password." : "Sign back in.";
  const blurb =
    mode === "signup"
      ? "Your answers are on this device only. Create an account to carry them to any phone you sign in on."
      : mode === "forgot"
        ? "Enter your email. A reset link arrives in that inbox."
        : "Sign in to reach your cycle history and today's steps.";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-10 pt-16">
      <Eyebrow>{mode === "signup" ? "Step one of one" : mode === "forgot" ? "Password reset" : "Sign in"}</Eyebrow>
      <h1 className="display-xl lit mt-2 text-[42px]">{heading}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ash">{blurb}</p>

      {/* Not offered on the reset-password screen — there is no account to
          create there, and Apple and Google manage their own passwords. */}
      {mode !== "forgot" && providers.length ? (
        <>
          <div className="mt-7 space-y-2.5">
            {providers.map((p) => (
              <ProviderButton
                key={p}
                provider={p}
                busy={social === p}
                disabled={busy || social !== null}
                onClick={() => useProvider(p)}
              />
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-veil" />
            <span className="text-[11.5px] text-dusk">or use your email</span>
            <span className="h-px flex-1 bg-veil" />
          </div>
        </>
      ) : null}

      <form onSubmit={submit} className="mt-8 space-y-3.5">
        <label className="block">
          <span className="eyebrow mb-2 block">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dusk" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-2xl border border-veil bg-slate py-3.5 pl-11 pr-4 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
            />
          </div>
        </label>

        {mode !== "forgot" ? (
          <label className="block">
            <span className="eyebrow mb-2 block">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dusk" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-2xl border border-veil bg-slate py-3.5 pl-11 pr-4 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
              />
            </div>
          </label>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] font-medium text-alarm">
            {error}
          </p>
        ) : null}

        <Button full type="submit" disabled={busy} className="mt-2">
          {busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
          {busy ? null : <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      {mode === "signin" ? (
        <button
          onClick={() => { setMode("forgot"); setError(""); }}
          className="mt-4 text-center text-[13px] text-plasma-bright underline-offset-4 hover:underline"
        >
          Forgot your password?
        </button>
      ) : null}

      <p className="mt-6 text-center text-[13px] text-ash">
        {mode === "signup" ? "Already have an account?" : "No account yet?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
          }}
          className="font-semibold text-plasma-bright underline-offset-4 hover:underline"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>

      <p className="mt-auto pt-8 text-center text-[11.5px] leading-relaxed text-dusk">
        Ease keeps your health data private. We never sell it, and we never share it with advertisers.
      </p>
    </div>
  );
}

/**
 * Both marks follow the providers' own branding rules — Apple in black with
 * their glyph, Google on white with the four-colour G. Review checks this.
 */
function ProviderButton({
  provider,
  busy,
  disabled,
  onClick,
}: {
  provider: SocialProvider;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const apple = provider === "apple";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-semibold transition-colors disabled:opacity-50 ${
        apple ? "bg-pearl text-void hover:bg-white" : "border border-veil-strong bg-slate text-pearl hover:border-gloss"
      }`}
    >
      {busy ? (
        "One moment…"
      ) : (
        <>
          {apple ? <AppleMark /> : <GoogleMark />}
          Continue with {apple ? "Apple" : "Google"}
        </>
      )}
    </button>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[19px] w-[19px]" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="h-[18px] w-[18px]">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2.1 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.6 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3C2.8 17.1 2 20.4 2 24s.8 6.9 2.3 9.8l7.3-5.7z" />
      <path
        fill="#EA4335"
        d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z"
      />
    </svg>
  );
}
