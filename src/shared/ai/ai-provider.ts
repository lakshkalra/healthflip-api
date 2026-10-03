export type AiSource = 'ai' | 'fallback';
export type AiConfidence = 'low' | 'medium' | 'high';

export type MealEstimateInput = {
  description: string;
  mealType?: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
};

export type ImageMealEstimateInput = {
  imageBase64: string;
  mealType?: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
};

export type MealEstimate = {
  assumptions: string[];
  caloriesKcal: number;
  carbsGrams: number | null;
  confidence: AiConfidence;
  fatGrams: number | null;
  name: string;
  proteinGrams: number | null;
  source: AiSource;
};

export type DailyInsightContext = {
  date: string;
  goal: { dailyCalorieTarget: number; type: 'lose' | 'maintain' | 'gain' } | null;
  meals: Array<{
    caloriesKcal: number | null;
    carbsGrams: number | null;
    fatGrams: number | null;
    name: string;
    proteinGrams: number | null;
  }>;
  timezone: string;
  totalCalories: number;
};

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
