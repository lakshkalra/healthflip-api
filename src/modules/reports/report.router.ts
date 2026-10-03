import type { FastifyInstance } from 'fastify';

import type { createGuestAuth } from '../../shared/auth/guest-auth.js';
import type { createReportController } from './report.controller.js';
import { REPORT_BODY_LIMIT } from './report.validator.js';

export function registerReportRouter(
  app: FastifyInstance,
  controller: ReturnType<typeof createReportController>,
  requireGuest: ReturnType<typeof createGuestAuth>,
): void {
  // Report pages are larger than other requests, so only this route gets a bigger body limit.
  app.post('/v1/reports/extract', { bodyLimit: REPORT_BODY_LIMIT, preHandler: requireGuest }, controller.extract);
  app.post('/v1/reports', { preHandler: requireGuest }, controller.save);
  app.get('/v1/reports', { preHandler: requireGuest }, controller.list);
  app.get('/v1/reports/:id', { preHandler: requireGuest }, controller.get);
  app.delete('/v1/reports/:id', { preHandler: requireGuest }, controller.delete);
}
