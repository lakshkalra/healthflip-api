import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import type { HealthReportRepository } from '../../db/repositories/health-report.repository.js';
import type { MemoryRepository } from '../../db/repositories/memory.repository.js';
import type { ProfileRepository } from '../../db/repositories/profile.repository.js';
import type { WellnessPlanRepository } from '../../db/repositories/wellness-plan.repository.js';
import type { AiProvider, WellnessPlanContext } from '../../shared/ai/ai-provider.js';
import { fallbackDietPlan, fallbackExercisePlan } from '../../shared/ai/fallback-plans.js';
import { notFound } from '../../shared/errors.js';
import { healthNotesFrom } from '../../shared/reports.js';
import { dietPlanContentSchema, exercisePlanContentSchema, type DietPlanContent, type ExercisePlanContent, type PlanDraft } from '../../shared/plans.js';
import { guardPlanNotes } from '../ai/ai.guardrails.js';
import { serializePlanTargets } from '../goals/goal.helper.js';
import { toProfileContext } from '../profile/profile.helper.js';
import { renderPlanPdf } from './plan.pdf.js';
import { planFileName, serializePlan, serializePlanSummary } from './plan.helper.js';
import type { GeneratePlanInput, SavePlanInput } from './plan.validator.js';

const PLAN_MEMORY_LIMIT = 30;

export function createPlanService(
  planRepository: WellnessPlanRepository,
  profileRepository: ProfileRepository,
  goalRepository: GoalRepository,
  memoryRepository: MemoryRepository,
  provider: AiProvider,
  healthReportRepository: HealthReportRepository,
) {
  async function loadContext(guestId: string, useHealthNotes = true): Promise<WellnessPlanContext> {
    const [profile, goal, memories, report] = await Promise.all([
      profileRepository.find(guestId),
      goalRepository.findCurrent(guestId),
      memoryRepository.list(guestId, PLAN_MEMORY_LIMIT),
      useHealthNotes ? healthReportRepository.latest(guestId) : Promise.resolve(null),
    ]);
    const targets = goal ? serializePlanTargets(goal) : null;
    return {
      goal: goal && targets
        ? { dailyCalorieTarget: goal.dailyCalorieTarget, dailyStepsTarget: targets.dailyStepsTarget, macroTargets: targets.macroTargets, type: goal.type }
        : null,
      healthNotes: healthNotesFrom(report),
      memories: memories.map(memory => memory.text),
      profile: profile ? toProfileContext(profile) : null,
    };
  }

  return {
    // Returns an unsaved draft. If the AI fails or returns an invalid plan, a template plan is used
    // so the user always gets something (marked source "fallback").
    async generate(guestId: string, input: GeneratePlanInput): Promise<PlanDraft> {
      const context = await loadContext(guestId, input.kind === 'diet' ? input.options.useHealthNotes : false);
      if (input.kind === 'diet') {
        const options = { ...input.options, notes: guardPlanNotes(input.options.notes) };
        const generated = await provider.generateDietPlan(context, options).catch(() => null);
        const parsed = generated ? dietPlanContentSchema.safeParse(generated.content) : null;
        return parsed?.success
          ? { content: parsed.data as DietPlanContent, kind: 'diet', options, source: generated!.source }
          : { content: fallbackDietPlan(context, options), kind: 'diet', options, source: 'fallback' };
      }
      const options = { ...input.options, notes: guardPlanNotes(input.options.notes) };
      const generated = await provider.generateExercisePlan(context, options).catch(() => null);
      const parsed = generated ? exercisePlanContentSchema.safeParse(generated.content) : null;
      return parsed?.success
        ? { content: parsed.data as ExercisePlanContent, kind: 'exercise', options, source: generated!.source }
        : { content: fallbackExercisePlan(context, options), kind: 'exercise', options, source: 'fallback' };
    },

    async save(guestId: string, input: SavePlanInput) {
      const plan = await planRepository.create(guestId, {
        content: input.content,
        kind: input.kind,
        options: input.options,
        source: input.source,
        title: input.content.title,
      });
      return serializePlan(plan);
    },

    async list(guestId: string) {
      return (await planRepository.list(guestId)).map(serializePlanSummary);
    },

    async get(guestId: string, id: string) {
      const plan = await planRepository.find(guestId, id);
      if (!plan) throw notFound('Plan');
      return serializePlan(plan);
    },

    async delete(guestId: string, id: string) {
      if (!(await planRepository.delete(guestId, id))) throw notFound('Plan');
    },

    async pdf(guestId: string, id: string) {
      const [plan, profile] = await Promise.all([planRepository.find(guestId, id), profileRepository.find(guestId)]);
      if (!plan) throw notFound('Plan');
      const pdfPlan = plan.kind === 'diet'
        ? { content: plan.content as DietPlanContent, createdAt: plan.createdAt, kind: 'diet' as const }
        : { content: plan.content as ExercisePlanContent, createdAt: plan.createdAt, kind: 'exercise' as const };
      return { bytes: await renderPlanPdf(pdfPlan, profile?.name ?? null), fileName: planFileName(plan.title) };
    },
  };
}
