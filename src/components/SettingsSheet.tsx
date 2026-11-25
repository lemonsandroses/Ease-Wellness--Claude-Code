import { useState } from "react";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import { FOCUS_OPTIONS } from "@/data/content";
import { useStore } from "@/lib/store";
import type { Pillar } from "@/types";

export default function SettingsSheet({
  open,
  onClose,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const { state, status, saveProfile, signOut, eraseEverything } = useStore();
  const { profile } = state;
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const toggleFocus = (id: Pillar) =>
    saveProfile({
      focus: profile.focus.includes(id) ? profile.focus.filter((f) => f !== id) : [...profile.focus, id],
    });

  // A number input reports "" while it is being cleared, and Number("") is 0.
  // Unclamped that reaches the cycle maths as a modulo by zero — "Day NaN" on
  // Home — and the row fails the database's own range check, so the write
  // retries forever. min/max on the element stop neither.
  const clamp = (raw: string, lo: number, hi: number, fallback: number) => {
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n > 0 ? Math.min(Math.max(n, lo), hi) : fallback;
  };

  return (
    <Sheet open={open} onClose={onClose} label="Settings">
      <h2 className="display text-[29px] text-pearl">Change your setup.</h2>

      <div className="mt-6 space-y-6">
        <section>
          <Eyebrow>Name</Eyebrow>
          <input
            value={profile.name}
            onChange={(e) => saveProfile({ name: e.target.value })}
            className="mt-2 w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
          />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow mb-2 block">Cycle length</span>
            <input
              type="number"
              min={15}
              max={90}
              value={profile.cycleLength}
              onChange={(e) => saveProfile({ cycleLength: clamp(e.target.value, 15, 90, 28) })}
              className="w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-2 block">Period length</span>
            <input
              type="number"
              min={1}
              max={15}
              value={profile.periodLength}
              onChange={(e) => saveProfile({ periodLength: clamp(e.target.value, 1, 15, 5) })}
              className="w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
            />
          </label>
        </section>

        <section>
          <Eyebrow>What you're focused on</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {FOCUS_OPTIONS.map((f) => (
              <Chip key={f.id} selected={profile.focus.includes(f.id)} onClick={() => toggleFocus(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </section>

        <section>
          <Eyebrow>Privacy</Eyebrow>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ash">
            {state.session
              ? `Your logs sync privately to your account (${state.session.email}) so they survive a new phone. Only you can read them. Ease never sells your health data and never shares it with advertisers.`
              : "Your logs are on this device only. Create an account to carry them to any phone you sign in on. Ease never sells your health data and never shares it with advertisers."}
          </p>
          {state.session ? (
            <p className="mt-2 text-[12px] text-dusk">
              {status === "synced"
                ? "All changes saved."
                : status === "loading"
                  ? "Syncing…"
                  : status === "offline"
                    ? "Offline. Changes are saved here and sync when you reconnect."
                    : "Saved on this device."}
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-8 space-y-2.5">
        <Button
          full
          variant="secondary"
          onClick={() => {
            signOut();
            onClose();
            onSignOut();
          }}
        >
          Sign out
        </Button>

        {confirmingReset ? (
          <div className="rounded-2xl border border-veil p-4">
            <p className="text-[13.5px] leading-relaxed text-pearl">
              {state.session
                ? "This closes your account and permanently deletes every log, meal, event and setting — here and on our servers. It can't be undone."
                : "Delete every log, meal and setting on this device? This can't be undone."}
            </p>

            {deleteError ? (
              <p role="alert" className="mt-3 text-[13px] font-medium text-alarm">
                {deleteError}
              </p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setConfirmingReset(false)}>
                Keep my account
              </Button>
              <Button
                disabled={erasing}
                onClick={async () => {
                  setErasing(true);
                  setDeleteError("");
                  try {
                    await eraseEverything();
                    onClose();
                    onSignOut();
                  } catch (err) {
                    // Never imply the data is gone when the server said otherwise.
                    setDeleteError(
                      err instanceof Error ? err.message : "Could not delete the account. Try again.",
                    );
                  } finally {
                    setErasing(false);
                  }
                }}
              >
                {erasing ? "Deleting…" : "Delete my account"}
              </Button>
            </div>
          </div>
        ) : (
          <Button full variant="ghost" onClick={() => setConfirmingReset(true)}>
            {state.session ? "Delete my account" : "Delete my data"}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
