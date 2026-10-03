import type { WaterRepository } from '../../db/repositories/water.repository.js';
import { notFound } from '../../shared/errors.js';

export function createWaterService(waterRepository: WaterRepository) {
  async function day(guestId: string, date: string) {
    const [target, consumedMl] = await Promise.all([waterRepository.findTarget(guestId), waterRepository.totalForDay(guestId, date)]);
    return { consumedMl, date, source: target?.source ?? null, targetMl: target?.targetMl ?? null };
  }

  return {
    day,

    async setTarget(guestId: string, targetMl: number | null, source: 'user' | 'report') {
      if (targetMl === null) await waterRepository.clearTarget(guestId);
      else await waterRepository.setTarget(guestId, targetMl, source);
      const target = await waterRepository.findTarget(guestId);
      return { source: target?.source ?? null, targetMl: target?.targetMl ?? null };
    },

    async log(guestId: string, date: string, amountMl: number) {
      await waterRepository.addLog(guestId, date, amountMl);
      return day(guestId, date);
    },

    async undo(guestId: string, date: string) {
      if (!(await waterRepository.removeLastLog(guestId, date))) throw notFound('Water log');
      return day(guestId, date);
    },
  };
}
