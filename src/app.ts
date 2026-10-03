import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { closeDatabase, createDatabase } from './db/client.js';
import { createGoalRepository } from './db/repositories/goal.repository.js';
import { createGuestRepository } from './db/repositories/guest.repository.js';
import { createMealRepository } from './db/repositories/meal.repository.js';
import { createFoodRepository } from './db/repositories/food.repository.js';
import { createHealthReportRepository } from './db/repositories/health-report.repository.js';
import { createWaterRepository } from './db/repositories/water.repository.js';
import { createMemoryRepository } from './db/repositories/memory.repository.js';
import { createProfileRepository } from './db/repositories/profile.repository.js';
import { createWellnessPlanRepository } from './db/repositories/wellness-plan.repository.js';
import { createConfiguredAiProvider } from './shared/ai/provider-factory.js';
import { createAiController } from './modules/ai/ai.controller.js';
import { registerAiRouter } from './modules/ai/ai.router.js';
import { createAiService } from './modules/ai/ai.service.js';
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
import { createFoodController } from './modules/foods/food.controller.js';
import { createReportController } from './modules/reports/report.controller.js';
import { registerReportRouter } from './modules/reports/report.router.js';
import { createReportService } from './modules/reports/report.service.js';
import { createWaterController } from './modules/water/water.controller.js';
import { registerWaterRouter } from './modules/water/water.router.js';
import { createWaterService } from './modules/water/water.service.js';
import { registerFoodRouter } from './modules/foods/food.router.js';
import { createFoodService } from './modules/foods/food.service.js';
import { createMemoryController } from './modules/memories/memory.controller.js';
import { registerMemoryRouter } from './modules/memories/memory.router.js';
import { createMemoryService } from './modules/memories/memory.service.js';
import { createPlanController } from './modules/plans/plan.controller.js';
import { registerPlanRouter } from './modules/plans/plan.router.js';
import { createPlanService } from './modules/plans/plan.service.js';
import { createProfileController } from './modules/profile/profile.controller.js';
import { registerProfileRouter } from './modules/profile/profile.router.js';
import { createProfileService } from './modules/profile/profile.service.js';
import { createGuestAuth } from './shared/auth/guest-auth.js';
import { AppError } from './shared/errors.js';

export function buildApp(options: { databaseUrl: string }): FastifyInstance {
  const app = Fastify({ bodyLimit: 2_500_000, logger: true });
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
  const profileRepository = createProfileRepository(database.db);
  const memoryRepository = createMemoryRepository(database.db);
  const foodRepository = createFoodRepository(database.db);
  const healthReportRepository = createHealthReportRepository(database.db);
  const waterRepository = createWaterRepository(database.db);
  const planRepository = createWellnessPlanRepository(database.db);
  const requireGuest = createGuestAuth(guestRepository);
  const aiProvider = createConfiguredAiProvider();

  app.get('/health/ai', async () => ({
    provider: aiProvider.mode,
    live: aiProvider.mode === 'gemini',
  }));

  registerGuestRouter(app, createGuestController(createGuestService(guestRepository)), requireGuest);
  registerGoalRouter(app, createGoalController(createGoalService(goalRepository)), requireGuest);
  registerMealRouter(app, createMealController(createMealService(mealRepository)), requireGuest);
  registerProfileRouter(app, createProfileController(createProfileService(profileRepository)), requireGuest);
  registerMemoryRouter(app, createMemoryController(createMemoryService(memoryRepository)), requireGuest);
  registerFoodRouter(app, createFoodController(createFoodService(foodRepository)), requireGuest);
  registerReportRouter(app, createReportController(createReportService(healthReportRepository, aiProvider.provider)), requireGuest);
  registerWaterRouter(app, createWaterController(createWaterService(waterRepository)), requireGuest);
  registerPlanRouter(
    app,
    createPlanController(createPlanService(planRepository, profileRepository, goalRepository, memoryRepository, aiProvider.provider, healthReportRepository)),
    requireGuest,
  );
  registerAiRouter(
    app,
    createAiController(createAiService(goalRepository, mealRepository, aiProvider.provider, aiProvider.liveSessionProvider, profileRepository, memoryRepository, healthReportRepository)),
    requireGuest,
  );
  registerDashboardRouter(
    app,
    createDashboardController(createDashboardService(goalRepository, mealRepository, waterRepository, healthReportRepository)),
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
