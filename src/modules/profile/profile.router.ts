import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createProfileController } from './profile.controller.js';

export function registerProfileRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createProfileController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.get('/v1/profile', { preHandler: requireGuest }, controller.get);
  app.put('/v1/profile', { preHandler: requireGuest }, controller.upsert);
}
