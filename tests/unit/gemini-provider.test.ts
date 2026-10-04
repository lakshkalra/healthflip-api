import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { AiProviderError } from '../../src/shared/ai/ai-provider.js';
import { createGeminiProvider } from '../../src/shared/ai/gemini/gemini-provider.js';
import { guardMealEstimateOutput } from '../../src/modules/ai/ai.guardrails.js';

const originalFetch = globalThis.fetch;
const estimate = { assumptions: [], caloriesKcal: 330, carbsGrams: 55, confidence: 'medium', fatGrams: 7, name: 'Roti and dal', proteinGrams: 11 };

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// Replies per model name: a status code, or 200 with a valid estimate.
function stubModels(statusByModel: Record<string, number>) {
  const calls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    const model = decodeURIComponent(/models\/([^:]+):/.exec(url)?.[1] ?? '');
    calls.push(model);
    const status = statusByModel[model] ?? 200;
    const body = status === 200
      ? { candidates: [{ content: { parts: [{ text: JSON.stringify(estimate) }] } }] }
      : { error: { message: `status ${status}` } };
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

test('falls through quota, overload and retired models to the next one in order', async () => {
  const calls = stubModels({ a: 429, b: 503, c: 404 });
  const provider = createGeminiProvider({ apiKey: 'test-key', model: 'a, b, c, d' });

  const result = await provider.estimateMeal({ description: 'two rotis and dal' });

  assert.deepEqual(calls, ['a', 'b', 'c', 'd']);
  assert.equal(result.caloriesKcal, 330);
  assert.equal(result.source, 'ai');
});

test('skips a model during its cooldown after a quota error', async () => {
  const calls = stubModels({ a: 429 });
  const provider = createGeminiProvider({ apiKey: 'test-key', model: 'a,b' });

  await provider.estimateMeal({ description: 'poha' });
  await provider.estimateMeal({ description: 'chai' });

  assert.deepEqual(calls, ['a', 'b', 'b']);
});

test('does not fall through on errors that are not model-specific', async () => {
  const calls = stubModels({ a: 400 });
  const provider = createGeminiProvider({ apiKey: 'test-key', model: 'a,b' });

  await assert.rejects(provider.estimateMeal({ description: 'poha' }), (error: unknown) => error instanceof AiProviderError && error.code === 'AI_PROVIDER_UNAVAILABLE');
  assert.deepEqual(calls, ['a']);
});

test('reports quota exceeded when every model is exhausted', async () => {
  stubModels({ a: 429, b: 429 });
  const provider = createGeminiProvider({ apiKey: 'test-key', model: 'a,b' });

  await assert.rejects(provider.estimateMeal({ description: 'poha' }), (error: unknown) => error instanceof AiProviderError && error.code === 'AI_PROVIDER_QUOTA_EXCEEDED');
});

test('asks Gemini for itemised estimates with grams, and the guardrail checks each item', async () => {
  let sent: { contents: { parts: { text?: string }[] }[]; generationConfig: { responseSchema: { required: string[]; properties: { items: { items: { required: string[] } } } } } } | undefined;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(estimate) }] } }] }), { status: 200 });
  }) as typeof fetch;
  await createGeminiProvider({ apiKey: 'test-key', model: 'a' }).estimateMeal({ description: 'two rotis and dal' });
  assert.ok(sent!.generationConfig.responseSchema.required.includes('items'));
  assert.deepEqual(sent!.generationConfig.responseSchema.properties.items.items.required, ['name', 'grams', 'caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams']);
  assert.match(sent!.contents[0].parts[0].text!, /approximate edible weight in grams/);

  const base = { ...estimate, assumptions: ['Two medium rotis'], source: 'ai' as const };
  // Outputs without items still pass with an empty list.
  assert.deepEqual(guardMealEstimateOutput(base).items, []);
  const roti = { caloriesKcal: 240, carbsGrams: 40, fatGrams: 4, grams: 80, name: 'Roti', proteinGrams: 7 };
  assert.deepEqual(guardMealEstimateOutput({ ...base, items: [roti] }).items, [roti]);
  assert.throws(() => guardMealEstimateOutput({ ...base, items: [{ ...roti, grams: 0 }] }), AiProviderError);
  assert.throws(() => guardMealEstimateOutput({ ...base, items: [{ ...roti, grams: 5000 }] }), AiProviderError);
});
