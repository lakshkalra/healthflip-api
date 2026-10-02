import 'dotenv/config';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { loadConfig } from '../config/env.js';
import { closeDatabase, createDatabase } from './client.js';

const config = loadConfig();
const database = createDatabase(config.DATABASE_URL);

try {
  await migrate(database.db, { migrationsFolder: 'drizzle' });
} finally {
  await closeDatabase(database);
}
