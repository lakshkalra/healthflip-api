import type { FastifyReply, FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import {
  createMealValidator,
  mealIdParamsValidator,
  mealListQueryValidator,
  updateMealValidator,
} from './meal.validator.js';
import type { createMealService } from './meal.service.js';

export function createMealController(service: ReturnType<typeof createMealService>) {
  return {
    async create(request: FastifyRequest) {
      const input = parseOrThrow(createMealValidator, request.body);
      return { meal: await service.create(request.guest!.id, input) };
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { mealId } = parseOrThrow(mealIdParamsValidator, request.params);
      await service.delete(request.guest!.id, mealId);
      return reply.code(204).send();
    },

    async list(request: FastifyRequest) {
      const query = parseOrThrow(mealListQueryValidator, request.query);
      const meals = await service.list(request.guest!.id, {
        end: new Date(query.to),
        start: new Date(query.from),
      });
      return { meals };
    },

    async update(request: FastifyRequest) {
      const { mealId } = parseOrThrow(mealIdParamsValidator, request.params);
      const input = parseOrThrow(updateMealValidator, request.body);
      return { meal: await service.update(request.guest!.id, mealId, input) };
    },
  };
}
