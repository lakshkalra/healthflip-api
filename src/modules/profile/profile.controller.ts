import type { FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import type { createProfileService } from './profile.service.js';
import { upsertProfileValidator } from './profile.validator.js';

export function createProfileController(service: ReturnType<typeof createProfileService>) {
  return {
    async get(request: FastifyRequest) {
      return { profile: await service.get(request.guest!.id) };
    },

    async upsert(request: FastifyRequest) {
      const input = parseOrThrow(upsertProfileValidator, request.body);
      return { profile: await service.upsert(request.guest!.id, input) };
    },
  };
}
