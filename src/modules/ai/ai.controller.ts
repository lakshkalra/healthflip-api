import type { FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import { dailyInsightQueryValidator, imageMealEstimateValidator, liveSessionValidator, mealEstimateValidator, planRecommendationValidator } from './ai.validator.js';
import type { createAiService } from './ai.service.js';

export function createAiController(service: ReturnType<typeof createAiService>) {
  return {
    async estimateMeal(request: FastifyRequest) {
      const input = parseOrThrow(mealEstimateValidator, request.body);
      return { estimate: await service.estimateMeal(request.guest!.id, input) };
    },

    async estimateMealFromImage(request: FastifyRequest) {
      const input = parseOrThrow(imageMealEstimateValidator, request.body);
      return { estimate: await service.estimateMealFromImage(request.guest!.id, input) };
    },

    async dailyInsight(request: FastifyRequest) {
      const query = parseOrThrow(dailyInsightQueryValidator, request.query);
      return {
        insight: await service.getDailyInsight(request.guest!.id, query.date, query.timezone),
      };
    },

    async createLiveSession(request: FastifyRequest) {
      const input = parseOrThrow(liveSessionValidator, request.body);
      return { session: await service.createLiveSession(request.guest!.id, input.date, input.timezone) };
    },

    async recommendPlan(request: FastifyRequest) {
      const input = parseOrThrow(planRecommendationValidator, request.body);
      return { recommendation: await service.recommendPlan(request.guest!.id, input.goalType) };
    },
  };
}
