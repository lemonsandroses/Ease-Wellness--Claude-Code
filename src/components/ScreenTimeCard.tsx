import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, Card, Eyebrow } from "@/components/ui";
import { SYMPTOM_LABEL } from "@/data/content";
import { lastNDays, shortDate } from "@/lib/date";
import {
  cached,
  chooseApps,
  formatMinutes,
  refresh,
  requestAuthorization,
  RUNG_MINUTES,
  SCREEN_TIME_ENABLED,
  status as readStatus,
  type ScreenTimeDay,
  type ScreenTimeStatus,
} from "@/lib/screenTime";
import type { DayLog, SymptomId } from "@/types";

const PLASMA = "#7B4DFF";

/**
 * Screen time beside the symptoms, read from the device.
 *
 * The number is an estimate by construction — see lib/screenTime for why Apple
 * leaves no exact route — so every surface here says "about". A health app
 * that presents an approximation as a measurement teaches people to trust the
 * wrong thing.
 */
export default function ScreenTimeCard({ logs }: { logs: DayLog[] }) {
  const [state, setState] = useState<ScreenTimeStatus>("unsupported");
  const [days, setDays] = useState<ScreenTimeDay[]>(cached());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const s = await readStatus();
      if (!alive) return;
      setState(s);
      if (s === "ready") setDays(await refresh());
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Nothing to say on a build without the native side, and nothing the user
  // could do about it either. Stay off the screen entirely.
  if (!SCREEN_TIME_ENABLED || state === "unsupported") return null;

  const enable = async () => {
    setBusy(true);
    try {
      let s = await requestAuthorization();
      if (s === "needs-apps" || s === "ready") s = await chooseApps();
      setState(s);
      if (s === "ready") setDays(await refresh());
    } finally {
      setBusy(false);
    }
  };

  if (state !== "ready") {
    return (
      <Card>
        <Eyebrow>Screen time</Eyebrow>
        <h3 className="mt-1 text-[17px] font-semibold text-pearl">Count it automatically</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ash">
          {state === "denied"
            ? "Screen Time access is off. Turn it back on in Settings → Screen Time, then come back here."
            : "Grant access once and pick which apps to count. Ease then records your daily total on its own — nothing to type in."}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-dusk">
          Counting starts today; Apple gives apps no access to past screen time. The total stays on this phone.
        </p>
        {state !== "denied" ? (
          <Button full onClick={enable} className="mt-4" disabled={busy}>
            {busy ? "One moment…" : "Turn on screen time"}
          </Button>
        ) : null}
      </Card>
    );
  }

  return <ScreenTimeChart days={days} logs={logs} />;
}

function ScreenTimeChart({ days, logs }: { days: ScreenTimeDay[]; logs: DayLog[] }) {
  const window = lastNDays(14);
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d.minutes])), [days]);

  const data = window.map((d) => ({ date: d, label: shortDate(d).slice(0, 6), minutes: byDate.get(d) ?? 0 }));
  const recorded = data.filter((d) => byDate.has(d.date));
  const average = recorded.length ? Math.round(recorded.reduce((s, d) => s + d.minutes, 0) / recorded.length) : 0;

  const link = useMemo(() => strongestLink(days, logs), [days, logs]);

  if (recorded.length < 3) {
    return (
      <Card>
        <Eyebrow>Screen time</Eyebrow>
        <h3 className="mt-1 text-[17px] font-semibold text-pearl">Counting</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-ash">
          Ease has {recorded.length === 1 ? "one day" : `${recorded.length} days`} so far. Three days in, the chart
          opens here.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Screen time</Eyebrow>
      <h3 className="mt-1 text-[17px] font-semibold text-pearl">About {formatMinutes(average)} a day</h3>
      <div className="mt-4 h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="#241A3C" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#8C80A8", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#8C80A8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 60)}h`}
            />
            <Tooltip
              contentStyle={{ background: "#140E22", border: "1px solid #38294F", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#C8BDD8" }}
              formatter={(v) => [`about ${formatMinutes(Number(v))}`, "Screen time"] as [string, string]}
            />
            <Bar dataKey="minutes" fill={PLASMA} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {link ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-silk">
          On days you logged <span className="font-semibold text-pearl">{SYMPTOM_LABEL[link.symptom]}</span>, screen
          time averaged <span className="font-semibold text-pearl">{formatMinutes(Math.abs(link.delta))}</span>{" "}
          {link.delta > 0 ? "more" : "less"} than on days you didn't.
        </p>
      ) : null}

      <p className="mt-2 text-[11.5px] leading-relaxed text-dusk">
        Estimated to the nearest {RUNG_MINUTES} minutes, across the apps you chose. It won't match Settings exactly.
        Stays on this phone.
      </p>
    </Card>
  );
}

/**
 * The symptom whose presence shifts screen time most.
 *
 * Reported as an observation, never as a cause — the arrow could point either
 * way, and on this much data usually neither. Both sides need four days, and
 * the gap must clear half an hour, which is well above the measurement's own
 * error bar. Below that it is noise with a sentence wrapped around it.
 */
function strongestLink(
  days: ScreenTimeDay[],
  logs: DayLog[],
): { symptom: SymptomId; delta: number } | null {
  const byDate = new Map(days.map((d) => [d.date, d.minutes]));
  const usable = logs.filter((l) => byDate.has(l.date));
  if (usable.length < 8) return null;

  let best: { symptom: SymptomId; delta: number } | null = null;

  const symptoms = new Set<SymptomId>();
  for (const l of usable) for (const id of Object.keys(l.symptoms)) symptoms.add(id as SymptomId);

  for (const symptom of symptoms) {
    const withIt: number[] = [];
    const without: number[] = [];
    for (const l of usable) {
      const minutes = byDate.get(l.date) ?? 0;
      ((l.symptoms[symptom] ?? 0) > 0 ? withIt : without).push(minutes);
    }
    if (withIt.length < 4 || without.length < 4) continue;

    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    const delta = Math.round(mean(withIt) - mean(without));
    if (Math.abs(delta) < 30) continue;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { symptom, delta };
  }

  return best;
}
