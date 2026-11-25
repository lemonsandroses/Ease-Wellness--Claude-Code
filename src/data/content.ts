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
    headline: "Prioritise rest this week.",
    body: "Hormones are at their lowest and energy drops with them. Protect sleep, keep meals warm and iron-rich, and reduce what you demand of this week.",
    eat: "Eat iron-rich food warm: eggs, lentils, dark greens. Choose cooked over raw.",
    move: "Walk, stretch and do light mobility. Avoid personal bests.",
  },
  follicular: {
    headline: "Take on your hardest work now.",
    body: "Estrogen is rising and tolerance for hard effort rises with it. Schedule strength work, new habits and the heaviest items on your list into this week.",
    eat: "Eat protein at breakfast. Add colourful vegetables and fermented food for gut support.",
    move: "Train strength and cardio. Recovery is fastest in this phase.",
  },
  ovulatory: {
    headline: "Schedule your most demanding days now.",
    body: "Sociability and verbal fluency peak in this window. Place pitches, shoots and difficult conversations here where your schedule allows it.",
    eat: "Increase fibre and cruciferous vegetables to support estrogen clearance.",
    move: "Train at the highest intensity of your month. Warm up fully first.",
  },
  luteal: {
    headline: "Scale intensity back and protect sleep.",
    body: "Progesterone rises, then falls. Expect cravings, bloating and a shorter fuse; these track the hormone shift. Manage blood sugar first — it is the lever with the most effect.",
    eat: "Pair protein and fat with every carb. Add magnesium-rich food in the evening.",
    move: "Choose pilates, walking or lighter lifting. Prioritise sleep over step count.",
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
    tagline: "Keep blood sugar flat at every meal.",
    cards: [
      {
        title: "Eat protein and fibre before carbs",
        why: "With PCOS, cells respond less well to insulin, so a carb-only meal raises blood sugar higher and drops it harder. Protein blunts both the rise and the crash. Fibre slows sugar absorption and helps the gut clear used-up estrogen; when fibre is low, more of it recirculates and shows up as bloating and breakouts. Restriction works against a cycle that already drives cravings, so pair carbs rather than removing them.",
        actions: [
          "Eat a palm of protein at every meal: eggs, paneer, dal, chicken, fish, tofu.",
          "Eat the protein on your plate before the carb. The order changes the glucose response.",
          "Target 30g of fibre a day from chia, flax, legumes and cruciferous vegetables.",
          "Add one vegetable to a meal you already eat rather than redesigning the meal.",
          "Pair every carb with protein, fat or fibre: rice with dal and salad, not rice alone.",
          "Eat dessert after a meal rather than on an empty stomach.",
          "Walk for ten minutes after eating to lower the post-meal rise.",
        ],
        avoid: ["Fruit juice on an empty stomach", "Skipping breakfast, then over-eating at 4pm"],
      },
    ],
  },
  {
    id: "exercise",
    label: "Exercise",
    tagline: "Build muscle to improve insulin sensitivity.",
    cards: [
      {
        title: "Lift twice a week and walk after meals",
        why: "Muscle pulls glucose out of the blood without needing much insulin, so more muscle means steadier energy, fewer cravings and, over months, more regular cycles. A short walk after eating moves glucose into muscle directly. Long, hard cardio works against this: it raises cortisol, and sustained cortisol worsens insulin resistance and suppresses ovulation.",
        actions: [
          "Train strength twice a week. Thirty minutes per session is enough.",
          "Cover squat, hinge, push and pull. Six to ten reps, leaving two in the tank.",
          "Increase load slowly. Soreness is not the measure of a session.",
          "Walk ten to fifteen minutes within an hour of your largest meal.",
          "Cap hard sessions at three a week and place them in your follicular and ovulatory weeks.",
          "In the luteal week, swap HIIT for pilates, walking or lighter lifting.",
        ],
        avoid: ["Daily high-intensity training", "Fasted hard cardio when you are already exhausted"],
      },
    ],
  },
  {
    id: "stress",
    label: "Stress",
    tagline: "Lower cortisol to steady your cycle.",
    cards: [
      {
        title: "Anchor the day and protect sleep",
        why: "Sustained cortisol raises blood sugar, and raised insulin tells the ovaries to make more androgens — the same androgens that drive jawline acne and hair thinning. Stress is not separate from those symptoms. Sleep compounds it: one short night measurably worsens insulin sensitivity the next day, and with PCOS that effect arrives faster. In the week before a period, serotonin drops and capacity falls with it.",
        actions: [
          "Get daylight within an hour of waking. It anchors the whole cortisol curve.",
          "Keep the same wake time every day, including after a bad night.",
          "Protect one wind-down hour before bed and put screens down 30 minutes before sleep.",
          "Eat magnesium-rich food in the evening: pumpkin seeds, dark chocolate, leafy greens.",
          "Batch demanding work — pitches, filming, hard conversations — into weeks one and two.",
          "Move admin and editing into the luteal week and plan for lower capacity there.",
          "Name one top stressor each week rather than addressing all of them at once.",
        ],
        avoid: ["Scheduling every week as though it were your follicular week"],
      },
    ],
  },
  {
    id: "metabolism",
    label: "Metabolism",
    tagline: "Flatten the daily glucose curve.",
    cards: [
      {
        title: "Lower the insulin load across your day",
        why: "Insulin resistance means cells respond less well to insulin, so the body produces more of it. High insulin tells the ovaries to produce more testosterone, which is why acne, hair fall and irregular cycles travel together. Sharp rises and crashes drive the afternoon slump, the sugar pull and the mood dip; a flatter curve is the target. Long fasts work against that for many women with PCOS — they raise cortisol and can make cycles more irregular, and the evidence for aggressive fasting here is weak.",
        actions: [
          "Eat three balanced meals rather than six snacks. Constant grazing holds insulin high all day.",
          "Start with a savoury breakfast carrying 20–30g of protein.",
          "Take vinegar or a salad before a carb-heavy meal to blunt the rise.",
          "Eat your largest meal earlier in the day where your schedule allows it.",
          "Move for ten minutes after meals.",
          "Keep the overnight gap to about twelve hours. That is enough.",
          "Eat within two hours of waking if your mornings are shaky.",
          "Use sleep and strength work before supplements — both improve insulin sensitivity more reliably.",
        ],
        avoid: ["Skipping meals to compensate for a large one", "Long fasts during your luteal week"],
      },
    ],
  },
  {
    id: "skin",
    label: "Skin",
    tagline: "Treat hormonal acne from the inside.",
    cards: [
      {
        title: "Track flares against your cycle, then simplify the routine",
        why: "Androgens thicken oil and slow the rate at which skin sheds, and the jawline and chin carry the most androgen-sensitive glands. That distribution is the signal that the cause is hormonal rather than hygiene. The route in is metabolic: glucose rises raise insulin, insulin raises androgens, and androgens raise oil production. Flattening the glucose curve is part of treating the skin.",
        actions: [
          "Log flares against your cycle day. The pattern usually appears within two cycles.",
          "Keep the routine to three steps: gentle cleanser, one active, sunscreen.",
          "Apply the protein-first rule for two weeks and log what happens to your flares.",
          "Record dairy and high-sugar days. The link is clear for some people and absent for others, so read your own log rather than a general rule.",
          "Eat zinc and omega-3 rich food to support the skin from the inside.",
        ],
        avoid: ["Stacking new actives during a flare", "Scrubbing, which worsens inflammation"],
      },
    ],
  },
  {
    id: "hair",
    label: "Hair",
    tagline: "Raise iron and protein, then allow twelve weeks.",
    cards: [
      {
        title: "Check ferritin, raise protein, judge at twelve weeks",
        why: "The androgens behind the acne also shrink scalp follicles and push hairs into the resting phase early. Low iron and low protein make that worse; both are common and both are correctable. Follicles respond on roughly a three-month lag, so changes made now show up later — which is why a judgement at two weeks will always read as failure.",
        actions: [
          "Ask your doctor for ferritin, not haemoglobin alone. Hair generally needs ferritin above 30–40.",
          "Eat protein at every meal. Hair is made of it.",
          "Cover the key inputs with pumpkin seeds, eggs, lentils and leafy greens.",
          "Wash regularly. Leaving oil and buildup on the scalp does not help it.",
          "Photograph your part line monthly so change is visible rather than remembered.",
          "Assess progress at twelve weeks, not two.",
        ],
        avoid: ["Tight styles on wet hair", "Crash dieting, which triggers shedding within months"],
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
  { id: "skin", label: "Clear my skin", blurb: "Hormonal acne and flares" },
  { id: "hair", label: "Reduce hair fall", blurb: "Shedding and thinning" },
  { id: "metabolism", label: "Steady my energy", blurb: "Crashes, cravings, weight" },
  { id: "nutrition", label: "Eat better", blurb: "Without counting everything" },
  { id: "stress", label: "Lower my stress", blurb: "Overwhelm and sleep" },
  { id: "exercise", label: "Move more", blurb: "Strength and consistency" },
];
