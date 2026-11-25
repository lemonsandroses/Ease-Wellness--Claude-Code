import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, CalendarItem, DayLog, Meal, Profile } from "@/types";
import { emptyProfile, emptyState } from "./defaults";
import { supabase, isConfigured } from "./supabase";
import * as remote from "./remote";
import { today } from "./date";
import { qualifyingAchievements } from "./progress";
import { signOutProviders } from "./socialAuth";

const KEY = "ease.state.v1";

export { emptyProfile };

export type SyncStatus = "local" | "loading" | "synced" | "offline";

/** A write that hasn't reached the server yet. Replayed when we reconnect. */
type Pending =
  | { kind: "profile" }
  | { kind: "log"; date: string }
  | { kind: "meal"; id: string }
  | { kind: "meal-delete"; id: string }
  | { kind: "event"; id: string }
  | { kind: "event-delete"; id: string }
  | { kind: "achievement"; id: string };

/**
 * True when retrying is pointless: the server understood the request and
 * refused it. Postgres answers with a SQLSTATE — class 22 is bad data, class 23
 * a constraint violation, 42501 a row-level-security refusal — and all of those
 * will fail identically forever. A dropped connection or a 5xx carries no such
 * code, and those are worth retrying.
 */
function permanent(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" && (/^(22|23)/.test(code) || code === "42501");
}

function read(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState;
    const saved = JSON.parse(raw) as Partial<AppState>;
    // The profile is merged field by field, not swapped wholesale: a cache
    // written by an older build is missing anything added since, and code that
    // reads e.g. profile.focus.length would throw on an existing install.
    return { ...emptyState, ...saved, profile: { ...emptyProfile, ...saved.profile } };
  } catch {
    return emptyState;
  }
}

function write(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota — the session still works, it just won't persist.
  }
}

interface Store {
  state: AppState;
  status: SyncStatus;
  /** False only until the first session check settles — gates the splash loader. */
  ready: boolean;
  saveProfile: (patch: Partial<Profile>) => void;
  saveLog: (log: DayLog) => void;
  addMeal: (meal: Meal) => void;
  removeMeal: (id: string) => void;
  saveEvent: (event: CalendarItem) => void;
  removeEvent: (id: string) => void;
  grant: (id: string) => void;
  signOut: () => Promise<void>;
  eraseEverything: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(read);
  const [status, setStatus] = useState<SyncStatus>(isConfigured ? "loading" : "local");
  const [ready, setReady] = useState(!isConfigured);
  const userId = useRef<string | null>(null);
  const pending = useRef<Pending[]>([]);
  const flushing = useRef(false);
  /** Consecutive failed flushes — drives the retry backoff. */
  const attempt = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(state);

  latest.current = state;

  useEffect(() => write(state), [state]);

  /** Replay queued writes. Anything still failing stays queued for next time. */
  const flush = useCallback(async () => {
    const uid = userId.current;
    if (!uid || flushing.current || !pending.current.length) return;

    flushing.current = true;
    const queue = pending.current;
    pending.current = [];
    const failed: Pending[] = [];

    for (const op of queue) {
      try {
        const s = latest.current;
        if (op.kind === "profile") await remote.pushProfile(s.profile, uid);
        if (op.kind === "log") {
          const log = s.logs.find((l) => l.date === op.date);
          if (log) await remote.pushLog(log, uid);
        }
        if (op.kind === "meal") {
          const meal = s.meals.find((m) => m.id === op.id);
          if (meal) await remote.pushMeal(meal, uid);
        }
        if (op.kind === "meal-delete") await remote.deleteMeal(op.id, uid);
        if (op.kind === "event") {
          const event = s.events.find((e) => e.id === op.id);
          if (event) await remote.pushEvent(event, uid);
        }
        if (op.kind === "event-delete") await remote.deleteEvent(op.id, uid);
        if (op.kind === "achievement") {
          await remote.pushAchievement(op.id, s.achievements[op.id] ?? today(), uid);
        }
      } catch (err) {
        if (permanent(err)) {
          // The row will be rejected identically every time, so requeueing it
          // would hold the whole queue at the back-off ceiling forever and keep
          // every later write from ever landing. Drop it and say so — the data
          // is still on the device, it just won't reach the server as-is.
          console.error(`Dropping a ${op.kind} write the server will never accept`, err);
        } else {
          failed.push(op);
        }
      }
    }

    pending.current = [...failed, ...pending.current];
    flushing.current = false;
    setStatus(pending.current.length ? "offline" : "synced");

    if (!failed.length) {
      attempt.current = 0;
      // Anything enqueued while this run was in flight still needs sending.
      if (pending.current.length) void flush();
      return;
    }

    // Something rejected the write — a rate limit, a 5xx, a dropped connection
    // during a busy spell. Retrying only on the next "online" event or the
    // user's next edit could strand a day's logging for hours, so back off and
    // come back: ~2s, 4s, 8s … capped at a minute.
    //
    // The jitter matters more than the delay. Without it every phone that hit
    // the same blip retries on the same schedule for the rest of the session,
    // which is how a brief wobble turns into a repeating self-inflicted spike.
    const wait = Math.min(2000 * 2 ** attempt.current, 60_000);
    attempt.current += 1;
    clearTimeout(retryTimer.current);
    retryTimer.current = setTimeout(() => void flush(), wait * (0.5 + Math.random()));
  }, []);

