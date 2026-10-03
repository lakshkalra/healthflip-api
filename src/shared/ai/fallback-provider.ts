import {
  AiProviderError,
  type AiProvider,
  type DailyInsight,
  type DailyInsightContext,
  type ImageMealEstimateInput,
  type MealEstimate,
  type MealEstimateInput,
  type PlanRecommendation,
  type PlanRecommendationContext,
} from './ai-provider.js';
import { fallbackDietPlan, fallbackExercisePlan } from './fallback-plans.js';

const fallbackProfiles = [
  { words: ['egg', 'paneer', 'tofu', 'chicken', 'fish', 'dal'], caloriesKcal: 420, proteinGrams: 24, carbsGrams: 38, fatGrams: 16 },
  { words: ['rice', 'pasta', 'noodle', 'roti', 'bread', 'oat'], caloriesKcal: 390, proteinGrams: 12, carbsGrams: 62, fatGrams: 10 },
  { words: ['salad', 'vegetable', 'fruit', 'banana', 'apple'], caloriesKcal: 240, proteinGrams: 6, carbsGrams: 38, fatGrams: 7 },
  { words: ['water', 'tea', 'coffee'], caloriesKcal: 30, proteinGrams: 0, carbsGrams: 5, fatGrams: 0 },
] as const;

export function createFallbackProvider(): AiProvider {
  return {
    async estimateMeal(input) {
      return estimateMeal(input);
    },

    async estimateMealFromImage(input) {
      return estimateMealFromImage(input);
    },

    async dailyInsight(context) {
      return dailyInsight(context);
    },

    async recommendPlan(context) {
      return fallbackPlan(context);
    },

    async generateDietPlan(context, options) {
      return { content: fallbackDietPlan(context, options), source: 'fallback' };
    },

    async generateExercisePlan(context, options) {
      return { content: fallbackExercisePlan(context, options), source: 'fallback' };
    },

    // Health values must come from the report itself, so there is no local stand-in.
    async extractReport() {
      throw new AiProviderError('AI_PROVIDER_UNAVAILABLE', 'Flip can’t read reports right now. Please try again later.');
    },
  };
}

// The deterministic baseline with a plain-language explanation; also used when the AI is unavailable.
export function fallbackPlan({ baseline, goalType, profile }: PlanRecommendationContext): PlanRecommendation {
  const direction = goalType === 'lose' ? 'a gentle deficit' : goalType === 'gain' ? 'a modest surplus' : 'maintenance';
  return {
    carbsGrams: baseline.carbsGrams,
    dailyCalorieTarget: baseline.dailyCalorieTarget,
    dailySteps: baseline.dailySteps,
    fatGrams: baseline.fatGrams,
    proteinGrams: baseline.proteinGrams,
    rationale: `Hi ${profile.name}! Based on your size and ${profile.activityLevel} activity, this sets ${direction} with steady protein and an achievable step goal. Adjust it anytime.`,
    source: 'fallback',
  };
}

function estimateMealFromImage(input: ImageMealEstimateInput): MealEstimate {
  const category = input.mealType ? input.mealType + ' ' : '';

  return {
    assumptions: [
      'This is a rough wellness estimate; the local provider cannot identify ingredients from images yet.',
      category ? 'Meal category: ' + input.mealType + '.' : 'Meal category was not provided.',
      'Review the estimate and adjust the portion before saving.',
    ],
    caloriesKcal: 350,
    carbsGrams: 45,
    confidence: 'low',
    fatGrams: 12,
    // The local provider cannot see the food, so there is nothing to itemise.
    items: [],
    name: category ? category + 'meal photo' : 'Meal photo',
    proteinGrams: 15,
    source: 'fallback',
  };
}

function estimateMeal(input: MealEstimateInput): MealEstimate {
  const description = input.description.trim().replace(/\s+/g, ' ');
  const lower = description.toLowerCase();
  const profile = fallbackProfiles.find(candidate => candidate.words.some(word => lower.includes(word))) ?? {
    caloriesKcal: 350,
    proteinGrams: 15,
    carbsGrams: 45,
    fatGrams: 12,
  };

  return {
    assumptions: [
      'This is a rough wellness estimate based only on the description.',
      input.mealType ? 'Meal category: ' + input.mealType + '.' : 'Portion size was not provided.',
    ],
    caloriesKcal: profile.caloriesKcal,
    carbsGrams: profile.carbsGrams,
    confidence: 'low',
    fatGrams: profile.fatGrams,
    items: [{ caloriesKcal: profile.caloriesKcal, carbsGrams: profile.carbsGrams, fatGrams: profile.fatGrams, grams: 250, name: description.slice(0, 80), proteinGrams: profile.proteinGrams }],
    name: description.slice(0, 120),
    proteinGrams: profile.proteinGrams,
    source: 'fallback',
  };
}

function dailyInsight(context: DailyInsightContext): DailyInsight {
  const mealCount = context.meals.length;
  const target = context.goal?.dailyCalorieTarget;

  if (!mealCount) {
    return {
      date: context.date,
      message: 'You have not logged a meal yet today. A simple first entry is enough to start your pattern.',
      nextAction: 'Log your next meal, even if the estimate is approximate.',
      source: 'fallback',
    };
  }

  if (target !== undefined && context.totalCalories > target) {
    return {
      date: context.date,
      message: 'You have logged ' + mealCount + ' ' + (mealCount === 1 ? 'meal' : 'meals') + ' today. One higher day does not define your overall pattern.',
      nextAction: 'Return to your usual routine at the next meal without compensating aggressively.',
      source: 'fallback',
    };
  }

  return {
    date: context.date,
    message: 'You have logged ' + mealCount + ' ' + (mealCount === 1 ? 'meal' : 'meals') + ' today and are building a useful record.',
    nextAction: 'Keep logging normally and include a protein or fiber source when practical.',
    source: 'fallback',
  };
}
