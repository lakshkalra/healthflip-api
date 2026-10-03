import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createPlanController } from './plan.controller.js';

export function registerPlanRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createPlanController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.post('/v1/plans/generate', { preHandler: requireGuest }, controller.generate);
  app.post('/v1/plans', { preHandler: requireGuest }, controller.save);
  app.get('/v1/plans', { preHandler: requireGuest }, controller.list);
  app.get('/v1/plans/:id', { preHandler: requireGuest }, controller.get);
  app.get('/v1/plans/:id/pdf', { preHandler: requireGuest }, controller.pdf);
  app.delete('/v1/plans/:id', { preHandler: requireGuest }, controller.delete);
}
