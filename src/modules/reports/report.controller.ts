import type { FastifyReply, FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import type { createReportService } from './report.service.js';
import { extractReportValidator, reportParamsValidator, saveReportValidator } from './report.validator.js';

export function createReportController(service: ReturnType<typeof createReportService>) {
  return {
    async extract(request: FastifyRequest) {
      const input = parseOrThrow(extractReportValidator, request.body);
      return { draft: await service.extract(input) };
    },

    async save(request: FastifyRequest, reply: FastifyReply) {
      const draft = parseOrThrow(saveReportValidator, request.body);
      reply.code(201);
      return { report: await service.save(request.guest!.id, draft) };
    },

    async list(request: FastifyRequest) {
      return { reports: await service.list(request.guest!.id) };
    },

    async get(request: FastifyRequest) {
      const { id } = parseOrThrow(reportParamsValidator, request.params);
      return { report: await service.get(request.guest!.id, id) };
    },

    async delete(request: FastifyRequest, reply: FastifyReply) {
      const { id } = parseOrThrow(reportParamsValidator, request.params);
      await service.delete(request.guest!.id, id);
      return reply.code(204).send();
    },
  };
}
