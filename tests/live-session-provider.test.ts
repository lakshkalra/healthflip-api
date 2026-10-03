import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { AiProviderError } from '../src/shared/ai/ai-provider.js';
import { createGeminiLiveSessionProvider } from '../src/shared/ai/live-session-provider.js';

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
  const setup = calls[0].body.bidiGenerateContentSetup as { model: string };
  assert.equal(setup.model, 'models/gemini-live-test');

  assert.equal(session.token, 'auth_tokens/test');
  assert.equal(session.model, 'gemini-live-test');
  assert.match(session.websocketUrl, /BidiGenerateContentConstrained$/);
  // Falls back to the requested 15-minute expiry because the endpoint omits expireTime.
  assert.equal(session.expiresAt, calls[0].body.expireTime);
  assert.ok(Date.parse(session.expiresAt) >= before + 14 * 60_000);
});

test('maps a rejected token request to AI_PROVIDER_UNAVAILABLE', async () => {
  stubFetch(400, { error: { message: 'Invalid JSON payload received.' } });

  await assert.rejects(
    createGeminiLiveSessionProvider({ apiKey: 'test-key' }).createSession(context),
    (error: unknown) => error instanceof AiProviderError && error.code === 'AI_PROVIDER_UNAVAILABLE',
  );
});
