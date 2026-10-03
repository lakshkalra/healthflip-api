import { z } from 'zod';

import { dateSchema, timeZoneSchema } from '../../shared/validation.js';
import { mealTypeValidator } from '../meals/meal.validator.js';

export const mealEstimateValidator = z
  .object({
    description: z.string().trim().min(3).max(500),
    mealType: mealTypeValidator.optional(),
  })
  .strict();

export const imageMealEstimateValidator = z
  .object({
    imageBase64: z
      .string()
      .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Provide a valid base64 image.')
      .max(2_000_000, 'Image must be smaller than 1.5 MB after encoding.'),
    mealType: mealTypeValidator.optional(),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  })
  .strict();

export const dailyInsightQueryValidator = z
  .object({
    date: dateSchema,
    timezone: timeZoneSchema.default('UTC'),
  })
  .strict();

export const liveSessionValidator = z
  .object({
    date: dateSchema.default(() => new Date().toISOString().slice(0, 10)),
    timezone: timeZoneSchema.default('UTC'),
  })
  .strict();

export type MealEstimateInput = z.infer<typeof mealEstimateValidator>;
