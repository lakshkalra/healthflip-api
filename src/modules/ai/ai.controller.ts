import type { FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import { dailyInsightQueryValidator, mealEstimateValidator } from './ai.validator.js';
import type { createAiService } from './ai.service.js';

export function createAiController(service: ReturnType<typeof createAiService>) {
  return {
    async estimateMeal(request: FastifyRequest) {
      const input = parseOrThrow(mealEstimateValidator, request.body);
      return { estimate: await service.estimateMeal(input) };
    },

    async dailyInsight(request: FastifyRequest) {
      const query = parseOrThrow(dailyInsightQueryValidator, request.query);
      return {
        insight: await service.getDailyInsight(request.guest!.id, query.date, query.timezone),
      };
    },
  };
}
