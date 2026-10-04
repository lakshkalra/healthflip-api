import { z } from 'zod';

import { AiProviderError, type DailyInsight, type ImageMealEstimateInput, type MealEstimate, type PlanRecommendation } from '../../shared/ai/ai-provider.js';
import type { PlanBaseline } from '../../domain/nutrition.js';
import { hasFlaggedFluidMarker, reportDraftSchema, type ReportDraft } from '../../domain/reports.js';
import { AppError } from '../../shared/errors.js';

const MAX_IMAGE_BASE64_LENGTH = 2_000_000;
const MAX_IMAGE_BYTES = 1_500_000;

const blockedRequestPatterns = [
  /ignore\s+(all|any|the|previous)\s+instructions?/i,
  /(?:system|developer)\s+(?:prompt|message|instruction)/i,
  /\b(?:diagnos(?:e|is)|prescri(?:be|ption)|medication|medicine|drug|dosage|insulin|cancer|anorexia|bulimia|purge)\b/i,
];

const mealItemValidator = z
  .object({
    caloriesKcal: z.number().int().min(0).max(20_000),
    carbsGrams: z.number().min(0).max(5_000).nullable(),
    fatGrams: z.number().min(0).max(5_000).nullable(),
    grams: z.number().int().min(1).max(3_000),
    name: z.string().trim().min(1).max(80),
    proteinGrams: z.number().min(0).max(5_000).nullable(),
  })
  .strict();

const mealEstimateOutputValidator = z
  .object({
    assumptions: z.array(z.string().trim().min(1).max(240)).min(1).max(5),
    caloriesKcal: z.number().int().min(0).max(100_000),
    carbsGrams: z.number().min(0).max(100_000).nullable(),
    confidence: z.enum(['low', 'medium', 'high']),
    fatGrams: z.number().min(0).max(100_000).nullable(),
    healthTip: z.string().trim().max(240).optional(),
    // Older or partial outputs without items still pass with an empty list.
    items: z.array(mealItemValidator).max(12).default([]),
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
      'Flip can estimate meals and offer general wellness guidance, but cannot diagnose conditions or advise on medication.',
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
  const { healthTip, ...estimate } = parsed.data;
  // A tip that strays into medical advice is dropped rather than shown.
  return healthTip && !medicalAdvicePattern.test(healthTip) ? { ...estimate, healthTip } : estimate;
}

// Report text is about health by nature, so it is screened for advice Flip must never give
// (diagnoses, medication, doses) rather than for health words.
const medicalAdvicePattern = /\b(?:medication|medicine|tablet|pill|dose|dosage|prescri\w*|insulin|statin|metformin|supplement\w*|you have|you are suffering|diagnos\w*|disease|disorder)\b/i;

/**
 * Report extraction output: validated, notes that drift into medical advice dropped, and no water
 * target suggested when kidney or heart markers are flagged (more fluid can be unsafe there).
 */
export function guardReportOutput(output: unknown): ReportDraft {
  const parsed = reportDraftSchema.safeParse(normalizeReportOutput(output));
  if (!parsed.success) {
    throw new AiProviderError('AI_OUTPUT_INVALID', 'Flip couldn’t read that report clearly. Try clearer photos or the original PDF.', parsed.error.flatten());
  }
  const report = parsed.data;
  if (report.values.length === 1 && /not a health report/i.test(report.values[0].name)) {
    throw new AppError('REPORT_NOT_RECOGNISED', 422, 'That doesn’t look like a health report. Try a photo or PDF of your lab results.');
  }
  const fluidRisk = hasFlaggedFluidMarker(report.values);
  return {
    ...report,
    hydration: fluidRisk
      ? { reason: 'Some kidney or heart related values are outside the lab range. Ask your doctor how much fluid is right for you.', suggestedLitres: null }
      : report.hydration,
    nutritionNotes: report.nutritionNotes.filter(note => !medicalAdvicePattern.test(note)),
    summary: medicalAdvicePattern.test(report.summary)
      ? 'Flip read your report. Some values are outside the lab’s range; the list below shows which. Please discuss your results with your doctor.'
      : report.summary,
  };
}

/** Trims over-long AI strings and lists to the schema limits instead of rejecting a whole report. */
function normalizeReportOutput(output: unknown): unknown {
  if (!output || typeof output !== 'object') return output;
  const report = output as Record<string, unknown>;
  const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : value);
  const values = Array.isArray(report.values)
    ? report.values.slice(0, 80).map(item => {
      const value = item as Record<string, unknown>;
      return { ...value, name: clip(value.name, 80), referenceRange: clip(value.referenceRange, 60) || null, unit: clip(value.unit, 30) || null, value: clip(String(value.value ?? ''), 40) };
    })
    : report.values;
  const hydration = report.hydration as Record<string, unknown> | undefined;
  const litres = typeof hydration?.suggestedLitres === 'number' ? hydration.suggestedLitres : null;
  return {
    ...report,
    hydration: hydration ? { reason: clip(hydration.reason ?? '', 240), suggestedLitres: litres !== null && litres >= 2 && litres <= 4 ? litres : null } : hydration,
    nutritionNotes: Array.isArray(report.nutritionNotes) ? report.nutritionNotes.slice(0, 6).map(note => clip(note, 240)) : report.nutritionNotes,
    reportDate: typeof report.reportDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(report.reportDate) ? report.reportDate : null,
    summary: clip(report.summary, 600),
    title: clip(report.title, 80),
    values,
  };
}

