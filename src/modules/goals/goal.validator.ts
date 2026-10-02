import { z } from 'zod';

import { dateSchema } from '../../shared/validation.js';

export const goalTypeValidator = z.enum(['lose', 'maintain', 'gain']);

export const replaceGoalValidator = z
  .object({
    dailyCalorieTarget: z.number().int().min(800).max(6000),
    startsOn: dateSchema.optional(),
    type: goalTypeValidator,
  })
  .strict();

export type ReplaceGoalInput = z.infer<typeof replaceGoalValidator>;
