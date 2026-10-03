import { and, desc, eq, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { waterLogs, waterTargets } from '../schema/index.js';

export type WaterTargetRecord = typeof waterTargets.$inferSelect;

export interface WaterRepository {
  addLog(guestId: string, day: string, amountMl: number): Promise<void>;
  clearTarget(guestId: string): Promise<void>;
  findTarget(guestId: string): Promise<WaterTargetRecord | null>;
  /** Removes the newest log of the day; false when there was nothing to undo. */
  removeLastLog(guestId: string, day: string): Promise<boolean>;
  setTarget(guestId: string, targetMl: number, source: WaterTargetRecord['source']): Promise<WaterTargetRecord>;
  totalForDay(guestId: string, day: string): Promise<number>;
}

export function createWaterRepository(db: DatabaseClient): WaterRepository {
  return {
    async addLog(guestId, day, amountMl) {
      await db.insert(waterLogs).values({ amountMl, guestId, loggedOn: day });
    },

    async clearTarget(guestId) {
      await db.delete(waterTargets).where(eq(waterTargets.guestId, guestId));
    },

    async findTarget(guestId) {
      const [target] = await db.select().from(waterTargets).where(eq(waterTargets.guestId, guestId)).limit(1);
      return target ?? null;
    },

    async removeLastLog(guestId, day) {
      const [last] = await db
        .select({ id: waterLogs.id })
        .from(waterLogs)
        .where(and(eq(waterLogs.guestId, guestId), eq(waterLogs.loggedOn, day)))
        .orderBy(desc(waterLogs.createdAt), desc(waterLogs.id))
        .limit(1);
      if (!last) return false;
      await db.delete(waterLogs).where(eq(waterLogs.id, last.id));
      return true;
    },

    async setTarget(guestId, targetMl, source) {
      const [target] = await db
        .insert(waterTargets)
        .values({ guestId, source, targetMl })
        .onConflictDoUpdate({ set: { source, targetMl, updatedAt: new Date() }, target: waterTargets.guestId })
        .returning();
      return target;
    },

    async totalForDay(guestId, day) {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${waterLogs.amountMl}), 0)::int` })
        .from(waterLogs)
        .where(and(eq(waterLogs.guestId, guestId), eq(waterLogs.loggedOn, day)));
      return row?.total ?? 0;
    },
  };
}
