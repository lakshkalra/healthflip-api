import type { FoodRecord } from '../../db/repositories/food.repository.js';

export function serializeFood(food: FoodRecord) {
  return {
    caloriesKcal: food.caloriesKcal,
    carbsGrams: food.carbsGrams,
    fatGrams: food.fatGrams,
    id: food.id,
    lastUsedAt: food.lastUsedAt.toISOString(),
    name: food.name,
    proteinGrams: food.proteinGrams,
    serving: food.serving,
    timesUsed: food.timesUsed,
  };
}
