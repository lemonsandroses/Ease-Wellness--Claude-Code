import type { AppState, Profile } from "@/types";

export const emptyProfile: Profile = {
  name: "",
  cycleLength: 28,
  periodLength: 5,
  focus: [],
  baselineSymptoms: [],
  subscribed: false,
};

export const emptyState: AppState = {
  profile: emptyProfile,
  logs: [],
  meals: [],
  events: [],
  achievements: {},
  session: null,
};
