import { z } from 'zod';

import { dateSchema } from '../../shared/validation.js';

export const waterTargetValidator = z
  .object({
    source: z.enum(['user', 'report']).default('user'),
    targetMl: z.number().int().min(500).max(6000).nullable(),
  })
  .strict();

export const logWaterValidator = z
  .object({
    amountMl: z.number().int().min(50).max(2000),
    date: dateSchema,
  })
  .strict();

export const waterDayValidator = z.object({ date: dateSchema }).strict();
