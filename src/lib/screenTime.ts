import { registerPlugin } from "@capacitor/core";
import { today } from "./date";

/**
 * Screen time, read from the device rather than typed in.
 *
 * What this can and cannot be, before anyone reads the numbers as exact:
 *
 * Apple does not let an app read the Screen Time totals you see in Settings.
 * `DeviceActivityReport` can render them, but its extension runs in a sandbox
 * that deliberately blocks every way of getting the values back out — no
 * network, no App Group, nothing. That is the documented intent, not a bug.
 *
 * The one channel that does escape is `DeviceActivityMonitor`, which fires a
 * callback each time usage crosses a threshold you registered in advance. So
 * we register a ladder of thresholds — 5, 10, 15 … minutes — and count how
 * many rungs were reached. The highest rung reached today is the estimate.
 *
 * Consequences worth stating plainly, because they shape the UI copy:
 *   • Resolution is one rung, not one minute.
 *   • There is no history. Counting starts the day it is switched on.
 *   • It covers the apps chosen in the system picker, not the whole device —
 *     Apple has no documented "everything" token.
 *   • It will not match Settings exactly, and should never be presented as if
 *     it does.
 *
 * Everything here stays on the phone. Screen time is never pushed to Supabase:
 * it is device-derived, meaningless on a second phone, and syncing it would
 * add a health-adjacent column for no benefit.
 */

/** Off until the native plugin and its extension target are in the build.
 *  Typed as boolean so narrowing doesn't make the other branch unreachable. */
export const SCREEN_TIME_ENABLED: boolean = false;

/** Minutes per rung of the threshold ladder. Also the error bar on every
 *  number this module returns. */
export const RUNG_MINUTES = 5;

export type ScreenTimeStatus =
  /** Web, or a build without the native plugin — the normal case today. */
  | "unsupported"
  /** Plugin present, permission never asked for. */
  | "unauthorized"
  /** Asked and refused. Don't ask again unprompted. */
  | "denied"
  /** Authorised, but no apps picked yet, so there is nothing to count. */
  | "needs-apps"
  | "ready";

export interface ScreenTimeDay {
  date: string;
  /** Approximate, to the nearest RUNG_MINUTES. */
  minutes: number;
}

interface ScreenTimePlugin {
  status(): Promise<{ status: ScreenTimeStatus; appCount: number }>;
  requestAuthorization(): Promise<{ status: ScreenTimeStatus }>;
  /** Presents Apple's FamilyActivityPicker. Returns how many were chosen. */
  chooseApps(): Promise<{ status: ScreenTimeStatus; appCount: number }>;
  /** Buckets the monitor extension wrote to the shared App Group. */
  read(): Promise<{ days: ScreenTimeDay[] }>;
}

const native = registerPlugin<ScreenTimePlugin>("ScreenTime");

const CACHE_KEY = "ease.screenTime.v1";

/**
 * A call into a plugin that isn't in the build rejects rather than returning
 * anything useful, and on the web every call does. Treat that as "unsupported"
 * instead of letting it surface as an error the user can do nothing about.
 */
async function call<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function status(): Promise<ScreenTimeStatus> {
  if (!SCREEN_TIME_ENABLED) return "unsupported";
  const r = await call(() => native.status(), { status: "unsupported" as ScreenTimeStatus, appCount: 0 });
  return r.status;
}

export async function requestAuthorization(): Promise<ScreenTimeStatus> {
  if (!SCREEN_TIME_ENABLED) return "unsupported";
  const r = await call(() => native.requestAuthorization(), { status: "unsupported" as ScreenTimeStatus });
  return r.status;
}

export async function chooseApps(): Promise<ScreenTimeStatus> {
  if (!SCREEN_TIME_ENABLED) return "unsupported";
  const r = await call(() => native.chooseApps(), { status: "unsupported" as ScreenTimeStatus, appCount: 0 });
  return r.status;
}

/** Everything cached on this device, oldest first. */
export function cached(): ScreenTimeDay[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((d): d is ScreenTimeDay => {
        const o = d as Partial<ScreenTimeDay> | null;
        return !!o && typeof o.date === "string" && typeof o.minutes === "number" && Number.isFinite(o.minutes);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

/**
 * Pull whatever the extension has recorded and fold it into the cache.
 *
 * The extension only ever knows about days it was running for, and the system
 * can drop its state, so a day already cached is never lowered by a later
 * read — only raised. A day that silently fell back to a smaller number would
 * show up in Patterns as a drop in screen time that never happened.
 */
export async function refresh(): Promise<ScreenTimeDay[]> {
  if (!SCREEN_TIME_ENABLED) return cached();
  const { days } = await call(() => native.read(), { days: [] as ScreenTimeDay[] });
  if (!days.length) return cached();

  const merged = new Map(cached().map((d) => [d.date, d.minutes]));
  for (const d of days) {
    if (!d || typeof d.date !== "string") continue;
    const minutes = Math.max(0, Math.round(d.minutes));
    merged.set(d.date, Math.max(merged.get(d.date) ?? 0, minutes));
  }

  // One year is plenty for the charts and keeps the key small.
  const cutoff = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const out = [...merged.entries()]
    .filter(([date]) => date >= cutoff)
    .map(([date, minutes]) => ({ date, minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(out));
  } catch {
    // Storage full or blocked — the numbers are re-readable from the
    // extension next launch, so losing the cache is not worth an error.
  }
  return out;
}

export function minutesOn(days: ScreenTimeDay[], date: string): number | undefined {
  return days.find((d) => d.date === date)?.minutes;
}

export function todayMinutes(days: ScreenTimeDay[]): number | undefined {
  return minutesOn(days, today());
}

/** "3h 25m", or "45m" below an hour. Never bare minutes above 60 — nobody
 *  reads 205 as three and a half hours. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* nothing to do */
  }
}
