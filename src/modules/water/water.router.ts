import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createWaterController } from './water.controller.js';

export function registerWaterRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createWaterController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  app.get('/v1/water', { preHandler: requireGuest }, controller.getDay);
  app.put('/v1/water/target', { preHandler: requireGuest }, controller.setTarget);
  app.post('/v1/water', { preHandler: requireGuest }, controller.log);
  app.delete('/v1/water/last', { preHandler: requireGuest }, controller.undo);
}
