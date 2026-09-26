import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import type { CalendarItem } from "@/types";

export default function EventSheet({
  open,
  onClose,
  date,
  existing,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  existing: CalendarItem | null;
  onSave: (item: CalendarItem) => void;
  onDelete?: () => void;
}) {
  const [kind, setKind] = useState<CalendarItem["kind"]>("event");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  // Load the item being edited, or reset to a blank form for a new one.
  useEffect(() => {
    if (!open) return;
    setKind(existing?.kind ?? "event");
    setTitle(existing?.title ?? "");
    setStartTime(existing?.startTime ?? "");
    setEndTime(existing?.endTime ?? "");
    setLocation(existing?.location ?? "");
    setNotes(existing?.notes ?? "");
    setError("");
  }, [open, existing]);

  const save = () => {
    if (!title.trim()) {
      setError("Give it a name first");
      return;
    }
    if (startTime && endTime && endTime < startTime) {
      setError("The end time is before the start time");
      return;
    }
    onSave({
      id: existing?.id ?? `evt_${Date.now()}`,
      kind,
      date: existing?.date ?? date,
      title: title.trim(),
      startTime: kind === "task" ? undefined : startTime || undefined,
      endTime: kind === "task" ? undefined : endTime || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      done: existing?.done ?? false,
      googleId: existing?.googleId,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <Sheet open={open} onClose={onClose} label={existing ? "Edit" : "Add to your day"}>
      <h2 className="display text-[28px] text-tangerine">{existing ? "Edit this" : "What's happening?"}</h2>

      {existing?.googleId ? (
        <p className="mt-2 rounded-xl bg-blue-wash px-3.5 py-2.5 text-[12.5px] leading-relaxed text-blue">
          This came from Google Calendar. Edits here stay in Ease — they won't be written back to Google.
        </p>
      ) : null}

      <div className="mt-6 space-y-5">
        <section>
          <Eyebrow>Type</Eyebrow>
          <div className="mt-2 flex gap-2">
            <Chip selected={kind === "event"} onClick={() => setKind("event")}>
              Event
            </Chip>
            <Chip selected={kind === "task"} onClick={() => setKind("task")}>
              Task
            </Chip>
          </div>
        </section>

        <section>
          <Eyebrow>Name</Eyebrow>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={kind === "task" ? "Book the blood test" : "Shoot with the brand team"}
            className="mt-2 w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
          />
        </section>

        {kind === "event" ? (
          <section className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="eyebrow mb-2 block">Starts</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
              />
            </label>
            <label className="block">
              <span className="eyebrow mb-2 block">Ends</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
              />
            </label>
          </section>
        ) : null}

        <section>
          <Eyebrow>Where (optional)</Eyebrow>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Studio, clinic, home"
            className="mt-2 w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
          />
        </section>

        <section>
          <Eyebrow>Notes (optional)</Eyebrow>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-none rounded-2xl border border-mist-200 bg-white px-4 py-3 text-[14px] outline-none focus:border-tangerine"
          />
        </section>

        {error ? (
          <p role="alert" className="text-[13px] font-medium text-[#B4321F]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-7 space-y-2.5">
        <Button full onClick={save}>
          {existing ? "Save changes" : "Add it"}
        </Button>
        {onDelete ? (
          <Button full variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        ) : null}
      </div>
    </Sheet>
  );
}
