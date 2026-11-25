export const DAY_MS = 86_400_000;

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / DAY_MS);
}

export function monthLabel(key: string): string {
  return fromKey(key).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function shortDate(key: string): string {
  return fromKey(key).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function weekdayInitial(key: string): string {
  return fromKey(key).toLocaleDateString("en-GB", { weekday: "narrow" });
}

/** Keys for the last `n` days, oldest first, ending today. */
export function lastNDays(n: number, end = today()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

/**
 * Whether a date of birth puts someone at 18 or over today.
 *
 * India's DPDP Act treats every Data Principal under 18 as a Child, requiring
 * verifiable parental consent before any processing. Ease has no way to obtain
 * that, so 18 is the floor rather than a preference.
 */
export function isAdult(birthDate: string | undefined, now = today()): boolean {
  if (!birthDate) return false;
  const born = fromKey(birthDate);
  const asOf = fromKey(now);
  if (Number.isNaN(born.getTime()) || born > asOf) return false;
  let age = asOf.getFullYear() - born.getFullYear();
  const beforeBirthday =
    asOf.getMonth() < born.getMonth() ||
    (asOf.getMonth() === born.getMonth() && asOf.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age >= 18;
}
