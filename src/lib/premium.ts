import { useStore } from "./store";

/**
 * Single source of truth for entitlement. Today it reads the profile flag that
 * the server owns; when RevenueCat lands it reads the SDK first (instant and
 * offline) with Supabase as the cross-device backstop. Every lock in the app
 * goes through here so there is one place to change.
 */
export function usePremium(): boolean {
  const { state } = useStore();
  return state.profile.subscribed;
}

/** What each lock says. Kept together so the pitch stays consistent. */
export const LOCK_COPY = {
  pillar: {
    title: "Unlock the full protocol",
    body: "Exercise, stress, metabolism, skin and hair — the mechanisms behind your symptoms and what actually moves them.",
  },
  patterns: {
    title: "See what's driving your symptoms",
    body: "Skin, hair, energy, mood, nutrition and the correlations between them, tracked against your cycle.",
  },
  journey: {
    title: "Earn your milestones",
    body: "Trophies and badges for every streak and habit you build.",
  },
  calendarWrite: {
    title: "Plan around your cycle",
    body: "Add your own events and tasks so your week sits next to your phases. Your Google calendar stays free to view.",
  },
} as const;
