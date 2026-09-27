import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { Button, Eyebrow } from "@/components/ui";
import { useStore } from "@/lib/store";
import { billingAvailable, usePurchases } from "@/lib/purchases";

const BENEFITS = [
  "The full body protocol — exercise, stress, metabolism, skin and hair",
  "Detailed patterns across every symptom you track",
  "Correlations that show what's actually moving your symptoms",
  "Your own events and tasks planned around your cycle",
  "Trophies and badges for every streak you build",
];

/** Shown when the store hasn't answered — matches the products we configure. */
const FALLBACK = [
  { id: "annual", name: "Annual", price: "₹6,999", period: "per year", footnote: "₹583 a month · two months free", badge: "Best value" },
  { id: "monthly", name: "Monthly", price: "₹699", period: "per month", footnote: "Cancel any time" },
];

export default function Paywall({ onClose }: { onClose: () => void }) {
  const { saveProfile } = useStore();
  const { packages, purchase, restore, refresh } = usePurchases();
  const [selected, setSelected] = useState<string>("annual");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Prices come from the store so they're localised and always current; the
  // hardcoded list is only a placeholder before the store replies.
  const options = packages.length
    ? packages.map((p) => ({
        id: p.identifier,
        name: p.product.title.replace(/\s*\(.*\)$/, ""),
        price: p.product.priceString,
        period: p.packageType === "ANNUAL" ? "per year" : "per month",
        footnote: p.packageType === "ANNUAL" ? "Best value" : "Cancel any time",
        badge: p.packageType === "ANNUAL" ? "Best value" : undefined,
        pkg: p as PurchasesPackage,
      }))
    : FALLBACK.map((f) => ({ ...f, pkg: undefined as PurchasesPackage | undefined }));

  const chosen = options.find((o) => o.id === selected) ?? options[0];

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      if (chosen?.pkg) {
        await purchase(chosen.pkg);
        onClose();
        return;
      }
      // No store available (web build): record intent locally so development
      // and the web preview stay usable. Real entitlement always comes from
      // the store or the server, never from here.
      if (!billingAvailable) {
        saveProfile({ subscribed: true, plan: selected === "annual" ? "annual" : "monthly" });
        onClose();
        return;
      }
      setError("Couldn't reach the store. Try again in a moment.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      // A user tapping cancel is not an error worth shouting about.
      if (!/cancel/i.test(msg)) setError("That didn't go through. You haven't been charged.");
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const active = await restore();
      if (active) {
        setMessage("Your subscription is back.");
        setTimeout(onClose, 900);
      } else {
        setMessage("No previous purchase found on this account.");
      }
    } catch {
      setError("Couldn't restore right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--safe-top))] w-full max-w-md flex-col px-5 pb-10 pt-6">
      <button
        onClick={onClose}
        aria-label="Close"
        className="mb-4 flex h-11 w-11 items-center justify-center self-end rounded-full border border-mist-200 bg-white text-mist-600"
      >
        <X className="h-4 w-4" />
      </button>

      <Eyebrow>Ease premium</Eyebrow>
      <h1 className="display mt-2 text-[38px] text-tangerine">Start your 7-day trial.</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-mist-600">
        Free for seven days. Cancel any time before it ends and you won't be charged.
      </p>

      <ul className="mt-7 space-y-3">
        {BENEFITS.map((b) => (
          <li key={b} className="flex gap-3 text-[14px] leading-relaxed text-mist-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-tangerine" />
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        {options.map((o) => (
          <PlanCard
            key={o.id}
            selected={chosen?.id === o.id}
            onSelect={() => setSelected(o.id)}
            name={o.name}
            price={o.price}
            period={o.period}
            footnote={o.footnote}
            badge={o.badge}
          />
        ))}
      </div>

      {message ? <p className="mt-4 text-center text-[13px] font-medium text-blue">{message}</p> : null}
      {error ? (
        <p role="alert" className="mt-4 text-center text-[13px] font-medium text-[#B4321F]">
          {error}
        </p>
      ) : null}

      <div className="mt-auto pt-8">
        <Button full onClick={start} disabled={busy}>
          {busy ? "One moment…" : "Start free trial"}
        </Button>

        <button onClick={onClose} className="mt-3 w-full text-center text-[13px] text-mist-500">
          Not now
        </button>

        {/* Apple requires these terms on the paywall itself, and a working
            Restore Purchases — both are common rejection reasons. */}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-mist-400">
          Payment is charged to your store account at confirmation of purchase. Your subscription renews automatically
          at {chosen?.price} {chosen?.period} unless cancelled at least 24 hours before the end of the current period.
          Manage or cancel in your account settings.
        </p>
        <div className="mt-3 flex justify-center gap-5 text-[11.5px] text-blue">
          <button onClick={onRestore} disabled={busy} className="underline-offset-4 hover:underline">
            Restore purchases
          </button>
          <a href="https://easewellness.app/terms" className="underline-offset-4 hover:underline">
            Terms
          </a>
          <a href="https://easewellness.app/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </a>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  selected,
  onSelect,
  name,
  price,
  period,
  footnote,
  badge,
}: {
  selected: boolean;
  onSelect: () => void;
  name: string;
  price: string;
  period: string;
  footnote: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center justify-between rounded-[var(--radius-card)] border px-5 py-4 text-left transition-colors ${
        selected ? "border-tangerine bg-tangerine-wash" : "border-mist-200 bg-white hover:border-mist-300"
      }`}
    >
      <span>
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-ink">{name}</span>
          {badge ? (
            <span className="rounded-full bg-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-1 block text-[12.5px] text-mist-500">{footnote}</span>
      </span>
      <span className="text-right">
        <span className="numeral block text-[26px] text-ink">{price}</span>
        <span className="block text-[11px] text-mist-500">{period}</span>
      </span>
    </button>
  );
}
