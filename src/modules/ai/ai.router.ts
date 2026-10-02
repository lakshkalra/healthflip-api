import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createAiController } from './ai.controller.js';

export function registerAiRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createAiController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.post('/v1/ai/meal-estimate', { preHandler: requireGuest }, controller.estimateMeal);
  app.post('/v1/ai/meal-estimate-image', { preHandler: requireGuest }, controller.estimateMealFromImage);
  app.get('/v1/ai/daily-insight', { preHandler: requireGuest }, controller.dailyInsight);
}
