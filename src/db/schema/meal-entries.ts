import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const mealSource = pgEnum('meal_source', ['manual', 'photo', 'voice']);
export const mealType = pgEnum('meal_type', ['breakfast', 'lunch', 'snacks', 'dinner']);

export const mealEntries = pgTable(
  'meal_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    source: mealSource('source').default('manual').notNull(),
    mealType: mealType('meal_type').default('snacks').notNull(),
    loggedAt: timestamp('logged_at', { withTimezone: true }).notNull(),
    caloriesKcal: integer('calories_kcal'),
    proteinGrams: integer('protein_grams'),
    carbsGrams: integer('carbs_grams'),
    fatGrams: integer('fat_grams'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  table => [
    check(
      'meal_entries_non_negative_nutrition',
      sql`(${table.caloriesKcal} is null or ${table.caloriesKcal} >= 0)
        and (${table.proteinGrams} is null or ${table.proteinGrams} >= 0)
        and (${table.carbsGrams} is null or ${table.carbsGrams} >= 0)
        and (${table.fatGrams} is null or ${table.fatGrams} >= 0)`,
    ),
    index('meal_entries_guest_logged_at_idx').on(table.guestId, table.loggedAt),
    index('meal_entries_guest_active_idx').on(table.guestId, table.deletedAt),
  ],
);
