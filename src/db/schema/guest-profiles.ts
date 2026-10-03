import { sql } from 'drizzle-orm';
import { check, numeric, pgEnum, pgTable, smallint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const profileSex = pgEnum('profile_sex', ['female', 'male', 'unspecified']);
export const activityLevel = pgEnum('activity_level', ['sedentary', 'light', 'moderate', 'active']);

// One profile per guest; it personalises the plan recommendation and Flip.
export const guestProfiles = pgTable(
  'guest_profiles',
  {
    guestId: uuid('guest_id')
      .primaryKey()
      .references(() => guests.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 60 }).notNull(),
    age: smallint('age').notNull(),
    sex: profileSex('sex').notNull(),
    heightCm: numeric('height_cm', { mode: 'number', precision: 5, scale: 1 }).notNull(),
    weightKg: numeric('weight_kg', { mode: 'number', precision: 5, scale: 1 }).notNull(),
    activityLevel: activityLevel('activity_level').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    // Calorie guidance is adults-only.
    check('guest_profiles_age_range', sql`${table.age} between 18 and 100`),
    check('guest_profiles_height_range', sql`${table.heightCm} between 120 and 230`),
    check('guest_profiles_weight_range', sql`${table.weightKg} between 30 and 300`),
  ],
);
