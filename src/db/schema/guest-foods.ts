import { sql } from 'drizzle-orm';
import { index, integer, numeric, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

// Meals the guest confirmed from a Flip estimate, offered again in "Pick from list".
export const guestFoods = pgTable(
  'guest_foods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    serving: varchar('serving', { length: 200 }).notNull(),
    caloriesKcal: integer('calories_kcal').notNull(),
    proteinGrams: numeric('protein_grams', { mode: 'number', precision: 8, scale: 1 }),
    carbsGrams: numeric('carbs_grams', { mode: 'number', precision: 8, scale: 1 }),
    fatGrams: numeric('fat_grams', { mode: 'number', precision: 8, scale: 1 }),
    timesUsed: integer('times_used').default(1).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    uniqueIndex('guest_foods_guest_name_idx').on(table.guestId, sql`lower(${table.name})`),
    index('guest_foods_guest_last_used_idx').on(table.guestId, table.lastUsedAt),
  ],
);
