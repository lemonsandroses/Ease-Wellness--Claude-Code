import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Images, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import { useStore } from "@/lib/store";
import { today } from "@/lib/date";
import { glide } from "@/lib/motion";
// Aliased: this file already has a local dropPhoto that clears the preview.
import { dropPhoto as dropPendingPhoto, putPhoto } from "@/lib/photoStore";
import {
  capturePhoto,
  CaptureCancelled,
  CapturePermissionDenied,
  uploadMealPhoto,
  type CapturedPhoto,
  type PhotoSource,
} from "@/lib/mealPhoto";
import { estimateMealFromPhoto, estimateToMeal, MEAL_AI_ENABLED, type MealEstimate } from "@/lib/mealAi";
import type { Meal } from "@/types";

const SLOTS: Meal["slot"][] = ["breakfast", "lunch", "dinner", "snack"];

/** Rough starting points so logging a meal takes seconds, not a nutrition label. */
const PRESETS: { name: string; protein: number; carbs: number; fats: number; fibre: number; calories: number }[] = [
  { name: "Eggs and vegetables", protein: 22, carbs: 8, fats: 16, fibre: 4, calories: 270 },
  { name: "Dal, rice and salad", protein: 18, carbs: 55, fats: 9, fibre: 11, calories: 390 },
  { name: "Paneer or tofu bowl", protein: 26, carbs: 30, fats: 18, fibre: 7, calories: 410 },
  { name: "Chicken and greens", protein: 35, carbs: 14, fats: 12, fibre: 6, calories: 330 },
  { name: "Yoghurt, seeds and berries", protein: 15, carbs: 22, fats: 10, fibre: 6, calories: 250 },
  { name: "Snack", protein: 6, carbs: 18, fats: 8, fibre: 2, calories: 170 },
];

/** The macro fields, as the editable grid renders them. */
const FIELDS = [
  { key: "calories", label: "Calories", unit: "kcal", step: 10 },
  { key: "protein", label: "Protein", unit: "g", step: 1 },
  { key: "carbs", label: "Carbs", unit: "g", step: 1 },
  { key: "fats", label: "Fats", unit: "g", step: 1 },
  { key: "fibre", label: "Fibre", unit: "g", step: 1 },
] as const;

type Macros = Pick<Meal, "calories" | "protein" | "carbs" | "fats" | "fibre">;

/** Marks an error as belonging to the photo controls rather than to saving,
 *  so each one renders beside the thing that produced it. */
const PHOTO_ERROR_PREFIX = "photo:";

