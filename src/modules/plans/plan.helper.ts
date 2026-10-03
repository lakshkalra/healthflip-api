import type { WellnessPlanRecord } from '../../db/repositories/wellness-plan.repository.js';

export function serializePlan(plan: WellnessPlanRecord) {
  return {
    content: plan.content,
    createdAt: plan.createdAt.toISOString(),
    id: plan.id,
    kind: plan.kind,
    options: plan.options,
    source: plan.source,
    title: plan.title,
  };
}

export function serializePlanSummary(plan: WellnessPlanRecord) {
  const content = plan.content as { summary?: string };
  return {
    createdAt: plan.createdAt.toISOString(),
    id: plan.id,
    kind: plan.kind,
    source: plan.source,
    summary: content.summary ?? '',
    title: plan.title,
  };
}

/** A safe download filename, e.g. "priyas-7-day-indian-meal-plan.pdf". */
export function planFileName(title: string): string {
  const slug = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `${slug || 'healthflip-plan'}.pdf`;
}
