import type { MealRepository } from '../../db/repositories/meal.repository.js';
import { notFound } from '../../shared/errors.js';
import { requireMeal, serializeMeal, toCreateMealRecord, toUpdateMealRecord } from './meal.helper.js';
import type { CreateMealInput, UpdateMealInput } from './meal.validator.js';

export function createMealService(mealRepository: MealRepository) {
  return {
    async create(guestId: string, input: CreateMealInput) {
      return serializeMeal(await mealRepository.create(guestId, toCreateMealRecord(input)));
    },

    async delete(guestId: string, mealId: string) {
      await requireMeal(mealRepository, guestId, mealId);
      await mealRepository.softDelete(guestId, mealId);
    },

    async list(guestId: string, range: { end: Date; start: Date }) {
      const meals = await mealRepository.list(guestId, range.start, range.end);
      return meals.map(serializeMeal);
    },

    async update(guestId: string, mealId: string, input: UpdateMealInput) {
      await requireMeal(mealRepository, guestId, mealId);
      return serializeMeal(await mealRepository.update(guestId, mealId, toUpdateMealRecord(input)));
    },
  };
}
