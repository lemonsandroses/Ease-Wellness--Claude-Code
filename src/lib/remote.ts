import { supabase, supabaseAnonKey, supabaseUrl } from "./supabase";
import type { AppState, CalendarItem, DayLog, Meal, Profile } from "@/types";
import { emptyProfile } from "./defaults";

/** Rows come back snake_case from Postgres; the app speaks camelCase. */

function rowToProfile(r: Record<string, unknown>): Profile {
  return {
    name: (r.name as string) ?? "",
    birthDate: (r.birth_date as string) ?? undefined,
    cycleLength: (r.cycle_length as number) ?? 28,
    periodLength: (r.period_length as number) ?? 5,
    lastPeriodStart: (r.last_period_start as string) ?? undefined,
    focus: (r.focus as Profile["focus"]) ?? [],
    baselineSymptoms: (r.baseline_symptoms as Profile["baselineSymptoms"]) ?? [],
    energyRhythm: (r.energy_rhythm as string) ?? undefined,
    sleepTendency: (r.sleep_tendency as string) ?? undefined,
    movementStyle: (r.movement_style as string) ?? undefined,
    onboardedAt: (r.onboarded_at as string) ?? undefined,
    subscribed: false,
    plan: undefined,
  };
}

function profileToRow(p: Profile, userId: string) {
  return {
    id: userId,
    name: p.name,
    birth_date: p.birthDate || null,
    cycle_length: p.cycleLength,
    period_length: p.periodLength,
    last_period_start: p.lastPeriodStart || null,
    focus: p.focus,
    baseline_symptoms: p.baselineSymptoms,
    energy_rhythm: p.energyRhythm ?? null,
    sleep_tendency: p.sleepTendency ?? null,
    movement_style: p.movementStyle ?? null,
    onboarded_at: p.onboardedAt || null,
  };
}

