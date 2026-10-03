import type { DailyInsight, MealEstimate } from '../../shared/ai/ai-provider.js';

export function serializeMealEstimate(estimate: MealEstimate) {
  return {
    assumptions: estimate.assumptions,
    caloriesKcal: estimate.caloriesKcal,
    carbsGrams: estimate.carbsGrams,
    confidence: estimate.confidence,
    fatGrams: estimate.fatGrams,
    healthTip: estimate.healthTip || null,
    items: estimate.items.map(item => ({
      caloriesKcal: item.caloriesKcal,
      carbsGrams: oneDecimal(item.carbsGrams),
      fatGrams: oneDecimal(item.fatGrams),
      grams: item.grams,
      name: item.name,
      proteinGrams: oneDecimal(item.proteinGrams),
    })),
    name: estimate.name,
    proteinGrams: estimate.proteinGrams,
    source: estimate.source,
  };
}

const oneDecimal = (value: number | null) => (value === null ? null : Math.round(value * 10) / 10);

export function serializeDailyInsight(insight: DailyInsight) {
  return {
    date: insight.date,
    message: insight.message,
    nextAction: insight.nextAction,
    source: insight.source,
  };
}
