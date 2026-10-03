import type { FastifyReply, FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import type { createFoodService } from './food.service.js';
import { foodParamsValidator, saveFoodValidator } from './food.validator.js';

export function createFoodController(service: ReturnType<typeof createFoodService>) {
  return {
    async list(request: FastifyRequest) {
      return { foods: await service.list(request.guest!.id) };
    },

    async save(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(saveFoodValidator, request.body);
      const result = await service.save(request.guest!.id, input);
      reply.code(result.created ? 201 : 200);
      return { food: result.food };
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(foodParamsValidator, request.params);
      await service.delete(request.guest!.id, id);
      return reply.code(204).send();
    },
  };
}