export function guardDailyInsightOutput(output: unknown): DailyInsight {
  const parsed = dailyInsightOutputValidator.safeParse(output);
  if (!parsed.success) {
    throw new AiProviderError('AI_OUTPUT_INVALID', 'The AI returned an invalid wellness insight.', parsed.error.flatten());
  }
  return parsed.data;
}

const planOutputValidator = z
  .object({
    carbsGrams: z.number().int().min(0).max(1_000),
    dailyCalorieTarget: z.number().int().min(800).max(6000),
    dailySteps: z.number().int().min(0).max(100_000),
    fatGrams: z.number().int().min(0).max(1_000),
    proteinGrams: z.number().int().min(0).max(1_000),
    rationale: z.string().trim().min(1).max(400),
    source: z.enum(['ai', 'fallback']),
  })
  .strict();

/**
 * Keeps an AI plan close to the deterministic baseline: calories within 10% and above the floor, macros
 * that add up to the calories (within 10%), and realistic steps. Anything else falls back to the
 * baseline numbers while keeping the AI's wording.
 */
export function guardPlanOutput(output: unknown, baseline: PlanBaseline): PlanRecommendation {
  const parsed = planOutputValidator.safeParse(output);
  if (!parsed.success) {
    throw new AiProviderError('AI_OUTPUT_INVALID', 'The AI returned an invalid plan.', parsed.error.flatten());
  }
  const plan = parsed.data;
  const rationale = plan.rationale.length > 280 ? `${plan.rationale.slice(0, 277).trimEnd()}…` : plan.rationale;
  const caloriesOk = Math.abs(plan.dailyCalorieTarget - baseline.dailyCalorieTarget) <= baseline.dailyCalorieTarget * 0.1
    && plan.dailyCalorieTarget >= baseline.calorieFloor;
  const macroKcal = plan.proteinGrams * 4 + plan.carbsGrams * 4 + plan.fatGrams * 9;
  const macrosOk = Math.abs(macroKcal - plan.dailyCalorieTarget) <= plan.dailyCalorieTarget * 0.1;
  const stepsOk = plan.dailySteps >= 3_000 && plan.dailySteps <= 20_000;

  return {
    carbsGrams: caloriesOk && macrosOk ? plan.carbsGrams : baseline.carbsGrams,
    dailyCalorieTarget: caloriesOk ? plan.dailyCalorieTarget : baseline.dailyCalorieTarget,
    dailySteps: stepsOk ? plan.dailySteps : baseline.dailySteps,
    fatGrams: caloriesOk && macrosOk ? plan.fatGrams : baseline.fatGrams,
    proteinGrams: caloriesOk && macrosOk ? plan.proteinGrams : baseline.proteinGrams,
    rationale,
    source: plan.source,
  };
}

/** Free-text plan notes reach the prompt too, so they get the same screen as meal descriptions. */
export function guardPlanNotes(notes: string | undefined): string | undefined {
  if (!notes) return undefined;
  const normalized = notes.trim().replace(/\s+/g, ' ');
  if (blockedRequestPatterns.some(pattern => pattern.test(normalized))) {
    throw new AppError('AI_SAFETY_BLOCKED', 422, 'Flip can build general diet and exercise plans, but cannot follow instructions in notes or give medical advice.');
  }
  return normalized || undefined;
}

/** Memories are injected into Flip's system prompt, so they get the same injection and safety screen. */
export function guardMemoryText(text: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (blockedRequestPatterns.some(pattern => pattern.test(normalized))) {
    throw new AppError('MEMORY_BLOCKED', 422, 'Flip can remember food preferences and routines, but not instructions or medical details.');
  }
  return normalized;
}
