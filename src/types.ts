export type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export type Pillar = "nutrition" | "exercise" | "stress" | "metabolism" | "skin" | "hair";

export type BleedLevel = "none" | "spotting" | "light" | "medium" | "heavy";

/** Symptoms we track. Ids are stable — they key both logging and pattern charts. */
export type SymptomId =
  | "cramps"
  | "bloating"
  | "acne"
  | "hairfall"
  | "inflammation"
  | "headache"
  | "fatigue"
  | "cravings"
  | "breast_tenderness"
  | "mood_swings"
  | "brain_fog"
  | "back_pain";

export interface DayLog {
  date: string;
  bleeding: BleedLevel;
  /** 0 = not logged, 1 = mild, 2 = moderate, 3 = strong */
  symptoms: Partial<Record<SymptomId, number>>;
  energy?: number;
  mood?: string;
  sleepHours?: number;
  sleepQuality?: number;
  stress?: number;
  water?: number;
  movement?: string;
  notes?: string;
  loggedAt: string;
}

export interface Meal {
  id: string;
  date: string;
  name: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fibre: number;
  nutrients: string[];
  note?: string;
  loggedAt: string;
}

/** Events and tasks share a table — a task is an event without a time that can be ticked off. */
export interface CalendarItem {
  id: string;
  kind: "event" | "task";
  date: string;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  done: boolean;
  /** Set when the item came from Google Calendar, so we don't duplicate on re-sync. */
  googleId?: string;
  createdAt: string;
}

export interface Profile {
  name: string;
  birthDate?: string;
  cycleLength: number;
  periodLength: number;
  lastPeriodStart?: string;
  focus: Pillar[];
  baselineSymptoms: SymptomId[];
  energyRhythm?: string;
  sleepTendency?: string;
  movementStyle?: string;
  subscribed: boolean;
  plan?: "monthly" | "annual";
  onboardedAt?: string;
}

export interface CycleState {
  /** False until we have a period date to anchor to — nothing below is meaningful yet. */
  known: boolean;
  day: number;
  phase: Phase;
  /** True when logged history is too irregular or sparse to be precise. */
  estimated: boolean;
  /** Mean cycle length across logged starts, when we have enough of them. */
  observedLength?: number;
  /** Standard deviation of cycle lengths — the irregularity signal. */
  variance?: number;
  nextPeriodDate?: string;
  daysUntilNext?: number;
  cycleCount: number;
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  family: "milestone" | "accomplishment" | "consistency";
  /** Milestones only — the streak length that unlocks the trophy. */
  threshold?: number;
  earnedAt?: string;
}

export interface AppState {
  profile: Profile;
  logs: DayLog[];
  meals: Meal[];
  events: CalendarItem[];
  achievements: Record<string, string>;
  session: { email: string } | null;
}
