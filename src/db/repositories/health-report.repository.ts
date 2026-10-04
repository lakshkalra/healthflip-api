import { and, desc, eq } from 'drizzle-orm';

import type { ReportDraft } from '../../domain/reports.js';
import type { DatabaseClient } from '../client.js';
import { healthReports } from '../schema/index.js';

export type HealthReportRecord = typeof healthReports.$inferSelect;
export type HealthReportWrite = Omit<ReportDraft, 'hydration'>;

export interface HealthReportRepository {
  create(guestId: string, input: HealthReportWrite): Promise<HealthReportRecord>;
  delete(guestId: string, id: string): Promise<boolean>;
  find(guestId: string, id: string): Promise<HealthReportRecord | null>;
  /** The most recent report by report date (then upload time), used to personalise Flip. */
  latest(guestId: string): Promise<HealthReportRecord | null>;
  list(guestId: string, limit?: number): Promise<HealthReportRecord[]>;
}

export function createHealthReportRepository(db: DatabaseClient): HealthReportRepository {
  const newestFirst = [desc(healthReports.reportDate), desc(healthReports.createdAt), desc(healthReports.id)];

  return {
    async create(guestId, input) {
      const [report] = await db.insert(healthReports).values({ ...input, guestId }).returning();
      return report;
    },

    async delete(guestId, id) {
      const deleted = await db
        .delete(healthReports)
        .where(and(eq(healthReports.guestId, guestId), eq(healthReports.id, id)))
        .returning({ id: healthReports.id });
      return deleted.length > 0;
    },

    async find(guestId, id) {
      const [report] = await db.select().from(healthReports).where(and(eq(healthReports.guestId, guestId), eq(healthReports.id, id))).limit(1);
      return report ?? null;
    },

    async latest(guestId) {
      const [report] = await db.select().from(healthReports).where(eq(healthReports.guestId, guestId)).orderBy(...newestFirst).limit(1);
      return report ?? null;
    },

    async list(guestId, limit = 50) {
      return db.select().from(healthReports).where(eq(healthReports.guestId, guestId)).orderBy(...newestFirst).limit(limit);
    },
  };
}
