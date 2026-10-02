import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createGoalController } from './goal.controller.js';

export function registerGoalRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createGoalController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.get('/v1/goals/current', { preHandler: requireGuest }, controller.getCurrent);
  app.put('/v1/goals/current', { preHandler: requireGuest }, controller.replaceCurrent);
}