export default function MealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, addMeal } = useStore();
  const [slot, setSlot] = useState<Meal["slot"]>("lunch");
  const [name, setName] = useState("");
  const [macros, setMacros] = useState<Macros>(PRESETS[0]);
  const [presetName, setPresetName] = useState(PRESETS[0].name);
  const [nutrients, setNutrients] = useState<string[]>([]);
  const [source, setSource] = useState<Meal["source"]>("manual");

  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [estimate, setEstimate] = useState<MealEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Object URLs are a manual allocation: without revoking them the blob stays
  // alive for the life of the document, and logging meals all day leaks every
  // photo taken.
  const photoRef = useRef<CapturedPhoto | null>(null);
  photoRef.current = photo;
  useEffect(
    () => () => {
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
    },
    [],
  );

  const reset = useCallback(() => {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
    setPhoto(null);
    setEstimate(null);
    setEstimating(false);
    setBusy(false);
    setError("");
    setNotice("");
    setName("");
    setNutrients([]);
    setSource("manual");
    setMacros(PRESETS[0]);
    setPresetName(PRESETS[0].name);
    setSlot("lunch");
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  const runEstimate = useCallback(async (blob: Blob) => {
    setEstimating(true);
    setError("");
    try {
      const e = await estimateMealFromPhoto(blob);
      setEstimate(e);
      const mapped = estimateToMeal(e);
      setMacros(mapped);
      setName(mapped.name);
      setNutrients(mapped.nutrients);
      setSource("ai");
    } catch {
      // A failed estimate must not cost the photo or the log. Fall through to
      // the preset picker and say so once.
      setNotice("Couldn't read that photo. Pick the closest match instead.");
      setSource("manual");
    } finally {
      setEstimating(false);
    }
  }, []);

  const pickPhoto = async (src: PhotoSource) => {
    setError("");
    setNotice("");
    try {
      const captured = await capturePhoto(src);
      if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
      setPhoto(captured);
      setEstimate(null);
      if (MEAL_AI_ENABLED) await runEstimate(captured.blob);
    } catch (err) {
      if (err instanceof CaptureCancelled) return; // Backing out is not an error.
      if (err instanceof CapturePermissionDenied) {
        setError(
          PHOTO_ERROR_PREFIX +
            (src === "camera"
              ? "Ease doesn't have camera access. Turn it on in Settings › Ease › Camera."
              : "Ease doesn't have photo access. Turn it on in Settings › Ease › Photos."),
        );
        return;
      }
      // Anything else: show what actually went wrong. A generic message here
      // was how a permission failure managed to look like a dead button.
      const detail = err instanceof Error && err.message ? err.message : "Unknown error";
      setError(`${PHOTO_ERROR_PREFIX}Couldn't get that photo — ${detail}`);
    }
  };

  const dropPhoto = () => {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current.previewUrl);
    setPhoto(null);
    setEstimate(null);
    setNotice("");
    setSource("manual");
  };

  const applyPreset = (p: (typeof PRESETS)[number]) => {
    setPresetName(p.name);
    setMacros({ calories: p.calories, protein: p.protein, carbs: p.carbs, fats: p.fats, fibre: p.fibre });
    setSource("manual");
    setEstimate(null);
  };

  const save = async () => {
    const finalName = name.trim() || estimate?.name || presetName;
    if (!finalName) {
      setError("Enter a name for the meal.");
      return;
    }
    setError("");
    setBusy(true);

    const id = `meal_${Date.now()}`;
    let photoPath: string | undefined;

    // The photo is a nice-to-have; the log is the point. If the upload fails —
    // offline, storage not provisioned, bucket missing — the meal is still
    // saved rather than losing the entry that was just typed.
    //
    // Either way the blob is kept on the device first. Without an account there
    // is nowhere to upload it to, and the previous behaviour was to drop it
    // silently on save: the preview appeared, Save was tapped, and the photo
    // was simply gone — while the sheet said "this one stays on the device".
    // Now that sentence is true, and uploadPendingPhotos sends it the first
    // time a session exists.
    if (photo) {
      await putPhoto(id, photo.blob);
      if (state.session) {
        try {
          photoPath = await uploadMealPhoto(photo.blob, state.session.id, id);
          await dropPendingPhoto(id); // Uploaded — no need to hold a second copy.
        } catch {
          setNotice("Meal saved. The photo is on this device and will upload later.");
        }
      }
    }

    addMeal({
      id,
      date: today(),
      name: finalName,
      slot,
      ...macros,
      nutrients,
      photoPath,
      source,
      loggedAt: new Date().toISOString(),
    });

    setBusy(false);
    close();
  };

  const setField = (key: keyof Macros, value: string) => {
    const n = Number(value);
    setMacros((m) => ({ ...m, [key]: Number.isFinite(n) && n >= 0 ? n : 0 }));
    // Editing a number by hand means it is no longer the model's estimate.
    if (source === "ai") setSource("manual");
  };

  return (
    <Sheet open={open} onClose={close} label="Log a meal">
      <h2 className="display text-[29px] text-pearl">Add a meal.</h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ash">
        {MEAL_AI_ENABLED
          ? "Photograph the plate and Ease estimates the macros. Correct anything that looks off before saving."
          : "Photograph the plate for your record, then pick the closest match. Ease tracks the shape of the meal — protein and fibre — not exact grams."}
      </p>

      <div className="mt-6 space-y-5">
        {/* ── Photo ─────────────────────────────────────────────────────── */}
        <section>
          <Eyebrow>Photo</Eyebrow>
          <AnimatePresence mode="wait" initial={false}>
            {photo ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={glide}
                className="mt-2.5"
              >
                <div className="relative overflow-hidden rounded-2xl border border-veil">
                  <img src={photo.previewUrl} alt="The meal you photographed" className="h-44 w-full object-cover" />

                  {estimating ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-void/75 backdrop-blur-sm">
                      <Loader2 className="h-5 w-5 animate-spin text-gloss" />
                      <span className="eyebrow">Reading the plate</span>
                    </div>
                  ) : null}

                  <button
                    onClick={dropPhoto}
                    aria-label="Remove photo"
                    className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full border border-veil-strong bg-void/80 text-silk backdrop-blur-sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {MEAL_AI_ENABLED && !estimating ? (
                  <button
                    onClick={() => runEstimate(photo.blob)}
                    className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-plasma-bright"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Estimate again
                  </button>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="capture"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="mt-2.5 grid grid-cols-2 gap-2"
              >
                <CaptureButton icon={<Camera className="h-5 w-5" />} label="Take photo" onClick={() => pickPhoto("camera")} />
                <CaptureButton icon={<Images className="h-5 w-5" />} label="Choose photo" onClick={() => pickPhoto("library")} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* A failed capture reports itself here, under the buttons that were
              tapped. This used to render at the foot of the sheet, below six
              meal presets and a macro grid — roughly a thousand pixels out of
              sight — so every photo failure looked like a dead button. */}
          {error && error.startsWith(PHOTO_ERROR_PREFIX) ? (
            <p className="mt-2.5 text-[13px] font-medium text-alarm">
              {error.slice(PHOTO_ERROR_PREFIX.length)}
            </p>
          ) : null}

          {!state.session && photo ? (
            <p className="mt-2 text-[12px] leading-relaxed text-dusk">
              This photo is kept on this device. Create an account and it uploads with the meal.
            </p>
          ) : null}
        </section>

        {/* ── Estimate summary ──────────────────────────────────────────── */}
        {estimate ? (
          <motion.section
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={glide}
            className="rounded-2xl border border-plasma/30 bg-plasma-veil px-4 py-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <Eyebrow>Estimated</Eyebrow>
              <span className="text-[11px] font-semibold text-plasma-bright">
                {Math.round(estimate.confidence * 100)}% confident
              </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-silk">
              {estimate.confidence < 0.5
                ? "This is a rough guess from the photo. Check the numbers before saving."
                : "Check the numbers below and correct anything that looks off."}
            </p>
          </motion.section>
        ) : null}

        {/* ── When ──────────────────────────────────────────────────────── */}
        <section>
          <Eyebrow>When</Eyebrow>
          <div className="mt-2 flex flex-wrap gap-2">
            {SLOTS.map((s) => (
              <Chip key={s} selected={slot === s} onClick={() => setSlot(s)}>
                {s[0].toUpperCase() + s.slice(1)}
              </Chip>
            ))}
          </div>
        </section>

        {/* ── Presets. Hidden once an estimate has filled the numbers in. ── */}
        {estimate ? null : (
          <section>
            <Eyebrow>Closest match</Eyebrow>
            <div className="mt-2 grid gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  aria-pressed={presetName === p.name}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    presetName === p.name
                      ? "border-gloss bg-gloss-veil"
                      : "border-veil bg-slate hover:border-gloss/50"
                  }`}
                >
                  <span className="text-[14.5px] font-medium text-pearl">{p.name}</span>
                  <span className="text-[11.5px] text-ash">
                    {p.protein}g protein · {p.fibre}g fibre
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Numbers ───────────────────────────────────────────────────── */}
        <section>
          <Eyebrow>{estimate ? "Correct anything that's off" : "Macros"}</Eyebrow>
          <div className="mt-2.5 grid grid-cols-5 gap-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={f.step}
                  value={String(macros[f.key])}
                  onChange={(e) => setField(f.key, e.target.value)}
                  aria-label={`${f.label} in ${f.unit}`}
                  className="w-full rounded-xl border border-veil bg-slate px-2 py-2.5 text-center text-[14px] tabular-nums outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
                />
                <span className="mt-1.5 block text-center text-[9.5px] font-semibold uppercase tracking-wider text-dusk">
                  {f.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* ── Name ──────────────────────────────────────────────────────── */}
        <section>
          <Eyebrow>Name it</Eyebrow>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={estimate?.name ?? presetName}
            className="mt-2 w-full rounded-2xl border border-veil bg-slate px-4 py-3.5 text-[15px] outline-none transition-colors focus:border-gloss focus:shadow-[0_0_0_3px_rgba(255,45,135,0.12)]"
          />
        </section>

        {notice ? <p className="text-[12.5px] leading-relaxed text-plasma-bright">{notice}</p> : null}
        {/* Save errors belong here, beside the save button that caused them.
            Capture errors do not — see the photo section above. */}
        {error && !error.startsWith(PHOTO_ERROR_PREFIX) ? (
          <p className="text-[13px] font-medium text-alarm">{error}</p>
        ) : null}
      </div>

      <Button full onClick={save} disabled={busy || estimating} className="mt-7">
        {busy ? "Saving…" : "Add meal"}
      </Button>
    </Sheet>
  );
}

function CaptureButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-veil-strong bg-slate/50 text-silk transition-colors hover:border-gloss/60 hover:text-pearl"
    >
      <span className="text-gloss">{icon}</span>
      <span className="text-[13px] font-semibold">{label}</span>
    </button>
  );
}
