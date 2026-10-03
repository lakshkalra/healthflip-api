import { z } from 'zod';

import { AiProviderError, type DailyInsight, type ImageMealEstimateInput, type MealEstimate } from '../../shared/ai/ai-provider.js';
import { AppError } from '../../shared/errors.js';

const MAX_IMAGE_BASE64_LENGTH = 2_000_000;
const MAX_IMAGE_BYTES = 1_500_000;

const blockedRequestPatterns = [
  /ignore\s+(all|any|the|previous)\s+instructions?/i,
  /(?:system|developer)\s+(?:prompt|message|instruction)/i,
  /\b(?:diagnos(?:e|is)|prescri(?:be|ption)|medication|medicine|drug|dosage|insulin|cancer|anorexia|bulimia|purge)\b/i,
];

const mealEstimateOutputValidator = z
  .object({
    assumptions: z.array(z.string().trim().min(1).max(240)).min(1).max(5),
    caloriesKcal: z.number().int().min(0).max(100_000),
    carbsGrams: z.number().min(0).max(100_000).nullable(),
    confidence: z.enum(['low', 'medium', 'high']),
    fatGrams: z.number().min(0).max(100_000).nullable(),
    name: z.string().trim().min(1).max(120),
    proteinGrams: z.number().min(0).max(100_000).nullable(),
    source: z.enum(['ai', 'fallback']),
  })
  .strict();

const dailyInsightOutputValidator = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    message: z.string().trim().min(1).max(500),
    nextAction: z.string().trim().min(1).max(300),
    source: z.enum(['ai', 'fallback']),
  })
  .strict();

export function guardMealDescription(description: string): string {
  const normalized = description.trim().replace(/\s+/g, ' ');
  if (blockedRequestPatterns.some(pattern => pattern.test(normalized))) {
    throw new AppError(
      'AI_SAFETY_BLOCKED',
      422,
      'Kimbo can estimate meals and offer general wellness guidance, but cannot diagnose conditions or advise on medication.',
    );
  }
  return normalized;
}

export function guardImageInput(input: ImageMealEstimateInput): void {
  if (input.imageBase64.length > MAX_IMAGE_BASE64_LENGTH || Math.ceil(input.imageBase64.length * 0.75) >= MAX_IMAGE_BYTES) {
    throw new AppError('AI_IMAGE_TOO_LARGE', 413, 'That image is too large. Choose a smaller meal photo and try again.');
  }
}

export function guardMealEstimateOutput(output: unknown): MealEstimate {
  const parsed = mealEstimateOutputValidator.safeParse(output);
  if (!parsed.success) {
    throw new AiProviderError('AI_OUTPUT_INVALID', 'The AI returned an invalid meal estimate.', parsed.error.flatten());
  }
  return parsed.data;
}

export function guardDailyInsightOutput(output: unknown): DailyInsight {
  const parsed = dailyInsightOutputValidator.safeParse(output);
  if (!parsed.success) {
    throw new AiProviderError('AI_OUTPUT_INVALID', 'The AI returned an invalid wellness insight.', parsed.error.flatten());
  }
  return parsed.data;
}
