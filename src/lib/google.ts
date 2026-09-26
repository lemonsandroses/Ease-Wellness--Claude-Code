import type { CalendarItem } from "@/types";

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

interface GoogleEvent {
  id: string;
  summary?: string;
  location?: string;
  description?: string;
  status?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

function splitDateTime(v?: { date?: string; dateTime?: string }): { date?: string; time?: string } {
  if (!v) return {};
  if (v.date) return { date: v.date };
  if (!v.dateTime) return {};
  const d = new Date(v.dateTime);
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/**
 * Read events from the user's primary Google calendar.
 * `accessToken` is the Google provider token from the Supabase session — it is
 * short-lived, so this is a manual import rather than a background sync.
 */
export async function fetchGoogleEvents(accessToken: string, fromISO: string, toISO: string): Promise<CalendarItem[]> {
  const params = new URLSearchParams({
    timeMin: fromISO,
    timeMax: toISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("Google access expired. Connect again to refresh it.");
  }
  if (!res.ok) throw new Error(`Google Calendar returned ${res.status}`);

  const body = (await res.json()) as { items?: GoogleEvent[] };

  return (body.items ?? [])
    .filter((e) => e.status !== "cancelled" && e.summary)
    .map((e) => {
      const start = splitDateTime(e.start);
      const end = splitDateTime(e.end);
      return {
        id: `g_${e.id}`,
        kind: "event" as const,
        date: start.date ?? "",
        title: e.summary ?? "Untitled",
        startTime: start.time,
        endTime: end.time,
        location: e.location,
        notes: e.description?.slice(0, 300),
        done: false,
        googleId: e.id,
        createdAt: new Date().toISOString(),
      };
    })
    .filter((e) => e.date);
}
