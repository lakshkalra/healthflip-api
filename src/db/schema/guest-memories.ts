import { index, pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const memoryCategory = pgEnum('memory_category', ['diet', 'allergy', 'preference', 'routine', 'goal', 'other']);

// Short facts Flip chose to remember (never transcripts); the user can review and delete them.
export const guestMemories = pgTable(
  'guest_memories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    text: varchar('text', { length: 200 }).notNull(),
    category: memoryCategory('category').default('other').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  table => [index('guest_memories_guest_id_idx').on(table.guestId)],
);
