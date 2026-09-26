import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { useStore } from "@/lib/store";

const BENEFITS = [
  "The full body protocol — exercise, stress, metabolism, skin and hair",
  "Detailed patterns across every symptom you track",
  "Correlations that show what's actually moving your symptoms",
  "Your own events and tasks planned around your cycle",
  "Trophies and badges for every streak you build",
];

export default function Paywall({ onClose }: { onClose: () => void }) {
  const { saveProfile } = useStore();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");

  // Placeholder until StoreKit and Play Billing are wired through RevenueCat.
  // Real entitlement will arrive via webhook into the subscriptions table.
  const start = () => {
    saveProfile({ subscribed: true, plan });
    onClose();
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-6">
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
        <PlanCard
          selected={plan === "annual"}
          onSelect={() => setPlan("annual")}
          name="Annual"
          price="₹6,999"
          period="per year"
          footnote="₹583 a month · two months free"
          badge="Best value"
        />
        <PlanCard
          selected={plan === "monthly"}
          onSelect={() => setPlan("monthly")}
          name="Monthly"
          price="₹699"
          period="per month"
          footnote="Cancel any time"
        />
      </div>

      <div className="mt-auto pt-8">
        <Button full onClick={start}>
          Start free trial
        </Button>

        <button onClick={onClose} className="mt-3 w-full text-center text-[13px] text-mist-500">
          Not now
        </button>

        {/* Apple requires these terms on the paywall itself — missing them is a
            common rejection. Restore is mandatory on iOS. */}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-mist-400">
          Payment is charged to your store account at confirmation of purchase. Your subscription renews automatically
          at {plan === "annual" ? "₹6,999 a year" : "₹699 a month"} unless cancelled at least 24 hours before the end
          of the current period. Manage or cancel in your account settings.
        </p>
        <div className="mt-3 flex justify-center gap-5 text-[11.5px] text-blue">
          <button className="underline-offset-4 hover:underline">Restore purchases</button>
          <button className="underline-offset-4 hover:underline">Terms</button>
          <button className="underline-offset-4 hover:underline">Privacy</button>
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
