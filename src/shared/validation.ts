import { z } from 'zod';

import { validationError } from './errors.js';

export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw validationError(
      result.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  return result.data;
}

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');

export const timeZoneSchema = z.string().refine(
  value => {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Use a valid IANA timezone, such as Asia/Kolkata.' },
);