function rowToLog(r: Record<string, unknown>): DayLog {
  return {
    date: r.date as string,
    bleeding: r.bleeding as DayLog["bleeding"],
    symptoms: (r.symptoms as DayLog["symptoms"]) ?? {},
    energy: (r.energy as number) ?? undefined,
    mood: (r.mood as string) ?? undefined,
    sleepHours: r.sleep_hours != null ? Number(r.sleep_hours) : undefined,
    sleepQuality: (r.sleep_quality as number) ?? undefined,
    stress: (r.stress as number) ?? undefined,
    water: (r.water as number) ?? undefined,
    movement: (r.movement as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    loggedAt: (r.logged_at as string) ?? new Date().toISOString(),
  };
}

function logToRow(l: DayLog, userId: string) {
  return {
    user_id: userId,
    date: l.date,
    bleeding: l.bleeding,
    symptoms: l.symptoms,
    energy: l.energy ?? null,
    mood: l.mood ?? null,
    sleep_hours: l.sleepHours ?? null,
    sleep_quality: l.sleepQuality ?? null,
    stress: l.stress ?? null,
    water: l.water ?? null,
    movement: l.movement ?? null,
    notes: l.notes ?? null,
    logged_at: l.loggedAt,
  };
}

function rowToMeal(r: Record<string, unknown>): Meal {
  return {
    id: r.id as string,
    date: r.date as string,
    name: r.name as string,
    slot: r.slot as Meal["slot"],
    calories: Number(r.calories ?? 0),
    protein: Number(r.protein ?? 0),
    carbs: Number(r.carbs ?? 0),
    fats: Number(r.fats ?? 0),
    fibre: Number(r.fibre ?? 0),
    nutrients: (r.nutrients as string[]) ?? [],
    note: (r.note as string) ?? undefined,
    loggedAt: (r.logged_at as string) ?? new Date().toISOString(),
  };
}

function mealToRow(m: Meal, userId: string) {
  return {
    id: m.id,
    user_id: userId,
    date: m.date,
    name: m.name,
    slot: m.slot,
    calories: Math.round(m.calories),
    protein: m.protein,
    carbs: m.carbs,
    fats: m.fats,
    fibre: m.fibre,
    nutrients: m.nutrients,
    note: m.note ?? null,
    logged_at: m.loggedAt,
  };
}

function rowToEvent(r: Record<string, unknown>): CalendarItem {
  return {
    id: r.id as string,
    kind: r.kind as CalendarItem["kind"],
    date: r.date as string,
    title: r.title as string,
    startTime: (r.start_time as string)?.slice(0, 5) || undefined,
    endTime: (r.end_time as string)?.slice(0, 5) || undefined,
    location: (r.location as string) ?? undefined,
    notes: (r.notes as string) ?? undefined,
    done: Boolean(r.done),
    googleId: (r.google_id as string) ?? undefined,
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

function eventToRow(e: CalendarItem, userId: string) {
  return {
    id: e.id,
    user_id: userId,
    kind: e.kind,
    date: e.date,
    title: e.title,
    start_time: e.startTime || null,
    end_time: e.endTime || null,
    location: e.location ?? null,
    notes: e.notes ?? null,
    done: e.done,
    google_id: e.googleId ?? null,
    created_at: e.createdAt,
  };
}

export async function pushEvent(e: CalendarItem, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("events").upsert(eventToRow(e, userId));
  if (error) throw error;
}

export async function deleteEvent(id: string, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("events").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/** Everything belonging to the signed-in user. */
export async function fetchAll(
  userId: string,
): Promise<Pick<AppState, "profile" | "logs" | "meals" | "events" | "achievements">> {
  if (!supabase) throw new Error("Supabase not configured");

  const [profileRes, logsRes, mealsRes, eventsRes, achRes, subRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("day_logs").select("*").eq("user_id", userId).order("date", { ascending: true }),
    supabase.from("meals").select("*").eq("user_id", userId).order("date", { ascending: false }),
    supabase.from("events").select("*").eq("user_id", userId).order("date", { ascending: true }),
    supabase.from("achievements").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  // Only the profile is load-bearing. If a secondary table is missing or errors
  // — a migration not yet run, a transient failure — degrade that slice to empty
  // rather than throwing, or one bad table blanks the user's whole account.
  if (profileRes.error) throw profileRes.error;
  for (const [name, res] of [
    ["day_logs", logsRes],
    ["meals", mealsRes],
    ["events", eventsRes],
    ["achievements", achRes],
  ] as const) {
    if (res.error) console.warn(`Could not load ${name}:`, res.error.message);
  }

  const profile = profileRes.data ? rowToProfile(profileRes.data) : { ...emptyProfile };

  // Entitlement is server-owned; the client can only read it.
  const sub = subRes.data as { plan?: Profile["plan"]; status?: string } | null;
  if (sub && (sub.status === "active" || sub.status === "trialing")) {
    profile.subscribed = true;
    profile.plan = sub.plan;
  }

  const achievements: Record<string, string> = {};
  for (const row of (achRes.data ?? []) as Record<string, string>[]) {
    achievements[row.achievement_id] = row.earned_at;
  }

  return {
    profile,
    logs: ((logsRes.data ?? []) as Record<string, unknown>[]).map(rowToLog),
    meals: ((mealsRes.data ?? []) as Record<string, unknown>[]).map(rowToMeal),
    events: ((eventsRes.data ?? []) as Record<string, unknown>[]).map(rowToEvent),
    achievements,
  };
}

export async function pushProfile(p: Profile, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("profiles").upsert(profileToRow(p, userId));
  if (error) throw error;
}

export async function pushLog(l: DayLog, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("day_logs").upsert(logToRow(l, userId), { onConflict: "user_id,date" });
  if (error) throw error;
}

export async function pushMeal(m: Meal, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("meals").upsert(mealToRow(m, userId));
  if (error) throw error;
}

export async function deleteMeal(id: string, userId: string) {
  if (!supabase) return;
  const { error } = await supabase.from("meals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

/**
 * Permanently close the account: every row, plus the auth user itself.
 * Runs in an Edge Function because deleting an auth user needs the service
 * role, which must never be shipped to the browser.
 */
export async function deleteAccount(): Promise<void> {
  if (!supabase) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("You're not signed in.");

  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
      },
    });
  } catch {
    // Network failure, or the function isn't deployed — don't surface the raw
    // browser error, and don't let the caller assume anything was deleted.
    throw new Error("Couldn't reach the server. Your account has not been deleted — please try again.");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Could not delete your account. Please try again.");
  }
}

export async function pushAchievement(id: string, earnedAt: string, userId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from("achievements")
    .upsert({ user_id: userId, achievement_id: id, earned_at: earnedAt }, { onConflict: "user_id,achievement_id" });
  if (error) throw error;
}
