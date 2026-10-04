import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import type { HealthReportRepository } from '../../db/repositories/health-report.repository.js';
import type { MealRepository } from '../../db/repositories/meal.repository.js';
import type { MemoryRepository } from '../../db/repositories/memory.repository.js';
import type { ProfileRepository } from '../../db/repositories/profile.repository.js';
import { AiProviderError, type AiProvider, type DailyInsightContext, type ImageMealEstimateInput, type LiveSessionProvider } from '../../shared/ai/ai-provider.js';
import { fallbackPlan } from '../../shared/ai/fallback/fallback-provider.js';
import { AppError } from '../../shared/errors.js';
import { planBaseline, type GoalType } from '../../domain/nutrition.js';
import { healthNotesFrom } from '../../domain/reports.js';
import { getDayRangeUtc } from '../../shared/time.js';
import { serializePlanTargets } from '../goals/goal.helper.js';
import { toProfileContext } from '../profile/profile.helper.js';
import { guardDailyInsightOutput, guardImageInput, guardMealDescription, guardMealEstimateOutput, guardPlanOutput } from './ai.guardrails.js';
import { serializeDailyInsight, serializeMealEstimate } from './ai.helper.js';
import type { MealEstimateInput } from './ai.validator.js';

export function createAiService(
  goalRepository: GoalRepository,
  mealRepository: MealRepository,
  provider: AiProvider,
  liveSessionProvider: LiveSessionProvider,
  profileRepository: ProfileRepository,
  memoryRepository: MemoryRepository,
  healthReportRepository: HealthReportRepository,
) {
  const repositories = { goalRepository, healthReportRepository, mealRepository, memoryRepository, profileRepository };
  const notesFor = async (guestId: string) => healthNotesFrom(await healthReportRepository.latest(guestId));

  return {
    async estimateMeal(guestId: string, input: MealEstimateInput) {
      const description = guardMealDescription(input.description);
      const healthNotes = await notesFor(guestId);
      try {
        return serializeMealEstimate(guardMealEstimateOutput(await provider.estimateMeal({ ...input, description, healthNotes })));
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async estimateMealFromImage(guestId: string, input: ImageMealEstimateInput) {
      guardImageInput(input);
      const healthNotes = await notesFor(guestId);
      try {
        return serializeMealEstimate(guardMealEstimateOutput(await provider.estimateMealFromImage({ ...input, healthNotes })));
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async getDailyInsight(guestId: string, date: string, timezone: string) {
      const context = await loadDailyContext(guestId, date, timezone, repositories);

      try {
        return serializeDailyInsight(
          guardDailyInsightOutput(await provider.dailyInsight(context)),
        );
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    async createLiveSession(guestId: string, date: string, timezone: string) {
      const context = await loadDailyContext(guestId, date, timezone, repositories);
      try {
        return await liveSessionProvider.createSession(context);
      } catch (error) {
        throw mapProviderError(error);
      }
    },

    // Onboarding must not stall on AI quota or outages, so any provider failure returns the
    // deterministic baseline plan instead of an error.
    async recommendPlan(guestId: string, goalType: GoalType) {
      const record = await profileRepository.find(guestId);
      if (!record) {
        throw new AppError('PROFILE_REQUIRED', 409, 'Tell Flip a little about yourself before getting a plan.');
      }
      const profile = toProfileContext(record);
      const baseline = planBaseline(profile, goalType);
      const context = { baseline, goalType, profile };
      try {
        return guardPlanOutput(await provider.recommendPlan(context), baseline);
      } catch {
        return guardPlanOutput(fallbackPlan(context), baseline);
      }
    },
  };
}


const CONTEXT_MEMORY_LIMIT = 30;

async function loadDailyContext(
  guestId: string,
  date: string,
  timezone: string,
  { goalRepository, healthReportRepository, mealRepository, memoryRepository, profileRepository }: {
    goalRepository: GoalRepository;
    healthReportRepository: HealthReportRepository;
    mealRepository: MealRepository;
    memoryRepository: MemoryRepository;
    profileRepository: ProfileRepository;
  },
): Promise<DailyInsightContext> {
  const range = getDayRangeUtc(date, timezone);
  const [goal, summary, profile, memories, report] = await Promise.all([
    goalRepository.findCurrent(guestId),
    mealRepository.getDailySummary(guestId, range.start, range.end),
    profileRepository.find(guestId),
    memoryRepository.list(guestId, CONTEXT_MEMORY_LIMIT),
    healthReportRepository.latest(guestId),
  ]);
  const targets = goal ? serializePlanTargets(goal) : null;

  return {
    date,
    goal: goal && targets
      ? { dailyCalorieTarget: goal.dailyCalorieTarget, dailyStepsTarget: targets.dailyStepsTarget, macroTargets: targets.macroTargets, type: goal.type }
      : null,
    healthNotes: healthNotesFrom(report),
    memories: memories.map(memory => memory.text),
    profile: profile ? toProfileContext(profile) : null,
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

export function mapProviderError(error: unknown): AppError {
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
