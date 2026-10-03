import { z } from 'zod';

// Structured diet and exercise plans. One schema validates AI output, plans sent back to be saved,
// and what the PDF renderer receives.

const text = (max: number) => z.string().trim().min(1).max(max);

export const dietPlanOptionsSchema = z
  .object({
    cuisine: z.string().trim().min(2).max(40).default('Indian'),
    days: z.union([z.literal(1), z.literal(3), z.literal(7)]).default(7),
    dietType: z.enum(['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian', 'any']).default('any'),
    notes: z.string().trim().max(200).optional(),
    // Shape the plan around the latest confirmed lab report (when there is one).
    useHealthNotes: z.boolean().default(true),
  })
  .strict();

export const exercisePlanOptionsSchema = z
  .object({
    daysPerWeek: z.number().int().min(2).max(6).default(3),
    level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    location: z.enum(['home', 'gym', 'outdoors']).default('home'),
    minutesPerSession: z.number().int().min(15).max(90).default(30),
    notes: z.string().trim().max(200).optional(),
  })
  .strict();

export const dietPlanContentSchema = z
  .object({
    dailyCalories: z.number().int().min(800).max(6000),
    days: z
      .array(z.object({
        label: text(40),
        meals: z
          .array(z.object({
            calories: z.number().int().min(0).max(2500),
            name: text(80),
            portion: text(200),
            proteinGrams: z.number().min(0).max(250),
            type: z.enum(['breakfast', 'lunch', 'snack', 'dinner']),
          }).strict())
          .min(2)
          .max(6),
      }).strict())
      .min(1)
      .max(7),
    macros: z.object({
      carbsGrams: z.number().int().min(0).max(1000),
      fatGrams: z.number().int().min(0).max(1000),
      proteinGrams: z.number().int().min(0).max(1000),
    }).strict(),
    summary: text(400),
    tips: z.array(text(200)).max(6),
    title: text(120),
  })
  .strict();

export const exercisePlanContentSchema = z
  .object({
    days: z
      .array(z.object({
        durationMinutes: z.number().int().min(0).max(180),
        exercises: z.array(z.object({ detail: text(120), name: text(80) }).strict()).max(10),
        focus: text(60),
        label: text(40),
        rest: z.boolean(),
      }).strict())
      .min(1)
      .max(7),
    summary: text(400),
    tips: z.array(text(200)).max(6),
    title: text(120),
  })
  .strict();

export type DietPlanOptions = z.infer<typeof dietPlanOptionsSchema>;
export type ExercisePlanOptions = z.infer<typeof exercisePlanOptionsSchema>;
export type DietPlanContent = z.infer<typeof dietPlanContentSchema>;
export type ExercisePlanContent = z.infer<typeof exercisePlanContentSchema>;

export type PlanDraft =
  | { content: DietPlanContent; kind: 'diet'; options: DietPlanOptions; source: 'ai' | 'fallback' }
  | { content: ExercisePlanContent; kind: 'exercise'; options: ExercisePlanOptions; source: 'ai' | 'fallback' };
