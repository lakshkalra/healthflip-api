import type {
  CreateMealRecord,
  MealRepository,
  UpdateMealRecord,
} from '../../db/repositories/meal.repository.js';
import { notFound } from '../../shared/errors.js';
import type { CreateMealInput, UpdateMealInput } from './meal.validator.js';

export async function requireMeal(mealRepository: MealRepository, guestId: string, mealId: string) {
  const meal = await mealRepository.findActiveById(guestId, mealId);

  if (!meal) {
    throw notFound('Meal');
  }

  return meal;
}

export function toCreateMealRecord(input: CreateMealInput): CreateMealRecord {
  return { ...input, loggedAt: new Date(input.loggedAt) };
}

export function toUpdateMealRecord(input: UpdateMealInput): UpdateMealRecord {
  return {
    ...input,
    loggedAt: input.loggedAt ? new Date(input.loggedAt) : undefined,
  };
}

export function serializeMeal(meal: {
  caloriesKcal: number | null;
  carbsGrams: number | null;
  createdAt: Date;
  fatGrams: number | null;
  id: string;
  loggedAt: Date;
  name: string;
  note: string | null;
  proteinGrams: number | null;
  source: 'manual' | 'photo' | 'voice';
  updatedAt: Date;
}) {
  return {
    caloriesKcal: meal.caloriesKcal,
    carbsGrams: meal.carbsGrams,
    createdAt: meal.createdAt.toISOString(),
    fatGrams: meal.fatGrams,
    id: meal.id,
    loggedAt: meal.loggedAt.toISOString(),
    name: meal.name,
    note: meal.note,
    proteinGrams: meal.proteinGrams,
    source: meal.source,
    updatedAt: meal.updatedAt.toISOString(),
  };
}
