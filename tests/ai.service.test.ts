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
      estimateMealFromImage: async () => {
        throw new Error('not used');
      },
      dailyInsight: async () => {
        throw new Error('not used');
      },
      recommendPlan: async () => {
        throw new Error('not used');
      },
      generateDietPlan: async () => {
        throw new Error('not used');
      },
      generateExercisePlan: async () => {
        throw new Error('not used');
      },
      extractReport: async () => {
        throw new Error('not used');
      },
    },
    { createSession: async () => { throw new Error('not used'); } },
    { find: async () => null } as never,
    { list: async () => [] } as never,
    { latest: async () => null } as never,
  );

  await assert.rejects(
    service.estimateMeal('guest-1', { description: 'A bowl of rice' }),
    error => {
      const typedError = error as { code: string; statusCode: number };
      assert.equal(typedError.code, 'AI_PROVIDER_TIMEOUT');
      assert.equal(typedError.statusCode, 504);
      return true;
    },
  );
});
