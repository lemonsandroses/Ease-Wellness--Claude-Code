import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL, type PurchasesPackage } from "@revenuecat/purchases-capacitor";

/**
 * Store billing, via RevenueCat.
 *
 * Apple and Google both require their own billing for digital subscriptions, so
 * this is the only purchase path in the shipped apps. RevenueCat sits on top of
 * StoreKit and Play Billing and normalises receipts, renewals and entitlements.
 *
 * It only runs on a device. On the web this provider stays inert and the app
 * falls back to the entitlement stored against the Supabase profile, so
 * development in a browser keeps working.
 */

/** Must match the entitlement identifier configured in the RevenueCat dashboard. */
export const ENTITLEMENT_ID = "premium";

const IOS_KEY = import.meta.env.VITE_REVENUECAT_IOS_KEY ?? "";
const ANDROID_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? "";

export const isNative = Capacitor.isNativePlatform();

function apiKey(): string {
  return Capacitor.getPlatform() === "ios" ? IOS_KEY : ANDROID_KEY;
}

/** True only when we can actually talk to a store. */
export const billingAvailable = isNative && Boolean(apiKey());

interface PurchasesState {
  ready: boolean;
  /** Entitlement according to the store. Undefined until we've checked. */
  isPremium: boolean | undefined;
  packages: PurchasesPackage[];
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<PurchasesState | null>(null);

export function PurchasesProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  const [ready, setReady] = useState(!billingAvailable);
  const [isPremium, setIsPremium] = useState<boolean | undefined>(undefined);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);

  const readEntitlement = useCallback(async () => {
    const { customerInfo } = await Purchases.getCustomerInfo();
    setIsPremium(Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]));
  }, []);

  const refresh = useCallback(async () => {
    if (!billingAvailable) return;
    try {
      const offerings = await Purchases.getOfferings();
      setPackages(offerings.current?.availablePackages ?? []);
      await readEntitlement();
    } catch (err) {
      console.warn("Could not load store offerings", err);
    }
  }, [readEntitlement]);

  useEffect(() => {
    if (!billingAvailable) {
      setReady(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR });
        // Identifying by the Supabase user id keeps entitlements attached to the
        // account rather than the device, so a new phone restores automatically.
        await Purchases.configure({ apiKey: apiKey(), appUserID: userId });
        if (!cancelled) await refresh();
      } catch (err) {
        console.warn("RevenueCat could not start", err);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, refresh]);

  const purchase = useCallback(
    async (pkg: PurchasesPackage) => {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      setIsPremium(Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]));
    },
    [],
  );

  const restore = useCallback(async () => {
    const { customerInfo } = await Purchases.restorePurchases();
    const active = Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
    setIsPremium(active);
    return active;
  }, []);

  const value = useMemo(
    () => ({ ready, isPremium, packages, purchase, restore, refresh }),
    [ready, isPremium, packages, purchase, restore, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePurchases(): PurchasesState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePurchases must be used inside PurchasesProvider");
  return ctx;
}
