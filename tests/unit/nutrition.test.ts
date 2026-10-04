import assert from 'node:assert/strict';
import { test } from 'node:test';

import { guardPlanOutput } from '../../src/modules/ai/ai.guardrails.js';
import { planBaseline } from '../../src/domain/nutrition.js';

const man = { activityLevel: 'moderate', age: 30, heightCm: 178, sex: 'male', weightKg: 75 } as const;
const woman = { activityLevel: 'sedentary', age: 25, heightCm: 165, sex: 'female', weightKg: 60 } as const;

test('maintenance baseline follows Mifflin-St Jeor with the activity factor', () => {
  // BMR 1717.5 × 1.55 = 2662 → 2650; protein 75 kg × 1.6; fat 27%; carbs the remainder.
  assert.deepEqual(planBaseline(man, 'maintain'), {
    bmr: 1718,
    calorieFloor: 1700,
    carbsGrams: 363,
    dailyCalorieTarget: 2650,
    dailySteps: 9000,
    fatGrams: 80,
    proteinGrams: 120,
    tdee: 2662,
  });
});

test('a weight-loss plan never drops below BMR or 1200 kcal and adds steps', () => {
  // TDEE 1614 − 500 = 1114 would undercut BMR (1345), so the floor of 1350 applies.
  const plan = planBaseline(woman, 'lose');
  assert.equal(plan.dailyCalorieTarget, 1350);
  assert.equal(plan.calorieFloor, 1350);
  assert.equal(plan.dailySteps, 7500);
  assert.equal(plan.proteinGrams, 108);
});

test('macros add up to the calorie target', () => {
  const plan = planBaseline(man, 'gain');
  const kcal = plan.proteinGrams * 4 + plan.carbsGrams * 4 + plan.fatGrams * 9;
  assert.ok(Math.abs(kcal - plan.dailyCalorieTarget) <= 10, `${kcal} vs ${plan.dailyCalorieTarget}`);
});

test('accepts an AI plan within 10% of the baseline', () => {
  const baseline = planBaseline(man, 'maintain');
  const plan = guardPlanOutput({ carbsGrams: 340, dailyCalorieTarget: 2550, dailySteps: 10000, fatGrams: 80, proteinGrams: 130, rationale: 'Nice and steady, Arjun!', source: 'ai' }, baseline);
  assert.deepEqual(plan, { carbsGrams: 340, dailyCalorieTarget: 2550, dailySteps: 10000, fatGrams: 80, proteinGrams: 130, rationale: 'Nice and steady, Arjun!', source: 'ai' });
});

test('replaces out-of-range AI numbers with the baseline but keeps the wording', () => {
  const baseline = planBaseline(man, 'maintain');
  const plan = guardPlanOutput({ carbsGrams: 100, dailyCalorieTarget: 1500, dailySteps: 40000, fatGrams: 20, proteinGrams: 100, rationale: 'Go hard!', source: 'ai' }, baseline);
  assert.equal(plan.dailyCalorieTarget, baseline.dailyCalorieTarget);
  assert.equal(plan.proteinGrams, baseline.proteinGrams);
  assert.equal(plan.dailySteps, baseline.dailySteps);
  assert.equal(plan.rationale, 'Go hard!');
});

test('rejects macros that do not add up to the calories', () => {
  const baseline = planBaseline(man, 'maintain');
  const plan = guardPlanOutput({ carbsGrams: 50, dailyCalorieTarget: 2650, dailySteps: 9000, fatGrams: 20, proteinGrams: 50, rationale: 'ok', source: 'ai' }, baseline);
  assert.equal(plan.dailyCalorieTarget, 2650);
  assert.deepEqual([plan.proteinGrams, plan.carbsGrams, plan.fatGrams], [baseline.proteinGrams, baseline.carbsGrams, baseline.fatGrams]);
});
