import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { guardMealEstimateOutput, guardReportOutput } from '../src/modules/ai/ai.guardrails.js';
import { createReportService } from '../src/modules/reports/report.service.js';
import { AiProviderError, type AiProvider } from '../src/shared/ai/ai-provider.js';
import { createFallbackProvider } from '../src/shared/ai/fallback-provider.js';
import { createGeminiProvider } from '../src/shared/ai/gemini-provider.js';
import { healthNotesFrom, type ReportDraft } from '../src/shared/reports.js';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const value = (name: string, flag: ReportDraft['values'][number]['flag'], category: ReportDraft['values'][number]['category'] = 'other') =>
  ({ category, flag, name, referenceRange: '< 130', unit: 'mg/dL', value: '162' });

const draft = (overrides: Partial<ReportDraft> = {}): ReportDraft => ({
  hydration: { reason: 'Most adults do well with about 3 L a day.', suggestedLitres: 3 },
  nutritionNotes: ['LDL is above the lab range: more fibre (oats, dal) and less fried food may help.'],
  reportDate: '2026-09-20',
  summary: 'Your LDL cholesterol is above the lab range; the rest looks within range. Please discuss these results with your doctor.',
  title: 'Lipid profile',
  urgent: false,
  values: [value('LDL Cholesterol', 'high', 'lipids'), value('HDL Cholesterol', 'normal', 'lipids')],
  ...overrides,
});

test('a valid report passes and keeps the water suggestion when kidney and heart markers are fine', () => {
  const report = guardReportOutput(draft());
  assert.equal(report.hydration.suggestedLitres, 3);
  assert.equal(report.values.length, 2);
});

test('no water target is suggested when a kidney marker is flagged', () => {
  const report = guardReportOutput(draft({ values: [value('Serum Creatinine', 'high', 'kidney'), value('LDL Cholesterol', 'high', 'lipids')] }));
  assert.equal(report.hydration.suggestedLitres, null);
  assert.match(report.hydration.reason, /Ask your doctor/);
});

test('notes and summaries that drift into medication or diagnosis are removed', () => {
  const report = guardReportOutput(draft({
    nutritionNotes: ['Start a statin to bring LDL down.', 'Choose oats and dal more often.'],
    summary: 'You have heart disease and should change your medication.',
  }));
  assert.deepEqual(report.nutritionNotes, ['Choose oats and dal more often.']);
  assert.doesNotMatch(report.summary, /disease|medication/);
  assert.match(report.summary, /discuss your results with your doctor/);
});

test('unknown flags and categories are tolerated, out-of-range water and non-reports are not', () => {
  const report = guardReportOutput({ ...draft(), hydration: { reason: 'x', suggestedLitres: 9 }, values: [{ ...value('Vitamin D', 'high'), category: 'weird', flag: 'odd' }] });
  assert.equal(report.values[0].flag, 'unknown');
  assert.equal(report.values[0].category, 'other');
  assert.equal(report.hydration.suggestedLitres, null);
  assert.throws(() => guardReportOutput(draft({ values: [value('Not a health report', 'unknown')] })), /doesn’t look like a health report/);
  assert.throws(() => guardReportOutput({ title: 'x' }), AiProviderError);
});

test('health notes list flagged values first, then food notes, capped at 8', () => {
  const notes = healthNotesFrom({ nutritionNotes: ['Eat more fibre.'], reportDate: '2026-09-20', values: [value('LDL Cholesterol', 'high'), value('HDL Cholesterol', 'normal')] });
  assert.deepEqual(notes, ['LDL Cholesterol 162 mg/dL is high (lab range < 130) (report 2026-09-20)', 'Eat more fibre.']);
  assert.deepEqual(healthNotesFrom(null), []);
  assert.equal(healthNotesFrom({ nutritionNotes: Array(10).fill('note'), reportDate: null, values: [] }).length, 8);
});

test('the fallback provider refuses to read reports instead of inventing values', async () => {
  await assert.rejects(createFallbackProvider().extractReport([{ base64: 'aGk=', mimeType: 'application/pdf' }]), AiProviderError);
});

test('Gemini gets every page inline (PDF included) with the safety prompt', async () => {
  let body: { contents: { parts: Array<{ inlineData?: { mimeType: string }; text?: string }> }[] } | undefined;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    body = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(draft()) }] } }] }), { status: 200 });
  }) as typeof fetch;
  await createGeminiProvider({ apiKey: 'k', model: 'a' }).extractReport([{ base64: 'aGk=', mimeType: 'application/pdf' }, { base64: 'aGk=', mimeType: 'image/jpeg' }]);
  const parts = body!.contents[0].parts;
  assert.deepEqual(parts.slice(1).map(part => part.inlineData?.mimeType), ['application/pdf', 'image/jpeg']);
  assert.match(parts[0].text!, /compare ONLY with the reference range printed on the report/);
  assert.match(parts[0].text!, /Never invent values/);
  assert.match(parts[0].text!, /set suggestedLitres to null/);
});

test('the report service returns a screened draft and saves nothing while extracting', async () => {
  const saved: unknown[] = [];
  const provider = { extractReport: async () => draft({ values: [value('eGFR', 'low', 'kidney')] }) } as unknown as AiProvider;
  const repository = { create: async (_guest: string, input: unknown) => { saved.push(input); return input; } } as never;
  const result = await createReportService(repository, provider).extract({ files: [{ base64: 'aGk=', mimeType: 'image/jpeg' }] });
  assert.equal(result.hydration.suggestedLitres, null);
  assert.equal(saved.length, 0);
});

test('meal health tips are kept when food-level and dropped when they give medical advice', () => {
  const base = { assumptions: ['One plate'], caloriesKcal: 500, carbsGrams: 60, confidence: 'medium' as const, fatGrams: 20, name: 'Pakora', proteinGrams: 10, source: 'ai' as const };
  assert.equal(guardMealEstimateOutput({ ...base, healthTip: 'Fried and salty; your report notes suggest going easy on these.' }).healthTip, 'Fried and salty; your report notes suggest going easy on these.');
  assert.equal(guardMealEstimateOutput({ ...base, healthTip: 'Take your statin after this.' }).healthTip, undefined);
  assert.equal(guardMealEstimateOutput({ ...base, healthTip: '' }).healthTip, undefined);
});
