import type { MemoryRepository } from '../../db/repositories/memory.repository.js';
import { notFound } from '../../shared/errors.js';
import { guardMemoryText } from '../ai/ai.guardrails.js';
import { serializeMemory } from './memory.helper.js';
import type { CreateMemoryInput } from './memory.validator.js';

export const MAX_MEMORIES_PER_GUEST = 50;

export function createMemoryService(memoryRepository: MemoryRepository) {
  return {
    async list(guestId: string) {
      return (await memoryRepository.list(guestId)).map(serializeMemory);
    },

    // Saving the same fact twice returns the existing memory; past the cap the oldest are dropped.
    async create(guestId: string, input: CreateMemoryInput) {
      const text = guardMemoryText(input.text);
      const existing = await memoryRepository.findByText(guestId, text);
      if (existing) return { created: false, memory: serializeMemory(existing) };

      const memory = await memoryRepository.create(guestId, { category: input.category, text });
      await memoryRepository.trim(guestId, MAX_MEMORIES_PER_GUEST);
      return { created: true, memory: serializeMemory(memory) };
    },

    async delete(guestId: string, id: string) {
      if (!(await memoryRepository.delete(guestId, id))) throw notFound('Memory');
    },
  };
}
