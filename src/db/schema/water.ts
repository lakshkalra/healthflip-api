import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const waterTargetSource = pgEnum('water_target_source', ['user', 'report']);

// One daily water target per guest, set by the user or accepted from a report suggestion.
export const waterTargets = pgTable(
  'water_targets',
  {
    guestId: uuid('guest_id')
      .primaryKey()
      .references(() => guests.id, { onDelete: 'cascade' }),
    targetMl: integer('target_ml').notNull(),
    source: waterTargetSource('source').default('user').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [check('water_targets_range', sql`${table.targetMl} between 500 and 6000`)],
);

export const waterLogs = pgTable(
  'water_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    loggedOn: date('logged_on').notNull(),
    amountMl: integer('amount_ml').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    check('water_logs_amount_range', sql`${table.amountMl} between 1 and 2000`),
    index('water_logs_guest_day_idx').on(table.guestId, table.loggedOn),
  ],
);
