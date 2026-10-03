import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createMemoryController } from './memory.controller.js';

export function registerMemoryRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createMemoryController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.get('/v1/memories', { preHandler: requireGuest }, controller.list);
  app.post('/v1/memories', { preHandler: requireGuest }, controller.create);
  app.delete('/v1/memories/:id', { preHandler: requireGuest }, controller.delete);
}
