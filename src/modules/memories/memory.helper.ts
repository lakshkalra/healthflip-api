import type { MemoryRecord } from '../../db/repositories/memory.repository.js';

export function serializeMemory(memory: MemoryRecord) {
  return {
    category: memory.category,
    createdAt: memory.createdAt.toISOString(),
    id: memory.id,
    text: memory.text,
  };
}
