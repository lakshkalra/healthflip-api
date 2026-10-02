import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AiProviderError } from '../src/shared/ai/ai-provider.js';
import { createAiService } from '../src/modules/ai/ai.service.js';

test('maps provider timeout failures to a structured app error', async () => {
  const service = createAiService(
    { findCurrent: async () => null } as never,
    { getDailySummary: async () => ({ meals: [], totalCalories: 0 }) } as never,
    {
      estimateMeal: async () => {
        throw new AiProviderError('AI_PROVIDER_TIMEOUT', 'The provider timed out.');
      },
      dailyInsight: async () => {
        throw new Error('not used');
      },
    },
  );

  await assert.rejects(
    service.estimateMeal({ description: 'A bowl of rice' }),
    error => {
      const typedError = error as { code: string; statusCode: number };
      assert.equal(typedError.code, 'AI_PROVIDER_TIMEOUT');
      assert.equal(typedError.statusCode, 504);
      return true;
    },
  );
});
