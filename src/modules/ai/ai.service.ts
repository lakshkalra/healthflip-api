import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import type { MealRepository } from '../../db/repositories/meal.repository.js';
import { AiProviderError, type AiProvider } from '../../shared/ai/ai-provider.js';
import { AppError } from '../../shared/errors.js';
import { getDayRangeUtc } from '../../shared/time.js';
import { serializeDailyInsight, serializeMealEstimate } from './ai.helper.js';
import type { MealEstimateInput } from './ai.validator.js';

export function createAiService(
  goalRepository: GoalRepository,
  mealRepository: MealRepository,
  provider: AiProvider,
) {
  return {
    async estimateMeal(input: MealEstimateInput) {
      try {
        return serializeMealEstimate(await provider.estimateMeal(input));
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async getDailyInsight(guestId: string, date: string, timezone: string) {
      const range = getDayRangeUtc(date, timezone);
      const [goal, summary] = await Promise.all([
        goalRepository.findCurrent(guestId),
        mealRepository.getDailySummary(guestId, range.start, range.end),
      ]);

      try {
        return serializeDailyInsight(
          await provider.dailyInsight({
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
          }),
        );
      } catch (error) {
        throw mapProviderError(error);
      }
    },
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
