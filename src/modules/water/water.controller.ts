import type { FastifyRequest } from 'fastify';

import { parseOrThrow } from '../../shared/validation.js';
import type { createWaterService } from './water.service.js';
import { logWaterValidator, waterDayValidator, waterTargetValidator } from './water.validator.js';

export function createWaterController(service: ReturnType<typeof createWaterService>) {
  return {
    async getDay(request: FastifyRequest) {
      const { date } = parseOrThrow(waterDayValidator, request.query);
      return { water: await service.day(request.guest!.id, date) };
    },

    async setTarget(request: FastifyRequest) {
      const input = parseOrThrow(waterTargetValidator, request.body);
      return { target: await service.setTarget(request.guest!.id, input.targetMl, input.source) };
    },

    async log(request: FastifyRequest) {
      const input = parseOrThrow(logWaterValidator, request.body);
      return { water: await service.log(request.guest!.id, input.date, input.amountMl) };
    },

    async undo(request: FastifyRequest) {
      const { date } = parseOrThrow(waterDayValidator, request.query);
      return { water: await service.undo(request.guest!.id, date) };
    },
  };
}
