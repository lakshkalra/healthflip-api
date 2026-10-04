import { z } from 'zod';

import { dietPlanContentSchema, dietPlanOptionsSchema, exercisePlanContentSchema, exercisePlanOptionsSchema } from '../../domain/plans.js';

export const generatePlanValidator = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('diet'), options: dietPlanOptionsSchema.prefault({}) }).strict(),
  z.object({ kind: z.literal('exercise'), options: exercisePlanOptionsSchema.prefault({}) }).strict(),
]);

// Saving accepts a generated draft back; its content is re-validated, never trusted.
export const savePlanValidator = z.discriminatedUnion('kind', [
  z.object({ content: dietPlanContentSchema, kind: z.literal('diet'), options: dietPlanOptionsSchema, source: z.enum(['ai', 'fallback']) }).strict(),
  z.object({ content: exercisePlanContentSchema, kind: z.literal('exercise'), options: exercisePlanOptionsSchema, source: z.enum(['ai', 'fallback']) }).strict(),
]);

export const planParamsValidator = z.object({ id: z.string().uuid() }).strict();

export type GeneratePlanInput = z.infer<typeof generatePlanValidator>;
export type SavePlanInput = z.infer<typeof savePlanValidator>;
