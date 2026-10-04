import { z } from 'zod';

// Lab report values Flip extracted and the user confirmed. One schema validates AI output, drafts
// sent back to be saved, and stored rows.

export const REPORT_FLAGS = ['low', 'normal', 'high', 'critical', 'unknown'] as const;
export const REPORT_CATEGORIES = ['vitals', 'blood sugar', 'lipids', 'kidney', 'liver', 'thyroid', 'blood count', 'vitamins & minerals', 'electrolytes', 'heart', 'other'] as const;
export const REPORT_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const reportValueSchema = z
  .object({
    category: z.enum(REPORT_CATEGORIES).catch('other'),
    flag: z.enum(REPORT_FLAGS).catch('unknown'),
    name: text(80),
    referenceRange: z.string().trim().max(60).nullable(),
    unit: z.string().trim().max(30).nullable(),
    value: text(40),
  })
  .strict();

export const reportDraftSchema = z
  .object({
    hydration: z
      .object({
        reason: z.string().trim().max(240),
        suggestedLitres: z.number().min(2).max(4).nullable(),
      })
      .strict(),
    nutritionNotes: z.array(text(240)).max(6),
    reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    summary: text(600),
    title: text(80),
    urgent: z.boolean(),
    values: z.array(reportValueSchema).min(1).max(80),
  })
  .strict();

export type ReportValue = z.infer<typeof reportValueSchema>;
export type ReportDraft = z.infer<typeof reportDraftSchema>;
export type ReportFile = { base64: string; mimeType: (typeof REPORT_FILE_TYPES)[number] };

/** Markers where "drink more water" can be unsafe advice; a flagged one means ask a doctor instead. */
export const FLUID_SENSITIVE_MARKERS = /creatinine|egfr|gfr|urea|bun|bnp|sodium|potassium|albumin.*urine|microalbumin|ejection/i;

export function hasFlaggedFluidMarker(values: ReportValue[]): boolean {
  return values.some(value => value.flag !== 'normal' && value.flag !== 'unknown' && FLUID_SENSITIVE_MARKERS.test(value.name));
}

const HEALTH_NOTE_LIMIT = 8;

/**
 * Compact lines Flip's other prompts get as data: flagged values first, then the report's food notes.
 * Only values the user confirmed are used.
 */
export function healthNotesFrom(report: { nutritionNotes: string[]; reportDate: string | null; values: ReportValue[] } | null): string[] {
  if (!report) return [];
  const when = report.reportDate ? ` (report ${report.reportDate})` : '';
  const flagged = report.values
    .filter(value => value.flag === 'low' || value.flag === 'high' || value.flag === 'critical')
    .map(value => `${value.name} ${value.value}${value.unit ? ` ${value.unit}` : ''} is ${value.flag}${value.referenceRange ? ` (lab range ${value.referenceRange})` : ''}${when}`);
  return [...flagged, ...report.nutritionNotes].slice(0, HEALTH_NOTE_LIMIT);
}
