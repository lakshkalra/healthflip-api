import { z } from 'zod';

import { dateSchema, timeZoneSchema } from '../../shared/validation.js';

export const dailyDashboardQueryValidator = z
  .object({
    date: dateSchema,
    timezone: timeZoneSchema.default('UTC'),
  })
  .strict();
