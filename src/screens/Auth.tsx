import { useState } from "react";
import { ArrowRight, Lock, Mail, MailCheck } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { useStore } from "@/lib/store";
import { supabase, isConfigured } from "@/lib/supabase";

type Mode = "signup" | "signin" | "forgot";

/** Supabase error messages are terse and sometimes leak internals — map them. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match.";
  if (m.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link.";
  if (m.includes("already registered")) return "That email already has an account. Try signing in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("password")) return "Password needs at least 8 characters.";
  return "Something went wrong. Try again in a moment.";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address");
      return;
    }
    if (mode !== "forgot" && password.length < 8) {
      setError("Password needs at least 8 characters");
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
          redirectTo: window.location.origin,
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
            emailRedirectTo: window.location.origin,
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
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tangerine-wash text-tangerine">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="display mt-5 text-[36px] text-tangerine">Check your inbox.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-mist-600">
          We sent a confirmation link to <span className="font-semibold text-ink">{sentTo}</span>. Tap it and your
          account is ready — your answers are saved and waiting.
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-mist-500">
          Nothing after a minute? Check spam, or go back and try a different address.
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
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tangerine-wash text-tangerine">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="display mt-5 text-[36px] text-tangerine">Reset link sent.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-mist-600">
          If an account exists for <span className="font-semibold text-ink">{email}</span>, there's a password reset
          link in that inbox now.
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
    mode === "signup" ? "Save your plan." : mode === "forgot" ? "Reset your password." : "Welcome back.";
  const blurb =
    mode === "signup"
      ? "Your answers are on this device right now. Make an account and they follow you to any phone."
      : mode === "forgot"
        ? "We'll email you a link to set a new one."
        : "Sign in to reach your cycle history and today's plan.";

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-10 pt-16">
      <Eyebrow>{mode === "signup" ? "Create your account" : mode === "forgot" ? "Password" : "Welcome back"}</Eyebrow>
      <h1 className="display mt-2 text-[38px] text-tangerine">{heading}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-mist-500">{blurb}</p>

      <form onSubmit={submit} className="mt-8 space-y-3.5">
        <label className="block">
          <span className="eyebrow mb-2 block">Email</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-2xl border border-mist-200 bg-white py-3.5 pl-11 pr-4 text-[15px] outline-none focus:border-tangerine"
            />
          </div>
        </label>

        {mode !== "forgot" ? (
          <label className="block">
            <span className="eyebrow mb-2 block">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-2xl border border-mist-200 bg-white py-3.5 pl-11 pr-4 text-[15px] outline-none focus:border-tangerine"
              />
            </div>
          </label>
        ) : null}

        {error ? (
          <p role="alert" className="text-[13px] font-medium text-[#B4321F]">
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
          className="mt-4 text-center text-[13px] text-blue underline-offset-4 hover:underline"
        >
          Forgot your password?
        </button>
      ) : null}

      <p className="mt-6 text-center text-[13px] text-mist-500">
        {mode === "signup" ? "Already have an account?" : "New to Ease?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError("");
          }}
          className="font-semibold text-blue underline-offset-4 hover:underline"
        >
          {mode === "signup" ? "Sign in" : "Create one"}
        </button>
      </p>

      <p className="mt-auto pt-8 text-center text-[11.5px] leading-relaxed text-mist-400">
        Ease keeps your health data private. We never sell it, and we never share it with advertisers.
      </p>
    </div>
  );
}
