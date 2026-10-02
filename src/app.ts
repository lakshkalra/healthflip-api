import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { closeDatabase, createDatabase } from './db/client.js';
import { createGoalRepository } from './db/repositories/goal.repository.js';
import { createGuestRepository } from './db/repositories/guest.repository.js';
import { createMealRepository } from './db/repositories/meal.repository.js';
import { createDashboardController } from './modules/dashboard/dashboard.controller.js';
import { registerDashboardRouter } from './modules/dashboard/dashboard.router.js';
import { createDashboardService } from './modules/dashboard/dashboard.service.js';
import { createGoalController } from './modules/goals/goal.controller.js';
import { registerGoalRouter } from './modules/goals/goal.router.js';
import { createGoalService } from './modules/goals/goal.service.js';
import { createGuestController } from './modules/guests/guest.controller.js';
import { registerGuestRouter } from './modules/guests/guest.router.js';
import { createGuestService } from './modules/guests/guest.service.js';
import { createMealController } from './modules/meals/meal.controller.js';
import { registerMealRouter } from './modules/meals/meal.router.js';
import { createMealService } from './modules/meals/meal.service.js';
import { createGuestAuth } from './shared/auth/guest-auth.js';
import { AppError } from './shared/errors.js';

export function buildApp(options: { databaseUrl: string }): FastifyInstance {
  const app = Fastify({ logger: true });
  const database = createDatabase(options.databaseUrl);

  app.decorateRequest('guest', null);

  app.register(cors, { origin: true });

  app.get('/health', async () => ({
    service: 'healthflip-api',
    status: 'ok',
  }));

  app.get('/health/db', async (_request, reply) => {
    try {
      await database.pool.query('SELECT 1');
      return { service: 'healthflip-api', status: 'ok' };
    } catch {
      return reply.code(503).send({
        service: 'healthflip-api',
        status: 'unavailable',
      });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          details: error.details,
          message: error.message,
        },
        requestId: request.id,
      });
    }

    if (isUniqueConstraintViolation(error)) {
      return reply.code(409).send({
        error: { code: 'CONFLICT', message: 'The requested resource already exists.' },
        requestId: request.id,
      });
    }

    request.log.error(error);
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      requestId: request.id,
    });
  });

  const guestRepository = createGuestRepository(database.db);
  const goalRepository = createGoalRepository(database.db);
  const mealRepository = createMealRepository(database.db);
  const requireGuest = createGuestAuth(guestRepository);

  registerGuestRouter(app, createGuestController(createGuestService(guestRepository)), requireGuest);
  registerGoalRouter(app, createGoalController(createGoalService(goalRepository)), requireGuest);
  registerMealRouter(app, createMealController(createMealService(mealRepository)), requireGuest);
  registerDashboardRouter(
    app,
    createDashboardController(createDashboardService(goalRepository, mealRepository)),
    requireGuest,
  );

  app.addHook('onClose', async () => {
    await closeDatabase(database);
  });

  return app;
}

/**
 * Vercel's Fastify adapter loads the conventional src/app entrypoint and
 * expects its default export to be a server or request handler. Keep local
 * tests and src/server.ts factory-based while exposing a conventional handler
 * here.
 */
const vercelApp = buildApp({
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://127.0.0.1:5432/healthflip',
});

export default async function vercelHandler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  await vercelApp.ready();
  vercelApp.server.emit('request', request, response);
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
