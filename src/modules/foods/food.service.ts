import type { FoodRepository } from '../../db/repositories/food.repository.js';
import { notFound } from '../../shared/errors.js';
import { serializeFood } from './food.helper.js';
import type { SaveFoodInput } from './food.validator.js';

export const MAX_FOODS_PER_GUEST = 200;

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim();

export function createFoodService(foodRepository: FoodRepository) {
  return {
    async list(guestId: string) {
      return (await foodRepository.list(guestId)).map(serializeFood);
    },

    // Saving a meal with an existing name refreshes it and moves it to the top; past the cap the least recent go.
    async save(guestId: string, input: SaveFoodInput) {
      const result = await foodRepository.upsert(guestId, {
        caloriesKcal: input.caloriesKcal,
        carbsGrams: input.carbsGrams ?? null,
        fatGrams: input.fatGrams ?? null,
        name: tidy(input.name),
        proteinGrams: input.proteinGrams ?? null,
        serving: tidy(input.serving),
      });
      if (result.created) await foodRepository.trim(guestId, MAX_FOODS_PER_GUEST);
      return { created: result.created, food: serializeFood(result.food) };
    },

    async delete(guestId: string, id: string) {
      if (!(await foodRepository.delete(guestId, id))) throw notFound('Food');
    },
  };
}
