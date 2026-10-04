// Deterministic wellness baseline. The LLM personalises around it, and its output is clamped back to
// it, so recommendations stay in a sensible, explainable range.

export type Sex = 'female' | 'male' | 'unspecified';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active';
export type GoalType = 'lose' | 'maintain' | 'gain';

export type PlanProfile = {
  activityLevel: ActivityLevel;
  age: number;
  heightCm: number;
  sex: Sex;
  weightKg: number;
};

export type PlanTargets = {
  carbsGrams: number;
  dailyCalorieTarget: number;
  dailySteps: number;
  fatGrams: number;
  proteinGrams: number;
};

export type PlanBaseline = PlanTargets & {
  bmr: number;
  /** Lowest daily calories a plan may recommend for this person. */
  calorieFloor: number;
  tdee: number;
};

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = { active: 1.725, light: 1.375, moderate: 1.55, sedentary: 1.2 };
const ACTIVITY_STEPS: Record<ActivityLevel, number> = { active: 10_000, light: 7_500, moderate: 9_000, sedentary: 6_000 };
// Mifflin-St Jeor sex constant; "unspecified" uses the midpoint.
const SEX_CONSTANT: Record<Sex, number> = { female: -161, male: 5, unspecified: -78 };

export const CALORIE_TARGET_MIN = 800;
export const CALORIE_TARGET_MAX = 6000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const roundTo = (value: number, step: number) => Math.round(value / step) * step;

export function basalMetabolicRate(profile: PlanProfile): number {
  return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + SEX_CONSTANT[profile.sex];
}

/** Splits calories into macros: protein by body weight, 27% fat, carbs the remainder. */
export function macrosFor(calories: number, weightKg: number, goal: GoalType) {
  const proteinPerKg = goal === 'maintain' ? 1.6 : 1.8;
  const proteinGrams = Math.round(Math.min(weightKg * proteinPerKg, (calories * 0.35) / 4));
  const fatGrams = Math.round((calories * 0.27) / 9);
  const carbsGrams = Math.max(0, Math.round((calories - proteinGrams * 4 - fatGrams * 9) / 4));
  return { carbsGrams, fatGrams, proteinGrams };
}

export function planBaseline(profile: PlanProfile, goal: GoalType): PlanBaseline {
  const bmr = basalMetabolicRate(profile);
  const tdee = bmr * ACTIVITY_FACTOR[profile.activityLevel];
  const calorieFloor = Math.max(1200, roundTo(bmr, 50));
  const adjusted = goal === 'lose' ? Math.max(tdee - 500, calorieFloor) : goal === 'gain' ? tdee + 300 : tdee;
  const dailyCalorieTarget = clamp(roundTo(adjusted, 50), CALORIE_TARGET_MIN, CALORIE_TARGET_MAX);
  const dailySteps = Math.min(12_000, ACTIVITY_STEPS[profile.activityLevel] + (goal === 'lose' ? 1_500 : 0));

  return {
    ...macrosFor(dailyCalorieTarget, profile.weightKg, goal),
    bmr: Math.round(bmr),
    calorieFloor: Math.min(calorieFloor, dailyCalorieTarget),
    dailyCalorieTarget,
    dailySteps,
    tdee: Math.round(tdee),
  };
}
