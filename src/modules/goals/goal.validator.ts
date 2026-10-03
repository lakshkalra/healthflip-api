import { z } from 'zod';

import { dateSchema } from '../../shared/validation.js';

export const goalTypeValidator = z.enum(['lose', 'maintain', 'gain']);

export const replaceGoalValidator = z
  .object({
    dailyCalorieTarget: z.number().int().min(800).max(6000),
    startsOn: dateSchema.optional(),
    type: goalTypeValidator,
    // Optional plan targets from a recommendation; manual goals omit them.
    proteinTargetGrams: z.number().int().min(0).max(1_000).nullable().optional(),
    carbsTargetGrams: z.number().int().min(0).max(1_000).nullable().optional(),
    fatTargetGrams: z.number().int().min(0).max(1_000).nullable().optional(),
    dailyStepsTarget: z.number().int().min(1_000).max(50_000).nullable().optional(),
    planRationale: z.string().trim().max(400).nullable().optional(),
  })
  .strict();

export type ReplaceGoalInput = z.infer<typeof replaceGoalValidator>;
