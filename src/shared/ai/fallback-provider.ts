import type {
  AiProvider,
  DailyInsight,
  DailyInsightContext,
  MealEstimate,
  MealEstimateInput,
} from './ai-provider.js';

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

    async dailyInsight(context) {
      return dailyInsight(context);
    },
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
