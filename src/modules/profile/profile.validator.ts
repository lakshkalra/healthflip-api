import { z } from 'zod';

export const sexValidator = z.enum(['female', 'male', 'unspecified']);
export const activityLevelValidator = z.enum(['sedentary', 'light', 'moderate', 'active']);

// Mirrors the guest_profiles check constraints; calorie guidance is adults-only.
export const upsertProfileValidator = z
  .object({
    activityLevel: activityLevelValidator,
    age: z.number().int().min(18, 'healthFlip plans are for adults (18+).').max(100),
    heightCm: z.number().min(120).max(230),
    name: z.string().trim().min(1).max(60),
    sex: sexValidator,
    weightKg: z.number().min(30).max(300),
  })
  .strict();

export type UpsertProfileInput = z.infer<typeof upsertProfileValidator>;
