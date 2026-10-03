import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createGuestController } from './guest.controller.js';

export function registerGuestRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createGuestController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.post('/v1/guests', controller.create);
  app.get('/v1/me', { preHandler: requireGuest }, controller.getCurrent);
  app.delete('/v1/me', { preHandler: requireGuest }, controller.reset);
}
