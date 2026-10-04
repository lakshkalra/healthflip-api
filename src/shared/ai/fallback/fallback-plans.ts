import type { DietPlanContent, DietPlanOptions, ExercisePlanContent, ExercisePlanOptions } from '../../../domain/plans.js';
import type { WellnessPlanContext } from '../ai-provider.js';

// Template plans used when the AI is unavailable (and in tests). Plain, balanced and scaled to the
// user's calorie target; the app labels them as standard templates.

type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner';
type MealIdea = { name: string; portion: string; proteinPerKcal: number };

const SPLIT: Record<MealSlot, number> = { breakfast: 0.25, dinner: 0.3, lunch: 0.35, snack: 0.1 };

const VEG: Record<MealSlot, MealIdea[]> = {
  breakfast: [
    { name: 'Vegetable poha', portion: '1 plate with peanuts, plus 1 cup curd', proteinPerKcal: 0.035 },
    { name: 'Moong dal chilla', portion: '2 chillas with mint chutney', proteinPerKcal: 0.06 },
    { name: 'Vegetable oats upma', portion: '1 bowl with a glass of milk', proteinPerKcal: 0.045 },
    { name: 'Paneer besan chilla', portion: '2 chillas with tomato chutney', proteinPerKcal: 0.06 },
  ],
  dinner: [
    { name: 'Palak paneer with roti', portion: '1 bowl palak paneer, 2 rotis', proteinPerKcal: 0.05 },
    { name: 'Vegetable khichdi', portion: '1.5 bowls with curd and salad', proteinPerKcal: 0.04 },
    { name: 'Mixed dal with jeera rice', portion: '1 bowl dal, 1 cup rice, salad', proteinPerKcal: 0.04 },
    { name: 'Soya chunk curry with roti', portion: '1 bowl curry, 2 rotis', proteinPerKcal: 0.065 },
  ],
  lunch: [
    { name: 'Dal tadka, roti and sabzi', portion: '1 bowl dal, 2 rotis, 1 bowl sabzi', proteinPerKcal: 0.04 },
    { name: 'Rajma chawal', portion: '1 bowl rajma, 1 cup rice, salad', proteinPerKcal: 0.04 },
    { name: 'Chole with roti and raita', portion: '1 bowl chole, 2 rotis, cucumber raita', proteinPerKcal: 0.04 },
    { name: 'Paneer bhurji with roti', portion: '1 bowl bhurji, 2 rotis, salad', proteinPerKcal: 0.055 },
  ],
  snack: [
    { name: 'Roasted chana and fruit', portion: '1 handful chana, 1 apple', proteinPerKcal: 0.04 },
    { name: 'Sprouts chaat', portion: '1 bowl', proteinPerKcal: 0.06 },
    { name: 'Makhana and buttermilk', portion: '1 cup makhana, 1 glass chaas', proteinPerKcal: 0.035 },
  ],
};

const VEGAN: Record<MealSlot, MealIdea[]> = {
  breakfast: [
    { name: 'Moong dal chilla', portion: '2 chillas with mint chutney', proteinPerKcal: 0.06 },
    { name: 'Tofu bhurji toast', portion: '1 bowl tofu bhurji, 2 slices whole-wheat toast', proteinPerKcal: 0.06 },
    { name: 'Vegetable poha', portion: '1 plate with peanuts', proteinPerKcal: 0.03 },
  ],
  dinner: [
    { name: 'Tofu and vegetable stir-fry', portion: '1 bowl with 1 cup brown rice', proteinPerKcal: 0.055 },
    { name: 'Soya chunk curry with roti', portion: '1 bowl curry, 2 rotis', proteinPerKcal: 0.065 },
    { name: 'Vegetable khichdi', portion: '1.5 bowls with salad', proteinPerKcal: 0.035 },
  ],
  lunch: [
    { name: 'Rajma chawal', portion: '1 bowl rajma, 1 cup rice, salad', proteinPerKcal: 0.04 },
    { name: 'Dal tadka, roti and sabzi', portion: '1 bowl dal, 2 rotis, 1 bowl sabzi', proteinPerKcal: 0.04 },
    { name: 'Chana masala with rice', portion: '1 bowl chana, 1 cup rice, salad', proteinPerKcal: 0.04 },
  ],
  snack: [
    { name: 'Roasted chana and fruit', portion: '1 handful chana, 1 banana', proteinPerKcal: 0.04 },
    { name: 'Peanut butter on whole-wheat toast', portion: '1 slice, 1 tbsp peanut butter', proteinPerKcal: 0.035 },
  ],
};

