import type { FastifyReply, FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import type { createPlanService } from './plan.service.js';
import { generatePlanValidator, planParamsValidator, savePlanValidator } from './plan.validator.js';

export function createPlanController(service: ReturnType<typeof createPlanService>) {
  return {
    async generate(request: FastifyRequest) {
      const input = parseOrThrow(generatePlanValidator, request.body);
      return { plan: await service.generate(request.guest!.id, input) };
    },

    async save(request: FastifyRequest, reply: FastifyReply) {
      const input = parseOrThrow(savePlanValidator, request.body);
      reply.code(201);
      return { plan: await service.save(request.guest!.id, input) };
    },

    async list(request: FastifyRequest) {
      return { plans: await service.list(request.guest!.id) };
    },

    async get(request: FastifyRequest) {
      const { id } = parseOrThrow(planParamsValidator, request.params);
      return { plan: await service.get(request.guest!.id, id) };
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(planParamsValidator, request.params);
      await service.delete(request.guest!.id, id);
      return reply.code(204).send();
    },

    async pdf(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(planParamsValidator, request.params);
      const { bytes, fileName } = await service.pdf(request.guest!.id, id);
      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Cache-Control', 'private, no-store')
        .send(bytes);
    },
  };
}
