import type { FastifyReply, FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import type { createMemoryService } from './memory.service.js';
import { createMemoryValidator, memoryParamsValidator } from './memory.validator.js';

export function createMemoryController(service: ReturnType<typeof createMemoryService>) {
  return {
    async list(request: FastifyRequest) {
      return { memories: await service.list(request.guest!.id) };
    },

    async create(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(createMemoryValidator, request.body);
      const result = await service.create(request.guest!.id, input);
      reply.code(result.created ? 201 : 200);
      return { memory: result.memory };
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(memoryParamsValidator, request.params);
      await service.delete(request.guest!.id, id);
      return reply.code(204).send();
    },
  };
}
