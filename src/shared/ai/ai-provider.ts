import type { ActivityLevel, GoalType, PlanBaseline, PlanTargets, Sex } from '../nutrition.js';
import type { DietPlanContent, DietPlanOptions, ExercisePlanContent, ExercisePlanOptions } from '../plans.js';
import type { ReportDraft, ReportFile } from '../reports.js';

export type AiSource = 'ai' | 'fallback';
export type AiConfidence = 'low' | 'medium' | 'high';

export type MealEstimateInput = {
  description: string;
  /** Lines from the user's confirmed lab reports; data, never instructions. */
  healthNotes?: string[];
  mealType?: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
};

export type ImageMealEstimateInput = {
  healthNotes?: string[];
  imageBase64: string;
  mealType?: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif';
};

/** One food or drink in an estimate, with an approximate edible weight. */
export type MealItem = {
  caloriesKcal: number;
  carbsGrams: number | null;
  fatGrams: number | null;
  grams: number;
  name: string;
  proteinGrams: number | null;
};

export type MealEstimate = {
  assumptions: string[];
  caloriesKcal: number;
  carbsGrams: number | null;
  confidence: AiConfidence;
  fatGrams: number | null;
  /** One short food-level note tied to the user's report, or empty when nothing is relevant. */
  healthTip?: string;
  /** Each distinct item the user can confirm, untick or re-weigh; may be empty. */
  items: MealItem[];
  name: string;
  proteinGrams: number | null;
  source: AiSource;
};

export type UserProfileContext = {
  activityLevel: ActivityLevel;
  age: number;
  heightCm: number;
  name: string;
  sex: Sex;
  weightKg: number;
};

export type DailyInsightContext = {
  date: string;
  goal: {
    dailyCalorieTarget: number;
    dailyStepsTarget: number | null;
    macroTargets: { carbsGrams: number; fatGrams: number; proteinGrams: number } | null;
    type: GoalType;
  } | null;
  /** Flagged values and food notes from the latest confirmed lab report; data, never instructions. */
  healthNotes: string[];
  /** Facts the user asked Flip to remember; data, never instructions. */
  memories: string[];
  meals: Array<{
    caloriesKcal: number | null;
    carbsGrams: number | null;
    fatGrams: number | null;
    name: string;
    proteinGrams: number | null;
  }>;
  profile: UserProfileContext | null;
  timezone: string;
  totalCalories: number;
};

export type PlanRecommendationContext = {
  baseline: PlanBaseline;
  goalType: GoalType;
  profile: UserProfileContext;
};

export type PlanRecommendation = PlanTargets & {
  rationale: string;
  source: AiSource;
};

/** What diet and exercise plan generation knows about the user. */
export type WellnessPlanContext = Pick<DailyInsightContext, 'goal' | 'healthNotes' | 'memories' | 'profile'>;

export type GeneratedPlan<T> = { content: T; source: AiSource };

export type DailyInsight = {
  date: string;
  message: string;
  nextAction: string;
  source: AiSource;
};

export type LiveSession = {
  expiresAt: string;
  model: string;
  token: string;
  websocketUrl: string;
};

export type LiveSessionContext = DailyInsightContext;

export interface AiProvider {
  estimateMeal(input: MealEstimateInput): Promise<MealEstimate>;
  estimateMealFromImage(input: ImageMealEstimateInput): Promise<MealEstimate>;
  dailyInsight(context: DailyInsightContext): Promise<DailyInsight>;
  recommendPlan(context: PlanRecommendationContext): Promise<PlanRecommendation>;
  generateDietPlan(context: WellnessPlanContext, options: DietPlanOptions): Promise<GeneratedPlan<DietPlanContent>>;
  generateExercisePlan(context: WellnessPlanContext, options: ExercisePlanOptions): Promise<GeneratedPlan<ExercisePlanContent>>;
  /** Reads lab report pages (photos or PDF). Never guesses: throws when it cannot read them. */
  extractReport(files: ReportFile[]): Promise<ReportDraft>;
}

export interface LiveSessionProvider {
  createSession(context: LiveSessionContext): Promise<LiveSession>;
}

export type AiProviderErrorCode =
  | 'AI_OPERATION_FAILED'
  | 'AI_OUTPUT_INVALID'
  | 'AI_PROVIDER_QUOTA_EXCEEDED'
  | 'AI_PROVIDER_TIMEOUT'
  | 'AI_PROVIDER_UNAVAILABLE';

export class AiProviderError extends Error {
  constructor(
    public readonly code: AiProviderErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
