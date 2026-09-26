import type { Achievement, Phase, Pillar, SymptomId } from "@/types";

export const SYMPTOMS: { id: SymptomId; label: string; hint: string }[] = [
  { id: "cramps", label: "Cramps", hint: "Pelvic or lower belly pain" },
  { id: "bloating", label: "Bloating", hint: "Tight or swollen belly" },
  { id: "acne", label: "Acne", hint: "Jawline and chin breakouts" },
  { id: "hairfall", label: "Hair fall", hint: "More shedding than usual" },
  { id: "inflammation", label: "Inflammation", hint: "Puffiness, achiness, heat" },
  { id: "headache", label: "Headache", hint: "Dull ache or migraine" },
  { id: "fatigue", label: "Fatigue", hint: "Tired even after rest" },
  { id: "cravings", label: "Cravings", hint: "Sugar or carb pull" },
  { id: "breast_tenderness", label: "Breast tenderness", hint: "Sore or heavy" },
  { id: "mood_swings", label: "Mood swings", hint: "Quick shifts, irritability" },
  { id: "brain_fog", label: "Brain fog", hint: "Hard to focus or find words" },
  { id: "back_pain", label: "Back pain", hint: "Lower back pulling" },
];

export const SYMPTOM_LABEL: Record<SymptomId, string> = Object.fromEntries(
  SYMPTOMS.map((s) => [s.id, s.label]),
) as Record<SymptomId, string>;

export const MOODS = ["Calm", "Focused", "Tired", "Wired", "Low", "Irritable"];

export const PHASE_CONTENT: Record<Phase, { headline: string; body: string; eat: string; move: string }> = {
  menstrual: {
    headline: "Rest is a strategy, not a reward.",
    body: "Hormones are at their lowest. Energy dips are expected — this is the week to protect sleep and keep meals warm and iron-rich.",
    eat: "Iron and warmth: eggs, lentils, dark greens, cooked over raw.",
    move: "Walking, stretching, light mobility. Skip the personal bests.",
  },
  follicular: {
    headline: "Your clearest thinking window.",
    body: "Estrogen is rising and so is your tolerance for hard things. Good week for strength work, new habits, and your heaviest task list.",
    eat: "Protein at breakfast, colourful vegetables, fermented foods for gut support.",
    move: "Strength training and cardio. Your body recovers fastest now.",
  },
  ovulatory: {
    headline: "Peak energy — spend it well.",
    body: "Sociability and verbal fluency peak here. Put your pitches, shoots and difficult conversations in this window if you can.",
    eat: "Fibre and cruciferous veg to help clear excess estrogen.",
    move: "Highest intensity you'll want all month. Warm up properly.",
  },
  luteal: {
    headline: "Steady beats intense.",
    body: "Progesterone rises, then falls. Cravings, bloating and shorter patience are hormonal, not a willpower failure. Blood sugar is the lever that matters most.",
    eat: "Protein and fat with every carb. Magnesium-rich foods in the evening.",
    move: "Pilates, walking, lighter lifting. Protect your sleep over your step count.",
  },
};

export interface PillarCard {
  title: string;
  why: string;
  actions: string[];
  avoid?: string[];
}

export interface PillarContent {
  id: Pillar;
  label: string;
  tagline: string;
  cards: PillarCard[];
}

