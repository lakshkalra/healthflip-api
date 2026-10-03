import { z } from 'zod';

export const memoryCategoryValidator = z.enum(['diet', 'allergy', 'preference', 'routine', 'goal', 'other']);

export const createMemoryValidator = z
  .object({
    category: memoryCategoryValidator.default('other'),
    text: z.string().trim().min(2).max(200),
  })
  .strict();

export const memoryParamsValidator = z.object({ id: z.string().uuid() }).strict();

export type CreateMemoryInput = z.infer<typeof createMemoryValidator>;
