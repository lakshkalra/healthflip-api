import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const goalType = pgEnum('goal_type', ['lose', 'maintain', 'gain']);

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    type: goalType('type').notNull(),
    dailyCalorieTarget: integer('daily_calorie_target').notNull(),
    startsOn: date('starts_on').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  table => [
    check(
      'goals_daily_calorie_target_range',
      sql`${table.dailyCalorieTarget} between 800 and 6000`,
    ),
    index('goals_guest_id_idx').on(table.guestId),
    uniqueIndex('goals_one_active_goal_per_guest')
      .on(table.guestId)
      .where(sql`${table.archivedAt} is null`),
  ],
);
