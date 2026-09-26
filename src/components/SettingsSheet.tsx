import { useState } from "react";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import { FOCUS_OPTIONS } from "@/data/content";
import { useStore } from "@/lib/store";
import type { Pillar } from "@/types";

export default function SettingsSheet({
  open,
  onClose,
  onUpgrade,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
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

  return (
    <Sheet open={open} onClose={onClose} label="Settings">
      <h2 className="display text-[28px] text-tangerine">Your setup</h2>

      <div className="mt-6 space-y-6">
        <section>
          <Eyebrow>Name</Eyebrow>
          <input
            value={profile.name}
            onChange={(e) => saveProfile({ name: e.target.value })}
            className="mt-2 w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
          />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="eyebrow mb-2 block">Cycle length</span>
            <input
              type="number"
              min={20}
              max={60}
              value={profile.cycleLength}
              onChange={(e) => saveProfile({ cycleLength: Number(e.target.value) })}
              className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-2 block">Period length</span>
            <input
              type="number"
              min={1}
              max={14}
              value={profile.periodLength}
              onChange={(e) => saveProfile({ periodLength: Number(e.target.value) })}
              className="w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
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

        <section className="rounded-2xl bg-mist-100 px-4 py-3.5">
          <Eyebrow>Membership</Eyebrow>
          {profile.subscribed ? (
            <p className="mt-1 text-[13.5px] text-mist-600">
              Premium · {profile.plan === "annual" ? "Annual, ₹6,999" : "Monthly, ₹699"}
            </p>
          ) : (
            <>
              <p className="mt-1 text-[13.5px] leading-relaxed text-mist-600">
                You're on the free plan — tracking, calendar, nutrition and your cycle patterns.
              </p>
              <Button
                full
                onClick={() => {
                  onClose();
                  onUpgrade();
                }}
                className="mt-3"
              >
                See what's in premium
              </Button>
            </>
          )}
        </section>

        <section>
          <Eyebrow>Privacy</Eyebrow>
          <p className="mt-1.5 text-[13px] leading-relaxed text-mist-500">
            {state.session
              ? `Your logs sync privately to your account (${state.session.email}) so they survive a new phone. Only you can read them. Ease never sells your health data and never shares it with advertisers.`
              : "Your logs are on this device only. Make an account and they'll follow you to any phone. Ease never sells your health data and never shares it with advertisers."}
          </p>
          {state.session ? (
            <p className="mt-2 text-[12px] text-mist-400">
              {status === "synced"
                ? "All changes saved."
                : status === "loading"
                  ? "Syncing…"
                  : status === "offline"
                    ? "Offline — your changes are saved here and will sync when you reconnect."
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
          <div className="rounded-2xl border border-mist-200 p-4">
            <p className="text-[13.5px] leading-relaxed text-ink">
              {state.session
                ? "This closes your account and permanently deletes every log, meal, event and setting — here and on our servers. It can't be undone."
                : "Delete every log, meal and setting on this device? This can't be undone."}
            </p>

            {deleteError ? (
              <p role="alert" className="mt-3 text-[13px] font-medium text-[#B4321F]">
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
                      err instanceof Error ? err.message : "Could not delete your account. Please try again.",
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
