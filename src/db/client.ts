import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema/index.js';

export type DatabaseClient = NodePgDatabase<typeof schema>;

export interface DatabaseContext {
  db: DatabaseClient;
  pool: Pool;
}

export function createDatabase(connectionString: string): DatabaseContext {
  const pool = new Pool({ connectionString });

  return {
    db: drizzle({ client: pool, schema }),
    pool,
  };
}

export async function closeDatabase(database: DatabaseContext): Promise<void> {
  await database.pool.end();
}