  const enqueue = useCallback(
    (op: Pending) => {
      if (!userId.current) return;
      // Collapse duplicates so a day edited five times pushes once.
      pending.current = pending.current.filter(
        (p) => !(p.kind === op.kind && JSON.stringify(p) === JSON.stringify(op)),
      );
      pending.current.push(op);
      void flush();
    },
    [flush],
  );

  /**
   * Pull everything from the server and adopt it as truth — except when this is
   * a brand-new account. Onboarding happens before sign-up, so the local profile
   * holds answers the server row (created blank by a trigger) does not. Adopting
   * the server copy there would silently erase the user's calibration.
   */
  const hydrate = useCallback(
    async (uid: string) => {
      setStatus("loading");
      try {
        const data = await remote.fetchAll(uid);
        const local = latest.current;
        const serverIsBlank = !data.profile.onboardedAt;
        const localHasOnboarding = Boolean(local.profile.onboardedAt);

        if (serverIsBlank && localHasOnboarding) {
          const merged: Profile = { ...local.profile, subscribed: data.profile.subscribed, plan: data.profile.plan };
          setState((s) => ({ ...s, ...data, profile: merged }));
          // First sync of a new account: push everything gathered before sign-up.
          enqueue({ kind: "profile" });
          for (const log of local.logs) enqueue({ kind: "log", date: log.date });
          for (const meal of local.meals) enqueue({ kind: "meal", id: meal.id });
          for (const event of local.events) enqueue({ kind: "event", id: event.id });
        } else {
          setState((s) => ({ ...s, ...data }));
          setStatus("synced");
        }
      } catch (err) {
        console.error("Could not load your data from the server", err);
        setStatus("offline");
      } finally {
        setReady(true);
      }
    },
    [enqueue],
  );

  // Track the Supabase session and hydrate whenever it changes.
  useEffect(() => {
    if (!supabase) return;

    // Nothing the server does may keep someone out of their own app. If the
    // session check hasn't settled in five seconds — a slow network, a busy
    // hour, an outage — open on the cached data and let the sync catch up.
    const openAnyway = setTimeout(() => setReady(true), 5000);

    // onAuthStateChange fires INITIAL_SESSION on subscribe, so this is the only
    // place the session is read. Calling getSession() as well would hydrate
    // every account twice on every launch — double the reads, for nothing.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      userId.current = session?.user.id ?? null;
      setState((s) => ({ ...s, session: session ? { email: session.user.email ?? "", id: session.user.id } : null }));

      // A token refresh is not a new sign-in; re-pulling every table on each
      // one would multiply load for no new data.
      if (session && event !== "TOKEN_REFRESHED") {
        void hydrate(session.user.id);
      } else if (session) {
        void flush();
      } else {
        setStatus("local");
        setReady(true);
      }
    });

