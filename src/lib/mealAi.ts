import { supabase } from "./supabase";
import type { Meal } from "@/types";

/**
 * Vision estimation of a meal's macros.
 *
 * ── Switching this on ────────────────────────────────────────────────────────
 * 1. Set the key as a Supabase secret (it never belongs in the app bundle —
 *    anything shipped to the client can be read out of it):
 *       supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 * 2. Deploy the function:
 *       supabase functions deploy estimate-meal
 * 3. Flip the flag below to true and rebuild.
 *
 * Until then the sheet falls back to picking a preset by hand, and the photo is
 * still captured and stored — so nothing about the logging flow depends on this
 * being on.
 *
 * Typed as `boolean` rather than left to infer the literal `false`, so the
 * branches that depend on it are not narrowed away as unreachable.
 */
export const MEAL_AI_ENABLED: boolean = false;

/** What the model is asked to return, before the user confirms or edits it. */
export interface MealEstimate {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  nutrients: string[];
  /** The model's own confidence, 0–1. Shown so a shaky guess reads as a guess. */
  confidence: number;
}

export class EstimateUnavailable extends Error {}

function clamp(n: unknown, min: number, max: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return Math.min(max, Math.max(min, v));
}

/**
 * Nothing from the model is trusted as-is: it lands in a numeric column with
 * check constraints, and a hallucinated 40,000-calorie sandwich would either be
 * rejected by Postgres or quietly wreck every average in Patterns.
 */
function coerce(raw: unknown): MealEstimate {
  const o = (raw ?? {}) as Record<string, unknown>;
  const name = typeof o.name === "string" && o.name.trim() ? o.name.trim().slice(0, 80) : "Meal";
  return {
    name,
    calories: Math.round(clamp(o.calories, 0, 4000)),
    protein: Math.round(clamp(o.protein, 0, 300) * 10) / 10,
    carbs: Math.round(clamp(o.carbs, 0, 500) * 10) / 10,
    fats: Math.round(clamp(o.fats, 0, 300) * 10) / 10,
    fibre: Math.round(clamp(o.fibre, 0, 100) * 10) / 10,
    nutrients: Array.isArray(o.nutrients)
      ? o.nutrients.filter((n): n is string => typeof n === "string").slice(0, 6)
      : [],
    confidence: clamp(o.confidence, 0, 1),
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // Chunked: spreading a multi-megabyte array into String.fromCharCode in one
  // call overflows the argument stack.
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) {
    binary += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Sends the photo to the Edge Function and returns the estimate.
 *
 * The function is invoked through the Supabase client so the user's access
 * token rides along — the function rejects anonymous calls, which stops the
 * endpoint from becoming a free vision API for anyone who finds the URL.
 */
export async function estimateMealFromPhoto(blob: Blob): Promise<MealEstimate> {
  if (!MEAL_AI_ENABLED) throw new EstimateUnavailable("Photo estimation is switched off");
  if (!supabase) throw new EstimateUnavailable("Supabase is not configured");

  const { data, error } = await supabase.functions.invoke("estimate-meal", {
    body: { image: await blobToBase64(blob), mimeType: "image/jpeg" },
  });
  if (error) throw new EstimateUnavailable(error.message);
  if (!data) throw new EstimateUnavailable("No estimate returned");
  return coerce(data);
}

/** Turns an accepted estimate into the fields a Meal needs. */
export function estimateToMeal(e: MealEstimate): Pick<
  Meal,
  "name" | "calories" | "protein" | "carbs" | "fats" | "fibre" | "nutrients" | "source"
> {
  return {
    name: e.name,
    calories: e.calories,
    protein: e.protein,
    carbs: e.carbs,
    fats: e.fats,
    fibre: e.fibre,
    nutrients: e.nutrients,
    source: "ai",
  };
}
