import type { FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import { dailyDashboardQueryValidator } from './dashboard.validator.js';
import type { createDashboardService } from './dashboard.service.js';

export function createDashboardController(service: ReturnType<typeof createDashboardService>) {
  return {
    async getDaily(request: FastifyRequest) {
      const query = parseOrThrow(dailyDashboardQueryValidator, request.query);
      return {
        dashboard: await service.getDaily(request.guest!.id, query.date, query.timezone),
      };
    },
  };
}
