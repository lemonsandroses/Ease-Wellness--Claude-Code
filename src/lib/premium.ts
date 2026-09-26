import { useStore } from "./store";
import { billingAvailable, usePurchases } from "./purchases";

/**
 * Single source of truth for entitlement.
 *
 * On a device the store is authoritative — RevenueCat knows about renewals,
 * refunds, billing retries and family sharing, and it answers offline. The
 * Supabase profile flag is the fallback for the web build and for the moment
 * before the store has answered, so the UI never flickers a locked state at
 * someone who has paid.
 */
export function usePremium(): boolean {
  const { state } = useStore();
  const { isPremium } = usePurchases();

  const fromServer = state.profile.subscribed;
  if (!billingAvailable) return fromServer;

  // Undefined means the store hasn't replied yet.
  return isPremium ?? fromServer;
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
