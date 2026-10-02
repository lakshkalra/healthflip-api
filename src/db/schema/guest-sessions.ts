import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { guests } from './guests.js';

export const guestSessions = pgTable(
  'guest_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guestId: uuid('guest_id')
      .notNull()
      .references(() => guests.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  table => [
    uniqueIndex('guest_sessions_token_hash_unique').on(table.tokenHash),
    index('guest_sessions_guest_id_idx').on(table.guestId),
  ],
);
