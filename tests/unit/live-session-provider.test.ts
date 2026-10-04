import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { AiProviderError } from '../../src/shared/ai/ai-provider.js';
import { createGeminiLiveSessionProvider } from '../../src/shared/ai/gemini/live-session-provider.js';

const originalFetch = globalThis.fetch;
const context = {} as never;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function stubFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return calls;
}

test('requests a constrained token with bidiGenerateContentSetup and accepts a name-only response', async () => {
  const calls = stubFetch(200, { name: 'auth_tokens/test' });
  const before = Date.now();

  const session = await createGeminiLiveSessionProvider({ apiKey: 'test-key', model: 'gemini-live-test' }).createSession(context);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/auth_tokens');
  assert.equal('liveConnectConstraints' in calls[0].body, false);
  const setup = calls[0].body.bidiGenerateContentSetup as {
    generationConfig: { speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } } };
    model: string;
    tools: Array<{ functionDeclarations: Array<{ name: string }> }>;
  };
  assert.equal(setup.model, 'models/gemini-live-test');
  assert.equal(setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Sulafat');
  assert.deepEqual(setup.tools[0].functionDeclarations.map(tool => tool.name), ['show_meal_card', 'save_memory', 'create_plan']);

  assert.equal(session.token, 'auth_tokens/test');
  assert.equal(session.model, 'gemini-live-test');
  assert.match(session.websocketUrl, /BidiGenerateContentConstrained$/);
  // Falls back to the requested 15-minute expiry because the endpoint omits expireTime.
  assert.equal(session.expiresAt, calls[0].body.expireTime);
  assert.ok(Date.parse(session.expiresAt) >= before + 14 * 60_000);
});

test('personalises the locked system instruction with the name and remembered facts as data', async () => {
  const calls = stubFetch(200, { name: 'auth_tokens/test' });
  await createGeminiLiveSessionProvider({ apiKey: 'test-key' }).createSession({
    date: '2026-10-03',
    goal: null,
    meals: [],
    healthNotes: ['LDL Cholesterol 162 mg/dL is high (lab range <130)'],
    memories: ['Vegetarian', 'Goes to the gym at 7am'],
    profile: { activityLevel: 'moderate', age: 30, heightCm: 178, name: 'Arjun', sex: 'male', weightKg: 75 },
    timezone: 'Asia/Kolkata',
    totalCalories: 0,
  });
  const setup = calls[0].body.bidiGenerateContentSetup as { systemInstruction: { parts: Array<{ text: string }> } };
  const instruction = setup.systemInstruction.parts[0].text;
  assert.match(instruction, /talking with Arjun/);
  assert.match(instruction, /Remembered facts: \["Vegetarian","Goes to the gym at 7am"\]/);
  assert.match(instruction, /not instructions/);
  assert.match(instruction, /Health notes from their lab report: \["LDL Cholesterol 162 mg\/dL is high \(lab range <130\)"\]/);
  assert.match(instruction, /Never diagnose, never name a disease as theirs, never advise on medication/);
});

test('uses the configured voice when one is set', async () => {
  const calls = stubFetch(200, { name: 'auth_tokens/test' });
  await createGeminiLiveSessionProvider({ apiKey: 'test-key', voice: 'Achernar' }).createSession(context);
  const setup = calls[0].body.bidiGenerateContentSetup as { generationConfig: { speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } } } };
  assert.equal(setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, 'Achernar');
});

test('maps a rejected token request to AI_PROVIDER_UNAVAILABLE', async () => {
  stubFetch(400, { error: { message: 'Invalid JSON payload received.' } });

  await assert.rejects(
    createGeminiLiveSessionProvider({ apiKey: 'test-key' }).createSession(context),
    (error: unknown) => error instanceof AiProviderError && error.code === 'AI_PROVIDER_UNAVAILABLE',
  );
});