    return () => {
      clearTimeout(openAnyway);
      sub.subscription.unsubscribe();
    };
  }, [hydrate, flush]);

  /**
   * Retry queued writes when conditions plainly changed.
   *
   * Both events reset the backoff, because a phone that has just regained
   * signal or come back to the foreground shouldn't sit out the rest of a
   * minute-long wait it earned while it was away. `visibilitychange` carries
   * most of this on mobile — a backgrounded app gets frozen, not an "offline".
   */
  useEffect(() => {
    const retryNow = () => {
      attempt.current = 0;
      clearTimeout(retryTimer.current);
      void flush();
    };
    const onVisible = () => {
      if (!document.hidden) retryNow();
    };
    window.addEventListener("online", retryNow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", retryNow);
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(retryTimer.current);
    };
  }, [flush]);

  /**
   * Stamp the date each badge was first earned.
   *
   * Qualification is recomputed from the raw logs on every render, so without
   * this the moment is never recorded: every badge reads a bare "Earned", and
   * the achievements table stays empty. Runs here rather than on the Patterns
   * screen so a badge earned while logging on Home is still dated correctly.
   */
  useEffect(() => {
    const missing = [...qualifyingAchievements(state)].filter((id) => !state.achievements[id]);
    if (!missing.length) return;
    const stamp = today();
    setState((s) => {
      const achievements = { ...s.achievements };
      for (const id of missing) achievements[id] ??= stamp;
      return { ...s, achievements };
    });
    for (const id of missing) enqueue({ kind: "achievement", id });
  }, [state, enqueue]);

  const saveProfile = useCallback(
    (patch: Partial<Profile>) => {
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
      enqueue({ kind: "profile" });
    },
    [enqueue],
  );

  const saveLog = useCallback(
    (log: DayLog) => {
      setState((s) => ({
        ...s,
        logs: [...s.logs.filter((l) => l.date !== log.date), log].sort((a, b) => a.date.localeCompare(b.date)),
      }));
      enqueue({ kind: "log", date: log.date });
    },
    [enqueue],
  );

  const addMeal = useCallback(
    (meal: Meal) => {
      setState((s) => ({ ...s, meals: [meal, ...s.meals] }));
      enqueue({ kind: "meal", id: meal.id });
    },
    [enqueue],
  );

  const removeMeal = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) }));
      enqueue({ kind: "meal-delete", id });
    },
    [enqueue],
  );

  const saveEvent = useCallback(
    (event: CalendarItem) => {
      setState((s) => ({
        ...s,
        events: [...s.events.filter((e) => e.id !== event.id), event].sort(
          (a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? ""),
        ),
      }));
      enqueue({ kind: "event", id: event.id });
    },
    [enqueue],
  );

  const removeEvent = useCallback(
    (id: string) => {
      setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
      enqueue({ kind: "event-delete", id });
    },
    [enqueue],
  );

  const grant = useCallback(
    (id: string) => {
      setState((s) => (s.achievements[id] ? s : { ...s, achievements: { ...s.achievements, [id]: today() } }));
      enqueue({ kind: "achievement", id });
    },
    [enqueue],
  );

  const signOut = useCallback(async () => {
    // Clear the Google/Apple session too, or the next sign-in silently reuses
    // the same account with no picker — surprising on a shared phone.
    await signOutProviders().catch(() => {});
    await supabase?.auth.signOut();
    userId.current = null;
    pending.current = [];
    // Clear the cache on sign-out: this is health data on a possibly shared device.
    localStorage.removeItem(KEY);
    setState(emptyState);
    setStatus("local");
  }, []);

  /**
   * Close the account for good: server rows, the auth user, and this device's
   * cache. Throws if the server side fails, so the UI can say so rather than
   * pretending the data is gone.
   */
  const eraseEverything = useCallback(async () => {
    if (userId.current) await remote.deleteAccount();
    pending.current = [];
    await signOutProviders().catch(() => {});
    await supabase?.auth.signOut();
    userId.current = null;
    localStorage.removeItem(KEY);
    setState(emptyState);
    setStatus("local");
  }, []);

  const value = useMemo(
    () => ({ state, status, ready, saveProfile, saveLog, addMeal, removeMeal, saveEvent, removeEvent, grant, signOut, eraseEverything }),
    [state, status, ready, saveProfile, saveLog, addMeal, removeMeal, saveEvent, removeEvent, grant, signOut, eraseEverything],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
