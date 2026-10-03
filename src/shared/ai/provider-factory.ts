import { createFallbackProvider } from './fallback-provider.js';
import { createGeminiProvider } from './gemini-provider.js';
import { createGeminiLiveSessionProvider, createUnavailableLiveSessionProvider } from './live-session-provider.js';
import type { AiProvider, LiveSessionProvider } from './ai-provider.js';

export type AiProviderMode = 'auto' | 'fallback' | 'gemini';

export type ConfiguredAiProvider = {
  mode: Exclude<AiProviderMode, 'auto'>;
  provider: AiProvider;
  liveSessionProvider: LiveSessionProvider;
};

export function createConfiguredAiProvider(environment: NodeJS.ProcessEnv = process.env): ConfiguredAiProvider {
  const requestedMode = parseProviderMode(environment.AI_PROVIDER);
  const apiKey = environment.GEMINI_API_KEY?.trim();

  if (requestedMode === 'fallback' || (requestedMode === 'auto' && !apiKey)) {
    return { mode: 'fallback', provider: createFallbackProvider(), liveSessionProvider: createUnavailableLiveSessionProvider() };
  }

  if (!apiKey) {
    throw new Error('AI_PROVIDER=gemini requires GEMINI_API_KEY. Add it to the backend environment.');
  }

  return {
    mode: 'gemini',
    provider: createGeminiProvider({
      apiKey,
      model: environment.GEMINI_MODEL,
      timeoutMs: Number(environment.GEMINI_TIMEOUT_MS) || 15_000,
    }),
    liveSessionProvider: createGeminiLiveSessionProvider({
      apiKey,
      model: environment.GEMINI_LIVE_MODEL,
      timeoutMs: Number(environment.GEMINI_TIMEOUT_MS) || 15_000,
    }),
  };
}

function parseProviderMode(value: string | undefined): AiProviderMode {
  if (value === undefined) return 'auto';
  if (value === 'auto' || value === 'fallback' || value === 'gemini') return value;
  throw new Error('AI_PROVIDER must be one of: auto, fallback, gemini.');
}
