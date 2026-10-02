import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createDashboardController } from './dashboard.controller.js';

export function registerDashboardRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createDashboardController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.get('/v1/dashboard/daily', { preHandler: requireGuest }, controller.getDaily);
}
