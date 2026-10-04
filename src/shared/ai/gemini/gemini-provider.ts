import { type AiProvider, AiProviderError, type DailyInsight, type MealEstimate, type PlanRecommendation } from '../ai-provider.js';
import type { DietPlanContent, ExercisePlanContent } from '../../../domain/plans.js';
import type { ReportDraft } from '../../../domain/reports.js';
import { dietPlanPrompt, exercisePlanPrompt, imagePrompt, insightPrompt, mealPrompt, planPrompt, reportPrompt } from './prompts.js';
import { dailyInsightSchema, dietPlanSchema, exercisePlanSchema, mealEstimateSchema, planSchema, reportSchema } from './schemas.js';

type GeminiProviderOptions = {
  apiKey: string;
  /** One model or a comma-separated fallback order, e.g. "gemini-3.5-flash-lite,gemini-3.1-flash-lite". */
  model?: string;
  timeoutMs?: number;
  /** How long a model that hit its quota, was overloaded or was retired is skipped. */
  cooldownMs?: number;
};

// Quota, overload and retired-model failures belong to one model, so the next model may still answer.
const MODEL_SPECIFIC_STATUSES = new Set([404, 429, 503]);

class ModelSpecificError extends AiProviderError {}

type GeminiPart = { text?: string; inlineData?: { mimeType: string; data: string } };

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string };
};

// Multi-day plans and report reading are large structured outputs, so they get more time than single estimates.
const PLAN_TIMEOUT_MS = 60_000;

export function createGeminiProvider(options: GeminiProviderOptions): AiProvider {
  const models = parseModels(options.model);
  const timeoutMs = options.timeoutMs ?? 15_000;
  const cooldownMs = options.cooldownMs ?? 5 * 60_000;
  const skipUntil = new Map<string, number>();

  // Free-tier quotas are per model, so walking an ordered list multiplies daily capacity.
  async function generate(parts: GeminiPart[], responseSchema: object, requestTimeoutMs = timeoutMs): Promise<Record<string, unknown>> {
    const now = Date.now();
    const ready = models.filter(model => (skipUntil.get(model) ?? 0) <= now);
    let lastError: unknown = new AiProviderError('AI_PROVIDER_QUOTA_EXCEEDED', 'The AI provider quota has been reached. Please try again later.');
    for (const model of ready.length ? ready : models) {
      try {
        const result = await generateJson(model, options.apiKey, requestTimeoutMs, parts, responseSchema);
        skipUntil.delete(model);
        return result;
      } catch (error) {
        if (!(error instanceof ModelSpecificError)) throw error;
        skipUntil.set(model, Date.now() + cooldownMs);
        lastError = error;
      }
    }
    throw lastError;
  }

  return {
    async estimateMeal(input) {
      const result = await generate([
        { text: mealPrompt(input) },
      ], mealEstimateSchema);

      return {
        ...(result as Omit<MealEstimate, 'source'>),
        source: 'ai',
      };
    },

    async estimateMealFromImage(input) {
      const result = await generate([
        { text: imagePrompt(input) },
        { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
      ], mealEstimateSchema);

      return {
        ...(result as Omit<MealEstimate, 'source'>),
        source: 'ai',
      };
    },

    async dailyInsight(context) {
      const result = await generate([
        { text: insightPrompt(context) },
      ], dailyInsightSchema) as Omit<DailyInsight, 'date' | 'source'>;

      return {
        date: context.date,
        message: result.message,
        nextAction: result.nextAction,
        source: 'ai',
      };
    },

    async recommendPlan(context) {
      const result = await generate([{ text: planPrompt(context) }], planSchema) as Omit<PlanRecommendation, 'source'>;
      return { ...result, source: 'ai' };
    },

    async generateDietPlan(context, planOptions) {
      const content = await generate([{ text: dietPlanPrompt(context, planOptions) }], dietPlanSchema, PLAN_TIMEOUT_MS);
      return { content: content as DietPlanContent, source: 'ai' };
    },

    async generateExercisePlan(context, planOptions) {
      const content = await generate([{ text: exercisePlanPrompt(context, planOptions) }], exercisePlanSchema, PLAN_TIMEOUT_MS);
      return { content: content as ExercisePlanContent, source: 'ai' };
    },

    async extractReport(files) {
      const result = await generate([
        { text: reportPrompt() },
        ...files.map(file => ({ inlineData: { data: file.base64, mimeType: file.mimeType } })),
      ], reportSchema, PLAN_TIMEOUT_MS);
      return result as ReportDraft;
    },
  };
}

function parseModels(value: string | undefined): string[] {
  const models = (value ?? '').split(',').map(model => model.trim()).filter(Boolean);
  return models.length ? [...new Set(models)] : ['gemini-3.8-flash'];
}

async function generateJson(
  model: string,
  apiKey: string,
  timeoutMs: number,
  parts: GeminiPart[],
  responseSchema: object,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.2,
        },
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => ({})) as GeminiResponse;
    if (response.status === 429) {
      throw new ModelSpecificError('AI_PROVIDER_QUOTA_EXCEEDED', 'The AI provider quota has been reached. Please try again later.');
    }
    if (MODEL_SPECIFIC_STATUSES.has(response.status)) {
      throw new ModelSpecificError('AI_PROVIDER_UNAVAILABLE', payload.error?.message || 'The AI provider is temporarily unavailable.');
    }
    if (!response.ok) {
      throw new AiProviderError('AI_PROVIDER_UNAVAILABLE', payload.error?.message || 'The AI provider is temporarily unavailable.');
    }

    const text = payload.candidates?.[0]?.content?.parts?.find(part => typeof part.text === 'string')?.text;
    if (!text) {
      throw new AiProviderError('AI_OUTPUT_INVALID', 'The AI returned an empty response.');
    }

    try {
      return JSON.parse(stripCodeFence(text)) as Record<string, unknown>;
    } catch (error) {
      throw new AiProviderError('AI_OUTPUT_INVALID', 'The AI returned malformed JSON.', error);
    }
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AiProviderError('AI_PROVIDER_TIMEOUT', 'The AI provider took too long to respond.');
    }
    throw new AiProviderError('AI_PROVIDER_UNAVAILABLE', 'The AI provider is temporarily unavailable.', error);
  } finally {
    clearTimeout(timeout);
  }
}

function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}
