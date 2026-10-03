import { and, desc, eq } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { wellnessPlans } from '../schema/index.js';

export type WellnessPlanRecord = typeof wellnessPlans.$inferSelect;
export type WellnessPlanWrite = Pick<WellnessPlanRecord, 'content' | 'kind' | 'options' | 'source' | 'title'>;

export interface WellnessPlanRepository {
  create(guestId: string, input: WellnessPlanWrite): Promise<WellnessPlanRecord>;
  delete(guestId: string, id: string): Promise<boolean>;
  find(guestId: string, id: string): Promise<WellnessPlanRecord | null>;
  list(guestId: string): Promise<WellnessPlanRecord[]>;
}

export function createWellnessPlanRepository(db: DatabaseClient): WellnessPlanRepository {
  const owned = (guestId: string, id: string) => and(eq(wellnessPlans.guestId, guestId), eq(wellnessPlans.id, id));

  return {
    async create(guestId, input) {
      const [plan] = await db.insert(wellnessPlans).values({ ...input, guestId }).returning();
      return plan;
    },

    async delete(guestId, id) {
      const deleted = await db.delete(wellnessPlans).where(owned(guestId, id)).returning({ id: wellnessPlans.id });
      return deleted.length > 0;
    },

    async find(guestId, id) {
      const [plan] = await db.select().from(wellnessPlans).where(owned(guestId, id)).limit(1);
      return plan ?? null;
    },

    async list(guestId) {
      return db.select().from(wellnessPlans).where(eq(wellnessPlans.guestId, guestId)).orderBy(desc(wellnessPlans.createdAt), desc(wellnessPlans.id)).limit(100);
    },
  };
}
