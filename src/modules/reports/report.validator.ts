import { z } from 'zod';

import { REPORT_FILE_TYPES, reportDraftSchema } from '../../domain/reports.js';

// Gemini accepts about 20 MB of inline data per request, so files are capped well under that.
export const MAX_REPORT_FILE_BASE64 = 8_000_000;
export const MAX_REPORT_TOTAL_BASE64 = 18_000_000;
export const REPORT_BODY_LIMIT = 20_000_000;

export const extractReportValidator = z
  .object({
    files: z
      .array(z.object({
        base64: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Provide a valid base64 file.').max(MAX_REPORT_FILE_BASE64, 'Each page must be smaller than about 6 MB.'),
        mimeType: z.enum(REPORT_FILE_TYPES),
      }).strict())
      .min(1)
      .max(5),
  })
  .strict()
  .refine(input => input.files.reduce((total, file) => total + file.base64.length, 0) <= MAX_REPORT_TOTAL_BASE64, 'All pages together must be smaller than about 13 MB.');

// Saving accepts the reviewed draft back; it is re-validated and re-screened, never trusted.
export const saveReportValidator = reportDraftSchema;

export const reportParamsValidator = z.object({ id: z.string().uuid() }).strict();

export type ExtractReportInput = z.infer<typeof extractReportValidator>;
