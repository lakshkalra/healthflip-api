import { z } from 'zod';

const macro = z.number().min(0).max(5_000).nullable().optional();

export const saveFoodValidator = z
  .object({
    caloriesKcal: z.number().int().min(0).max(20_000),
    carbsGrams: macro,
    fatGrams: macro,
    name: z.string().trim().min(1).max(120),
    proteinGrams: macro,
    serving: z.string().trim().min(1).max(200).default('1 serving'),
  })
  .strict();

export const foodParamsValidator = z.object({ id: z.string().uuid() }).strict();

export type SaveFoodInput = z.infer<typeof saveFoodValidator>;
