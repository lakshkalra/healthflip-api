import { and, desc, eq, notInArray, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { guestFoods } from '../schema/index.js';

export type FoodRecord = typeof guestFoods.$inferSelect;

export interface FoodWrite {
  caloriesKcal: number;
  carbsGrams: number | null;
  fatGrams: number | null;
  name: string;
  proteinGrams: number | null;
  serving: string;
}

export interface FoodRepository {
  delete(guestId: string, id: string): Promise<boolean>;
  list(guestId: string, limit?: number): Promise<FoodRecord[]>;
  /** Deletes all but the `keep` most recently used foods. */
  trim(guestId: string, keep: number): Promise<void>;
  /** Inserts, or refreshes the food with the same name (any letter case) and counts the reuse. */
  upsert(guestId: string, input: FoodWrite): Promise<{ created: boolean; food: FoodRecord }>;
}

export function createFoodRepository(db: DatabaseClient): FoodRepository {
  const recentFirst = [desc(guestFoods.lastUsedAt), desc(guestFoods.id)];

  return {
    async delete(guestId, id) {
      const deleted = await db
        .delete(guestFoods)
        .where(and(eq(guestFoods.guestId, guestId), eq(guestFoods.id, id)))
        .returning({ id: guestFoods.id });
      return deleted.length > 0;
    },

    async list(guestId, limit = 100) {
      return db.select().from(guestFoods).where(eq(guestFoods.guestId, guestId)).orderBy(...recentFirst).limit(limit);
    },

    async trim(guestId, keep) {
      const kept = db.select({ id: guestFoods.id }).from(guestFoods).where(eq(guestFoods.guestId, guestId)).orderBy(...recentFirst).limit(keep);
      await db.delete(guestFoods).where(and(eq(guestFoods.guestId, guestId), notInArray(guestFoods.id, kept)));
    },

    async upsert(guestId, input) {
      const [existing] = await db
        .select({ id: guestFoods.id })
        .from(guestFoods)
        .where(and(eq(guestFoods.guestId, guestId), sql`lower(${guestFoods.name}) = lower(${input.name})`))
        .limit(1);
      if (existing) {
        const [food] = await db
          .update(guestFoods)
          .set({ ...input, lastUsedAt: new Date(), timesUsed: sql`${guestFoods.timesUsed} + 1` })
          .where(eq(guestFoods.id, existing.id))
          .returning();
        return { created: false, food };
      }
      const [food] = await db.insert(guestFoods).values({ ...input, guestId }).returning();
      return { created: true, food };
    },
  };
}
