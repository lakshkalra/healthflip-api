import type { DailyInsight, MealEstimate } from '../../shared/ai/ai-provider.js';

export function serializeMealEstimate(estimate: MealEstimate) {
  return {
    assumptions: estimate.assumptions,
    caloriesKcal: estimate.caloriesKcal,
    carbsGrams: estimate.carbsGrams,
    confidence: estimate.confidence,
    fatGrams: estimate.fatGrams,
    name: estimate.name,
    proteinGrams: estimate.proteinGrams,
    source: estimate.source,
  };
}

export function serializeDailyInsight(insight: DailyInsight) {
  return {
    date: insight.date,
    message: insight.message,
    nextAction: insight.nextAction,
    source: insight.source,
  };
}
