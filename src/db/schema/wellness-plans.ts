import { index, jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const wellnessPlanKind = pgEnum('wellness_plan_kind', ['diet', 'exercise']);
export const wellnessPlanSource = pgEnum('wellness_plan_source', ['ai', 'fallback']);

// Saved diet and exercise plans; `content` is the validated structured plan, `options` what was asked for.
export const wellnessPlans = pgTable(
  'wellness_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    kind: wellnessPlanKind('kind').notNull(),
    title: varchar('title', { length: 120 }).notNull(),
    options: jsonb('options').notNull(),
    content: jsonb('content').notNull(),
    source: wellnessPlanSource('source').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index('wellness_plans_guest_id_idx').on(table.guestId)],
);
