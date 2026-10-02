import { z } from 'zod';

import { dateSchema, timeZoneSchema } from '../../shared/validation.js';
import { mealTypeValidator } from '../meals/meal.validator.js';

export const mealEstimateValidator = z
  .object({
    description: z.string().trim().min(3).max(500),
    mealType: mealTypeValidator.optional(),
  })
  .strict();

export const dailyInsightQueryValidator = z
  .object({
    date: dateSchema,
    timezone: timeZoneSchema.default('UTC'),
  })
  .strict();

export type MealEstimateInput = z.infer<typeof mealEstimateValidator>;
