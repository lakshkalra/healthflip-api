import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createFoodController } from './food.controller.js';

export function registerFoodRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createFoodController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.get('/v1/foods', { preHandler: requireGuest }, controller.list);
  app.post('/v1/foods', { preHandler: requireGuest }, controller.save);
  app.delete('/v1/foods/:id', { preHandler: requireGuest }, controller.delete);
}
