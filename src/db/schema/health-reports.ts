import { boolean, date, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import type { ReportValue } from '../../domain/reports.js';
import { guests } from './guests.js';

// Values the guest confirmed from an uploaded lab report. The uploaded file itself is never stored.
export const healthReports = pgTable(
  'health_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 80 }).notNull(),
    reportDate: date('report_date'),
    values: jsonb('values').$type<ReportValue[]>().notNull(),
    summary: text('summary').notNull(),
    nutritionNotes: jsonb('nutrition_notes').$type<string[]>().notNull(),
    urgent: boolean('urgent').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index('health_reports_guest_created_idx').on(table.guestId, table.createdAt)],
);
