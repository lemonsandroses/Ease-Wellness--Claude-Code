import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, Lock, MapPin, Plus } from "lucide-react";
import EventSheet from "@/components/EventSheet";
import GoogleConnect from "@/components/GoogleConnect";
import { Card, EmptyState, Eyebrow } from "@/components/ui";
import { PHASE_CONTENT } from "@/data/content";
import { computeCycleState, phaseForDay, PHASE_LABEL } from "@/lib/cycle";
import { addDays, daysBetween, fromKey, shortDate, toKey, today } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { CalendarItem, Phase } from "@/types";
import { usePremium } from "@/lib/premium";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const PHASE_DOT: Record<Phase, string> = {
  menstrual: "bg-tangerine",
  follicular: "bg-blue",
  ovulatory: "bg-[#7FA0BC]",
  luteal: "bg-[#E9A97C]",
};

function monthGrid(anchor: Date): (string | null)[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const daysInMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(anchor.getFullYear(), anchor.getMonth(), i + 1))),
  ];
}

export default function Calendar({ onUnlock }: { onUnlock: () => void }) {
  const { state, saveEvent, removeEvent } = useStore();
  const premium = usePremium();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<string>(today());
  const [editing, setEditing] = useState<CalendarItem | null>(null);
  const [creating, setCreating] = useState(false);

  const cycle = useMemo(() => computeCycleState(state.profile, state.logs), [state.profile, state.logs]);
  const grid = useMemo(() => monthGrid(anchor), [anchor]);

  const bleedDays = new Set(
    state.logs.filter((l) => ["light", "medium", "heavy"].includes(l.bleeding)).map((l) => l.date),
  );

  const predicted = new Set<string>();
  if (cycle.nextPeriodDate) {
    for (let i = 0; i < state.profile.periodLength; i++) predicted.add(addDays(cycle.nextPeriodDate, i));
  }

  const cycleLength = cycle.observedLength ?? state.profile.cycleLength;

  /** Phase for any date, projected forward and back from the cycle anchor. */
  const phaseFor = (key: string): Phase | null => {
    if (!cycle.known || !cycle.nextPeriodDate) return null;
    const anchorStart = addDays(cycle.nextPeriodDate, -cycleLength);
    const offset = daysBetween(anchorStart, key);
    if (offset < -cycleLength * 2 || offset > cycleLength * 2) return null;
    const day = ((offset % cycleLength) + cycleLength) % cycleLength || cycleLength;
    return phaseForDay(day, cycleLength, state.profile.periodLength);
  };

  const byDate = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    for (const e of state.events) (map[e.date] ??= []).push(e);
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
    }
    return map;
  }, [state.events]);

  const selectedItems = byDate[selected] ?? [];
  const selectedPhase = phaseFor(selected);

  const upcoming = useMemo(() => {
    const from = today();
    return state.events
      .filter((e) => e.date >= from && !e.done)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"))
      .slice(0, 5);
  }, [state.events]);

  const shift = (n: number) => setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + n, 1));

  const toggleDone = (item: CalendarItem) => saveEvent({ ...item, done: !item.done });

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
      <Eyebrow>Your month</Eyebrow>
      <h1 className="display mt-2 text-[36px] text-tangerine">Calendar</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-mist-500">
        Your plans and your cycle in one view, so you can put the demanding things where you'll have the energy.
      </p>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-semibold text-ink">
            {anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => shift(-1)}
              aria-label="Previous month"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-mist-200 bg-white text-mist-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => shift(1)}
              aria-label="Next month"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-mist-200 bg-white text-mist-600"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="text-[10px] font-semibold uppercase tracking-wider text-mist-400">
              {d}
            </span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {grid.map((key, i) => {
            if (!key) return <span key={`pad-${i}`} />;
            const isBleed = bleedDays.has(key);
            const isPredicted = predicted.has(key);
            const isSelected = key === selected;
            const isToday = key === today();
            const phase = phaseFor(key);
            const items = byDate[key] ?? [];

            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                aria-current={isSelected}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-[13.5px] transition-colors ${
                  isSelected
                    ? "bg-ink text-white"
                    : isBleed
                      ? "bg-tangerine font-semibold text-white"
                      : isPredicted
                        ? "border border-dashed border-tangerine text-tangerine"
                        : "text-mist-600 hover:bg-mist-100"
                } ${isToday && !isSelected ? "ring-1 ring-ink" : ""}`}
              >
                <span>{fromKey(key).getDate()}</span>
                <span className="flex h-1 items-center gap-0.5">
                  {phase && !isBleed && !isSelected ? (
                    <span className={`h-1 w-1 rounded-full ${PHASE_DOT[phase]} opacity-60`} />
                  ) : null}
                  {items.length ? (
                    <span className={`h-1 w-1 rounded-full ${isSelected || isBleed ? "bg-white" : "bg-ink"}`} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-mist-200 pt-4">
          <Legend swatch="bg-tangerine" label="Period" />
          <Legend swatch="border border-dashed border-tangerine" label="Predicted" />
          <Legend swatch="bg-ink" label="Has plans" />
        </div>
      </Card>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <div>
            <Eyebrow>{selected === today() ? "Today" : shortDate(selected)}</Eyebrow>
            {selectedPhase ? (
              <p className="mt-1 text-[13px] text-mist-500">
                {cycle.estimated ? "Likely " : ""}
                {PHASE_LABEL[selectedPhase]} — {PHASE_CONTENT[selectedPhase].move.split(". ")[0]}
              </p>
            ) : null}
          </div>
          <button
            onClick={() => (premium ? setCreating(true) : onUnlock())}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-white"
          >
            {premium ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} Add
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {selectedItems.length === 0 ? (
            <EmptyState
              title="Nothing planned"
              body={
                premium
                  ? "Add an event or a task for this day. Ease will show it next to where you are in your cycle."
                  : "Connect Google Calendar to see your real week here for free, or unlock premium to add your own events and tasks."
              }
            />
          ) : (
            selectedItems.map((item) => (
              <article key={item.id} className="card flex items-start gap-3 p-4">
                {item.kind === "task" ? (
                  <button
                    onClick={() => (premium ? toggleDone(item) : onUnlock())}
                    aria-label={item.done ? "Mark not done" : "Mark done"}
                    className="mt-0.5 shrink-0 text-tangerine"
                  >
                    {item.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5 text-mist-300" />}
                  </button>
                ) : (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tangerine" />
                )}

                <button
                  onClick={() => (premium ? setEditing(item) : onUnlock())}
                  className="flex-1 text-left"
                >
                  <span
                    className={`block text-[15px] font-semibold ${
                      item.done ? "text-mist-400 line-through" : "text-ink"
                    }`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mist-500">
                    {item.startTime ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.startTime}
                        {item.endTime ? `–${item.endTime}` : ""}
                      </span>
                    ) : null}
                    {item.location ? (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </span>
                    ) : null}
                    {item.googleId ? <span className="text-blue">Google</span> : null}
                  </span>
                  {item.notes ? <span className="mt-1 block text-[12.5px] text-mist-500">{item.notes}</span> : null}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <Eyebrow>Coming up</Eyebrow>
        <div className="mt-3 space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-mist-500">Nothing scheduled yet.</p>
          ) : (
            upcoming.map((item) => {
              const phase = phaseFor(item.date);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelected(item.date);
                    setAnchor(fromKey(item.date));
                  }}
                  className="card flex w-full items-center justify-between gap-3 p-3.5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-ink">{item.title}</span>
                    <span className="text-[12px] text-mist-500">
                      {shortDate(item.date)}
                      {item.startTime ? ` · ${item.startTime}` : ""}
                    </span>
                  </span>
                  {phase ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-mist-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${PHASE_DOT[phase]}`} />
                      {PHASE_LABEL[phase]}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </section>

      <GoogleConnect />

      <EventSheet
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        date={selected}
        existing={editing}
        onSave={(item) => {
          saveEvent(item);
          setCreating(false);
          setEditing(null);
        }}
        onDelete={
          editing
            ? () => {
                removeEvent(editing.id);
                setEditing(null);
              }
            : undefined
        }
      />
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[12px] text-mist-500">
      <span className={`h-3 w-3 rounded-[4px] ${swatch}`} />
      {label}
    </span>
  );
}
