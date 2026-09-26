import { useState } from "react";
import { Button, Chip, Eyebrow, Sheet } from "@/components/ui";
import { useStore } from "@/lib/store";
import { today } from "@/lib/date";
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

export default function MealSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMeal } = useStore();
  const [slot, setSlot] = useState<Meal["slot"]>("lunch");
  const [preset, setPreset] = useState(PRESETS[0]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const save = () => {
    const finalName = name.trim() || preset.name;
    if (!finalName) {
      setError("Give the meal a name first");
      return;
    }
    setError("");
    addMeal({
      id: `meal_${Date.now()}`,
      date: today(),
      name: finalName,
      slot,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fats: preset.fats,
      fibre: preset.fibre,
      nutrients: [],
      loggedAt: new Date().toISOString(),
    });
    setName("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label="Log a meal">
      <h2 className="display text-[28px] text-tangerine">What did you eat?</h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-mist-500">
        Pick the closest match. Ease cares about the shape of the meal — protein and fibre — not exact grams.
      </p>

      <div className="mt-6 space-y-5">
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

        <section>
          <Eyebrow>Closest match</Eyebrow>
          <div className="mt-2 grid gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => setPreset(p)}
                aria-pressed={preset.name === p.name}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                  preset.name === p.name
                    ? "border-tangerine bg-tangerine-wash"
                    : "border-mist-200 bg-white hover:border-mist-300"
                }`}
              >
                <span className="text-[14.5px] font-medium text-ink">{p.name}</span>
                <span className="text-[11.5px] text-mist-500">
                  {p.protein}g protein · {p.fibre}g fibre
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <Eyebrow>Name it (optional)</Eyebrow>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={preset.name}
            className="mt-2 w-full rounded-2xl border border-mist-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-tangerine"
          />
          {error ? <p className="mt-2 text-[13px] font-medium text-[#B4321F]">{error}</p> : null}
        </section>
      </div>

      <Button full onClick={save} className="mt-7">
        Add meal
      </Button>
    </Sheet>
  );
}
