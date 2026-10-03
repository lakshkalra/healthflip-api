import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import type { MealRepository } from '../../db/repositories/meal.repository.js';
import { AiProviderError, type AiProvider, type ImageMealEstimateInput, type LiveSessionProvider } from '../../shared/ai/ai-provider.js';
import { AppError } from '../../shared/errors.js';
import { getDayRangeUtc } from '../../shared/time.js';
import { guardDailyInsightOutput, guardImageInput, guardMealDescription, guardMealEstimateOutput } from './ai.guardrails.js';
import { serializeDailyInsight, serializeMealEstimate } from './ai.helper.js';
import type { MealEstimateInput } from './ai.validator.js';

export function createAiService(
  goalRepository: GoalRepository,
  mealRepository: MealRepository,
  provider: AiProvider,
  liveSessionProvider: LiveSessionProvider,
) {
  return {
    async estimateMeal(input: MealEstimateInput) {
      const description = guardMealDescription(input.description);
      try {
        return serializeMealEstimate(guardMealEstimateOutput(await provider.estimateMeal({ ...input, description })));
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async estimateMealFromImage(input: ImageMealEstimateInput) {
      guardImageInput(input);
      try {
        return serializeMealEstimate(guardMealEstimateOutput(await provider.estimateMealFromImage(input)));
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async getDailyInsight(guestId: string, date: string, timezone: string) {
      const context = await loadDailyContext(guestId, date, timezone, goalRepository, mealRepository);

      try {
        return serializeDailyInsight(
          guardDailyInsightOutput(await provider.dailyInsight(context)),
        );
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async createLiveSession(guestId: string, date: string, timezone: string) {
      const context = await loadDailyContext(guestId, date, timezone, goalRepository, mealRepository);
      try {
        return await liveSessionProvider.createSession(context);
      } catch (error) {
        throw mapProviderError(error);
      }
    },
  };
}

async function loadDailyContext(
  guestId: string,
  date: string,
  timezone: string,
  goalRepository: GoalRepository,
  mealRepository: MealRepository,
) {
  const range = getDayRangeUtc(date, timezone);
  const [goal, summary] = await Promise.all([
    goalRepository.findCurrent(guestId),
    mealRepository.getDailySummary(guestId, range.start, range.end),
  ]);

  return {
    date,
    goal: goal ? { dailyCalorieTarget: goal.dailyCalorieTarget, type: goal.type } : null,
    meals: summary.meals.map(meal => ({
      caloriesKcal: meal.caloriesKcal,
      carbsGrams: meal.carbsGrams,
      fatGrams: meal.fatGrams,
      name: meal.name,
      proteinGrams: meal.proteinGrams,
    })),
    timezone,
    totalCalories: summary.totalCalories,
  };
}

function mapProviderError(error: unknown): AppError {
  if (!(error instanceof AiProviderError)) {
    return new AppError('AI_OPERATION_FAILED', 503, 'The AI operation is temporarily unavailable.');
  }

  const statusCode =
    error.code === 'AI_PROVIDER_QUOTA_EXCEEDED'
      ? 429
      : error.code === 'AI_PROVIDER_TIMEOUT'
        ? 504
        : error.code === 'AI_OUTPUT_INVALID'
          ? 502
          : 503;

  return new AppError(error.code, statusCode, error.message);
}
