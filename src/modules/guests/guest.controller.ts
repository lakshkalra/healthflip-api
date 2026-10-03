import type { FastifyReply, FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import { createGuestBodyValidator } from './guest.validator.js';
import type { createGuestService } from './guest.service.js';

export function createGuestController(service: ReturnType<typeof createGuestService>) {
  return {
    async create(request: FastifyRequest) {
      parseOrThrow(createGuestBodyValidator, request.body);
      return service.createGuest();
    },

    async getCurrent(request: FastifyRequest) {
      return { guest: await service.getGuest(request.guest!.id) };
    },

    async reset(request: FastifyRequest, reply: FastifyReply) {
      await service.resetGuest(request.guest!.id);
      return reply.code(204).send();
    },
  };
}
