import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../client.js';
import { guestProfiles } from '../schema/index.js';

export type ProfileRecord = typeof guestProfiles.$inferSelect;

export interface ProfileWrite {
  activityLevel: ProfileRecord['activityLevel'];
  age: number;
  heightCm: number;
  name: string;
  sex: ProfileRecord['sex'];
  weightKg: number;
}

export interface ProfileRepository {
  find(guestId: string): Promise<ProfileRecord | null>;
  upsert(guestId: string, input: ProfileWrite): Promise<ProfileRecord>;
}

export function createProfileRepository(db: DatabaseClient): ProfileRepository {
  return {
    async find(guestId) {
      const [profile] = await db.select().from(guestProfiles).where(eq(guestProfiles.guestId, guestId)).limit(1);
      return profile ?? null;
    },

    async upsert(guestId, input) {
      const [profile] = await db
        .insert(guestProfiles)
        .values({ ...input, guestId })
        .onConflictDoUpdate({ target: guestProfiles.guestId, set: { ...input, updatedAt: new Date() } })
        .returning();
      return profile;
    },
  };
}
