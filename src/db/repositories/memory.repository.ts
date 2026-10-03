import { and, desc, eq, notInArray, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { guestMemories } from '../schema/index.js';

export type MemoryRecord = typeof guestMemories.$inferSelect;
export type MemoryCategory = MemoryRecord['category'];

export interface MemoryRepository {
  create(guestId: string, input: { category: MemoryCategory; text: string }): Promise<MemoryRecord>;
  delete(guestId: string, id: string): Promise<boolean>;
  findByText(guestId: string, text: string): Promise<MemoryRecord | null>;
  list(guestId: string, limit?: number): Promise<MemoryRecord[]>;
  /** Deletes all but the newest `keep` memories. */
  trim(guestId: string, keep: number): Promise<void>;
}

export function createMemoryRepository(db: DatabaseClient): MemoryRepository {
  const newestFirst = [desc(guestMemories.createdAt), desc(guestMemories.id)];

  return {
    async create(guestId, input) {
      const [memory] = await db.insert(guestMemories).values({ ...input, guestId }).returning();
      return memory;
    },

    async delete(guestId, id) {
      const deleted = await db
        .delete(guestMemories)
        .where(and(eq(guestMemories.guestId, guestId), eq(guestMemories.id, id)))
        .returning({ id: guestMemories.id });
      return deleted.length > 0;
    },

    async findByText(guestId, text) {
      const [memory] = await db
        .select()
        .from(guestMemories)
        .where(and(eq(guestMemories.guestId, guestId), sql`lower(${guestMemories.text}) = lower(${text})`))
        .limit(1);
      return memory ?? null;
    },

    async list(guestId, limit = 100) {
      return db.select().from(guestMemories).where(eq(guestMemories.guestId, guestId)).orderBy(...newestFirst).limit(limit);
    },

    async trim(guestId, keep) {
      const kept = db
        .select({ id: guestMemories.id })
        .from(guestMemories)
        .where(eq(guestMemories.guestId, guestId))
        .orderBy(...newestFirst)
        .limit(keep);
      await db.delete(guestMemories).where(and(eq(guestMemories.guestId, guestId), notInArray(guestMemories.id, kept)));
    },
  };
}