const EGG: Partial<Record<MealSlot, MealIdea[]>> = {
  breakfast: [{ name: 'Masala omelette with toast', portion: '2-egg omelette, 2 slices whole-wheat toast', proteinPerKcal: 0.06 }],
  snack: [{ name: 'Boiled eggs', portion: '2 eggs with a pinch of chaat masala', proteinPerKcal: 0.08 }],
};

const NON_VEG: Partial<Record<MealSlot, MealIdea[]>> = {
  dinner: [{ name: 'Grilled fish with roti and salad', portion: '1 fillet, 2 rotis, salad', proteinPerKcal: 0.08 }],
  lunch: [{ name: 'Chicken curry with rice', portion: '1 bowl curry, 1 cup rice, salad', proteinPerKcal: 0.07 }],
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

const AVOID_CUE = /allerg|avoid|intoleran|don'?t eat|do not eat|doesn'?t eat|does not eat|dislike|hate|no /i;
const NOT_FOODS = new Set(['allergic', 'allergy', 'avoids', 'avoid', 'dislikes', 'dislike', 'hates', 'does', 'doesn', 'eat', 'eats', 'food', 'foods', 'intolerant', 'intolerance', 'likes', 'never', 'severe', 'mild', 'very', 'really', 'with', 'from', 'their', 'they', 'user']);

/** Food words from memories like "Allergic to peanuts" or "Hates bitter gourd". */
export function avoidedFoods(memories: string[]): string[] {
  return memories
    .filter(memory => AVOID_CUE.test(memory))
    .flatMap(memory => memory.toLowerCase().split(/[^a-z]+/))
    .filter(word => word.length >= 3 && !NOT_FOODS.has(word))
    .map(word => (word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word));
}

function withoutAvoided(ideas: Record<MealSlot, MealIdea[]>, avoid: string[]): Record<MealSlot, MealIdea[]> {
  if (!avoid.length) return ideas;
  const safe = { ...ideas };
  for (const slot of Object.keys(safe) as MealSlot[]) {
    const kept = ideas[slot].filter(idea => !avoid.some(food => `${idea.name} ${idea.portion}`.toLowerCase().includes(food)));
    // Keep at least one idea per slot; the app reminds users to swap anything unsuitable.
    safe[slot] = kept.length ? kept : ideas[slot];
  }
  return safe;
}

function mealIdeas(dietType: DietPlanOptions['dietType']): Record<MealSlot, MealIdea[]> {
  if (dietType === 'vegan') return VEGAN;
  const withEggs = dietType === 'eggetarian' || dietType === 'non-vegetarian' || dietType === 'any';
  const withMeat = dietType === 'non-vegetarian' || dietType === 'any';
  const merged = { ...VEG };
  for (const slot of Object.keys(merged) as MealSlot[]) {
    merged[slot] = [...VEG[slot], ...(withEggs ? EGG[slot] ?? [] : []), ...(withMeat ? NON_VEG[slot] ?? [] : [])];
  }
  return merged;
}

export function fallbackDietPlan(context: WellnessPlanContext, options: DietPlanOptions): DietPlanContent {
  const dailyCalories = context.goal?.dailyCalorieTarget ?? 2000;
  const ideas = withoutAvoided(mealIdeas(options.dietType), avoidedFoods(context.memories));
  const slots: MealSlot[] = ['breakfast', 'lunch', 'snack', 'dinner'];
  const days = Array.from({ length: options.days }, (_, dayIndex) => ({
    label: options.days === 1 ? 'Your day' : DAY_NAMES[dayIndex],
    meals: slots.map(slot => {
      const idea = ideas[slot][dayIndex % ideas[slot].length];
      const calories = roundTo(dailyCalories * SPLIT[slot], 10);
      return { calories, name: idea.name, portion: idea.portion, proteinGrams: Math.round(calories * idea.proteinPerKcal), type: slot };
    }),
  }));
  const macros = context.goal?.macroTargets ?? {
    carbsGrams: Math.round((dailyCalories * 0.45) / 4),
    fatGrams: Math.round((dailyCalories * 0.27) / 9),
    proteinGrams: Math.round((dailyCalories * 0.28) / 4),
  };
  const who = context.profile ? `${context.profile.name.split(/\s+/)[0]}'s` : 'Your';
  return {
    dailyCalories,
    days,
    macros,
    summary: `A simple ${options.dietType === 'any' ? '' : `${options.dietType} `}${options.cuisine} plan built around about ${dailyCalories} kcal a day, with protein at every meal.`,
    tips: [
      'Fill half your plate with vegetables at lunch and dinner.',
      'Swap portions freely between days; the daily total matters more than any one meal.',
      'Drink water through the day and keep sugary drinks occasional.',
      // Food notes from the user's confirmed report (already safety-checked), so the template still reflects it.
      ...(context.healthNotes ?? []).filter(note => !/ is (low|high|critical)/.test(note)).slice(0, 3).map(note => note.slice(0, 200)),
    ],
    title: `${who} ${options.days}-day ${options.cuisine} meal plan`,
  };
}

const MOVES: Record<ExercisePlanOptions['location'], { cardio: string[]; lower: string[]; upper: string[] }> = {
  gym: {
    cardio: ['Incline treadmill walk', 'Rowing machine', 'Cycling (stationary bike)'],
    lower: ['Goblet squat', 'Romanian deadlift', 'Leg press', 'Walking lunges'],
    upper: ['Dumbbell bench press', 'Lat pulldown', 'Seated cable row', 'Dumbbell shoulder press'],
  },
  home: {
    cardio: ['Brisk walk or stair climbing', 'Jumping jacks', 'Mountain climbers'],
    lower: ['Bodyweight squats', 'Glute bridges', 'Reverse lunges', 'Wall sit'],
    upper: ['Push-ups (knees or wall if needed)', 'Chair tricep dips', 'Plank', 'Superman hold'],
  },
  outdoors: {
    cardio: ['Brisk walk or easy jog intervals', 'Hill or stair walk', 'Cycling'],
    lower: ['Bench step-ups', 'Walking lunges', 'Bodyweight squats', 'Calf raises'],
    upper: ['Incline push-ups on a bench', 'Bench dips', 'Plank', 'Bear crawl'],
  },
};

const TRAINING_DAYS: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

const VOLUME: Record<ExercisePlanOptions['level'], string> = { advanced: '4 sets × 12', beginner: '2 sets × 10', intermediate: '3 sets × 12' };

export function fallbackExercisePlan(context: WellnessPlanContext, options: ExercisePlanOptions): ExercisePlanContent {
  const moves = MOVES[options.location];
  const training = TRAINING_DAYS[options.daysPerWeek] ?? TRAINING_DAYS[3];
  const focuses = ['Full body strength', 'Cardio and core', 'Lower body and mobility', 'Upper body and core'];
  let session = 0;
  const days = DAY_NAMES.map((label, index) => {
    if (!training.includes(index)) {
      return { durationMinutes: 0, exercises: [{ detail: 'Optional, 10–20 min', name: 'Gentle stretching or a relaxed walk' }], focus: 'Rest and recover', label, rest: true };
    }
    const focus = focuses[session % focuses.length];
    // Consecutive picks from one list never repeat within a session (count ≤ list length).
    const pick = (list: string[], count: number) => Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(session + i) % list.length]);
    const strength = focus === 'Full body strength'
      ? [...pick(moves.lower, 2), ...pick(moves.upper, 2)]
      : pick(focus.startsWith('Lower') ? moves.lower : moves.upper, 4);
    const exercises = focus === 'Cardio and core'
      ? [{ detail: `${Math.round(options.minutesPerSession * 0.6)} min, comfortable pace`, name: moves.cardio[session % moves.cardio.length] }, ...pick(moves.upper, 2).map(name => ({ detail: '3 × 30–45 sec', name }))]
      : strength.map(name => ({ detail: VOLUME[options.level], name }));
    session += 1;
    return { durationMinutes: options.minutesPerSession, exercises: [{ detail: '5 min', name: 'Warm-up: marching, arm circles, hip openers' }, ...exercises], focus, label, rest: false };
  });
  const who = context.profile ? `${context.profile.name.split(/\s+/)[0]}'s` : 'Your';
  return {
    days,
    summary: `${options.daysPerWeek} ${options.level} ${options.location} sessions a week of about ${options.minutesPerSession} minutes, mixing strength and cardio with rest days in between.`,
    tips: [
      'Stop any exercise that causes sharp pain, and ease off if you feel dizzy.',
      'Add a few reps or minutes each week once a session feels easy.',
      'Keep up your daily steps on rest days.',
    ],
    title: `${who} ${options.daysPerWeek}-day ${options.location} workout plan`,
  };
}
