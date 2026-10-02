import 'dotenv/config';

import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';

const config = loadConfig();
const app = buildApp({ databaseUrl: config.DATABASE_URL });

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
