import { and, eq, isNull } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { guests, guestSessions } from '../schema/index.js';

export interface GuestRepository {
  createGuestWithSession(tokenHash: string): Promise<{ createdAt: Date; id: string }>;
  deleteById(guestId: string): Promise<boolean>;
  findActiveGuestByTokenHash(tokenHash: string): Promise<{ id: string } | null>;
  findById(guestId: string): Promise<{ createdAt: Date; id: string } | null>;
}

export function createGuestRepository(db: DatabaseClient): GuestRepository {
  return {
    async createGuestWithSession(tokenHash) {
      return db.transaction(async transaction => {
        const [guest] = await transaction.insert(guests).values({}).returning();
        await transaction.insert(guestSessions).values({ guestId: guest.id, tokenHash });
        return { createdAt: guest.createdAt, id: guest.id };
      });
    },

    async findActiveGuestByTokenHash(tokenHash) {
      const [guest] = await db
        .select({ id: guests.id })
        .from(guestSessions)
        .innerJoin(guests, eq(guestSessions.guestId, guests.id))
        .where(and(eq(guestSessions.tokenHash, tokenHash), isNull(guestSessions.revokedAt)))
        .limit(1);

      return guest ?? null;
    },

    async findById(guestId) {
      const [guest] = await db
        .select({ createdAt: guests.createdAt, id: guests.id })
        .from(guests)
        .where(eq(guests.id, guestId))
        .limit(1);

      return guest ?? null;
    },

    async deleteById(guestId) {
      const deleted = await db.delete(guests).where(eq(guests.id, guestId)).returning({ id: guests.id });
      return deleted.length > 0;
    },
  };
}