export const PILLARS: PillarContent[] = [
  {
    id: "nutrition",
    label: "Nutrition",
    tagline: "Eat to keep blood sugar flat. Everything else follows.",
    cards: [
      {
        title: "Protein first, always",
        why: "With PCOS, cells respond less well to insulin, so a carb-only meal spikes blood sugar higher and drops it harder. Protein blunts the spike and the crash that follows it.",
        actions: [
          "Aim for a palm of protein at every meal — eggs, paneer, dal, chicken, fish, tofu.",
          "Eat protein before the carb on your plate. Order matters more than people expect.",
          "Never start the day on cereal, toast or juice alone.",
        ],
        avoid: ["Fruit juice on an empty stomach", "Skipping breakfast then over-eating at 4pm"],
      },
      {
        title: "Fibre is your quiet hero",
        why: "Fibre slows sugar absorption and helps your gut clear used-up estrogen. Low fibre means more of it recirculates — which shows up as bloating and breakouts.",
        actions: [
          "30g a day is the target. Most people get half that.",
          "Add a vegetable to a meal you already eat rather than redesigning the meal.",
          "Chia, flax, legumes, cruciferous veg are the highest-yield additions.",
        ],
      },
      {
        title: "Pair, don't ban",
        why: "Restriction backfires on a cycle that already drives cravings. Pairing a carb with protein, fat or fibre flattens the glucose curve without giving anything up.",
        actions: [
          "Rice with dal and salad, not rice alone.",
          "Dessert after a meal rather than on an empty stomach.",
          "A 10-minute walk after eating lowers the post-meal spike measurably.",
        ],
      },
    ],
  },
  {
    id: "exercise",
    label: "Exercise",
    tagline: "Build muscle. It is the cheapest insulin fix you have.",
    cards: [
      {
        title: "Strength twice a week",
        why: "Muscle pulls glucose out of the blood without needing much insulin. More muscle means steadier energy, fewer cravings and, over months, more regular cycles.",
        actions: [
          "Two sessions a week is the dose that works. Thirty minutes counts.",
          "Squat, hinge, push, pull. Six to ten reps, leave two in the tank.",
          "Progress load slowly — soreness is not the goal.",
        ],
      },
      {
        title: "Walk after meals",
        why: "A short walk after eating moves glucose into muscle directly. It is the single highest-return habit for insulin resistance and it costs ten minutes.",
        actions: [
          "Ten to fifteen minutes within an hour of your largest meal.",
          "Pace is irrelevant. Consistency is not.",
        ],
      },
      {
        title: "Stop over-training",
        why: "Long, hard cardio raises cortisol, and high cortisol worsens insulin resistance and suppresses ovulation. More is not better here.",
        actions: [
          "Keep hard sessions to three a week, ideally in your follicular and ovulatory weeks.",
          "In the luteal week, swap HIIT for pilates, walking or lighter lifting.",
        ],
        avoid: ["Daily high-intensity training", "Fasted hard cardio when you're already exhausted"],
      },
    ],
  },
  {
    id: "stress",
    label: "Stress",
    tagline: "Cortisol and your cycle are on the same circuit.",
    cards: [
      {
        title: "Why stress shows up in your skin",
        why: "Sustained cortisol raises blood sugar, and raised insulin tells the ovaries to make more androgens. Those androgens are what drive jawline acne and hair thinning. Stress is not a separate problem from your symptoms.",
        actions: [
          "Protect one non-negotiable wind-down hour before bed.",
          "Get daylight within an hour of waking — it anchors the whole cortisol curve.",
          "Name the top stressor each week rather than trying to fix all of them.",
        ],
      },
      {
        title: "Work with the luteal dip",
        why: "In the week before your period, serotonin drops and everything feels harder. Scheduling as though you're always in your follicular week guarantees a monthly crash.",
        actions: [
          "Batch demanding work — pitches, filming, hard conversations — into weeks one and two.",
          "Leave admin and editing for the luteal week.",
          "Plan for lower capacity instead of treating it as a personal failure.",
        ],
      },
      {
        title: "Sleep is the multiplier",
        why: "One short night measurably worsens insulin sensitivity the next day. With PCOS you feel that faster than most.",
        actions: [
          "Same wake time daily, even after a bad night.",
          "Magnesium-rich foods in the evening — pumpkin seeds, dark chocolate, leafy greens.",
          "Screens down 30 minutes before bed. Start there, not with a full routine overhaul.",
        ],
      },
    ],
  },
  {
    id: "metabolism",
    label: "Metabolism",
    tagline: "Flat blood sugar is the whole game.",
    cards: [
      {
        title: "What insulin resistance actually is",
        why: "Your cells stop responding well to insulin, so your body makes more of it. High insulin tells the ovaries to produce more testosterone — which is why acne, hair fall and irregular cycles travel together. It is a mechanism, not a character flaw.",
        actions: [
          "Three balanced meals beat six snacks — constant grazing keeps insulin high all day.",
          "Ten minutes of movement after meals.",
          "Sleep and strength work improve insulin sensitivity more reliably than any supplement.",
        ],
      },
      {
        title: "Your daily glucose shape",
        why: "Sharp spikes and crashes drive the 4pm slump, the sugar pull and the mood dip. A flatter curve feels like steady energy — that is the whole target.",
        actions: [
          "Savoury breakfast with 20–30g protein.",
          "Vinegar or a salad before a carb-heavy meal blunts the spike.",
          "Eat your largest meal earlier in the day when you can.",
        ],
      },
      {
        title: "Go easy on fasting",
        why: "Long fasts raise cortisol in many women with PCOS and can make cycles more irregular, not less. The evidence for aggressive fasting here is weak.",
        actions: [
          "A 12-hour overnight gap is plenty.",
          "Eat within two hours of waking if mornings are shaky.",
        ],
        avoid: ["Skipping meals to compensate for a big one", "Long fasts during your luteal week"],
      },
    ],
  },
  {
    id: "skin",
    label: "Skin",
    tagline: "Hormonal acne is an inside-out problem.",
    cards: [
      {
        title: "Why it sits on your jaw",
        why: "Androgens thicken oil and slow skin shedding, and the jawline and chin have the most androgen-sensitive glands. That distribution is the tell that this is hormonal, not hygiene.",
        actions: [
          "Track flares against your cycle day — the pattern usually appears within two cycles.",
          "Keep the routine simple: gentle cleanser, one active, sunscreen.",
          "Zinc and omega-3 rich foods support skin calm from the inside.",
        ],
        avoid: ["Stacking new actives during a flare", "Scrubbing — it worsens inflammation"],
      },
      {
        title: "Blood sugar shows up on your face",
        why: "Glucose spikes raise insulin, insulin raises androgens, androgens raise oil production. Flattening your glucose curve is skin care.",
        actions: [
          "Apply the protein-first rule for two weeks and log your flares.",
          "Watch dairy and high-sugar days — for some people the link is clear, for others it isn't. Your log will tell you.",
        ],
      },
    ],
  },
  {
    id: "hair",
    label: "Hair",
    tagline: "Shedding responds to iron, protein and time.",
    cards: [
      {
        title: "Why hair thins with PCOS",
        why: "The same androgens behind acne shrink scalp follicles and push hairs into the resting phase early. Low iron and low protein make it worse — both are common and both are fixable.",
        actions: [
          "Ask your doctor for ferritin, not just haemoglobin. Hair needs ferritin above roughly 30–40.",
          "Protein at every meal — hair is made of it.",
          "Be patient: follicles respond on a three-month lag, so judge changes at twelve weeks, not two.",
        ],
        avoid: ["Tight styles on wet hair", "Crash dieting, which triggers shedding within months"],
      },
      {
        title: "Support the scalp",
        why: "A calm, well-fed scalp holds hairs longer. Most of the work is nutritional, but handling matters too.",
        actions: [
          "Pumpkin seeds, eggs, lentils and leafy greens cover the key inputs.",
          "Wash regularly — leaving oil and buildup on the scalp does not help.",
          "Photograph your part line monthly so you can actually see change.",
        ],
      },
    ],
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "streak_5", title: "First five", detail: "Logged five days in a row", family: "milestone", threshold: 5 },
  { id: "streak_20", title: "Momentum", detail: "Twenty days in a row", family: "milestone", threshold: 20 },
  { id: "streak_50", title: "Peak routine", detail: "Fifty days in a row", family: "milestone", threshold: 50 },
  { id: "streak_75", title: "Stronger you", detail: "Seventy-five days in a row", family: "milestone", threshold: 75 },
  { id: "streak_100", title: "Century", detail: "One hundred days in a row", family: "milestone", threshold: 100 },
  { id: "streak_150", title: "Unstoppable", detail: "One hundred and fifty days", family: "milestone", threshold: 150 },
  { id: "streak_200", title: "Legendary", detail: "Two hundred days", family: "milestone", threshold: 200 },

  { id: "first_log", title: "Day one", detail: "Logged for the first time", family: "accomplishment" },
  { id: "first_cycle", title: "Full circle", detail: "Logged a complete cycle start to start", family: "accomplishment" },
  { id: "meals_25", title: "Fed and tracked", detail: "Logged twenty-five meals", family: "accomplishment" },
  { id: "meals_100", title: "Nutrition fluent", detail: "Logged one hundred meals", family: "accomplishment" },
  { id: "protein_week", title: "Protein week", detail: "Hit your protein target seven days running", family: "accomplishment" },
  { id: "movement_week", title: "Moved all week", detail: "Movement logged seven days running", family: "accomplishment" },
  { id: "first_pattern", title: "Pattern spotted", detail: "Unlocked your first correlation insight", family: "accomplishment" },

  { id: "consistent_7", title: "One week steady", detail: "Seven days of logging", family: "consistency" },
  { id: "consistent_30", title: "One month steady", detail: "Thirty days of logging", family: "consistency" },
  { id: "consistent_90", title: "One quarter steady", detail: "Ninety days of logging", family: "consistency" },
  { id: "full_day", title: "Complete picture", detail: "Logged every section in a single day", family: "consistency" },
];

export const FOCUS_OPTIONS: { id: Pillar; label: string; blurb: string }[] = [
  { id: "skin", label: "Clearer skin", blurb: "Hormonal acne and flares" },
  { id: "hair", label: "Less hair fall", blurb: "Shedding and thinning" },
  { id: "metabolism", label: "Steady energy", blurb: "Crashes, cravings, weight" },
  { id: "nutrition", label: "Eating better", blurb: "Without counting everything" },
  { id: "stress", label: "Lower stress", blurb: "Overwhelm and sleep" },
  { id: "exercise", label: "Moving more", blurb: "Strength and consistency" },
];
