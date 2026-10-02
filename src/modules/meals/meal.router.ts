import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createMealController } from './meal.controller.js';

export function registerMealRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createMealController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.post('/v1/meals', { preHandler: requireGuest }, controller.create);
  app.get('/v1/meals', { preHandler: requireGuest }, controller.list);
  app.patch('/v1/meals/:mealId', { preHandler: requireGuest }, controller.update);
  app.delete('/v1/meals/:mealId', { preHandler: requireGuest }, controller.delete);
}
