import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planFileName } from '../src/modules/plans/plan.helper.js';
import { renderPlanPdf } from '../src/modules/plans/plan.pdf.js';
import { avoidedFoods, fallbackDietPlan, fallbackExercisePlan } from '../src/shared/ai/fallback-plans.js';
import { dietPlanContentSchema, dietPlanOptionsSchema, exercisePlanContentSchema, exercisePlanOptionsSchema } from '../src/shared/plans.js';

const context = {
  goal: { dailyCalorieTarget: 1800, dailyStepsTarget: 8000, macroTargets: { carbsGrams: 200, fatGrams: 54, proteinGrams: 110 }, type: 'lose' as const },
  healthNotes: [] as string[],
  memories: ['Vegetarian'],
  profile: { activityLevel: 'light' as const, age: 29, heightCm: 162, name: 'Priya Sharma', sex: 'female' as const, weightKg: 64 },
};

test('every fallback diet plan is schema-valid and follows the diet type', () => {
  for (const dietType of ['vegetarian', 'non-vegetarian', 'vegan', 'eggetarian', 'any'] as const) {
    for (const days of [1, 3, 7] as const) {
      const plan = fallbackDietPlan(context, dietPlanOptionsSchema.parse({ days, dietType }));
      assert.ok(dietPlanContentSchema.safeParse(plan).success, `${dietType}/${days}`);
      assert.equal(plan.days.length, days);
      const foods = JSON.stringify(plan.days).toLowerCase();
      if (dietType === 'vegan') assert.doesNotMatch(foods, /paneer|curd|milk|egg|chicken|fish|raita|chaas/);
      if (dietType === 'vegetarian') assert.doesNotMatch(foods, /egg|chicken|fish/);
    }
  }
  const plan = fallbackDietPlan(context, dietPlanOptionsSchema.parse({}));
  assert.equal(plan.title, 'Priya’s 7-day Indian meal plan'.replace('’', "'"));
  assert.equal(plan.dailyCalories, 1800);
  assert.deepEqual(plan.macros, context.goal.macroTargets);
});

test('fallback diet plans leave out foods the user is allergic to or avoids', () => {
  assert.deepEqual(avoidedFoods(['Allergic to peanuts', 'Hates bitter gourd', 'Vegetarian', 'Goes to the gym at 7am']), ['peanut', 'bitter', 'gourd']);
  const plan = fallbackDietPlan({ ...context, memories: ['Allergic to peanuts', 'Avoids paneer'] }, dietPlanOptionsSchema.parse({ days: 7, dietType: 'vegetarian' }));
  const foods = JSON.stringify(plan.days).toLowerCase();
  assert.doesNotMatch(foods, /peanut|paneer/);
  assert.ok(dietPlanContentSchema.safeParse(plan).success);
});

test('fallback exercise plans have exactly the requested training days in a 7-day week', () => {
  for (const daysPerWeek of [2, 3, 4, 5, 6]) {
    for (const location of ['home', 'gym', 'outdoors'] as const) {
      const plan = fallbackExercisePlan(context, exercisePlanOptionsSchema.parse({ daysPerWeek, location }));
      assert.ok(exercisePlanContentSchema.safeParse(plan).success, `${daysPerWeek}/${location}`);
      assert.equal(plan.days.length, 7);
      assert.equal(plan.days.filter(day => !day.rest).length, daysPerWeek);
      for (const day of plan.days) {
        const names = day.exercises.map(exercise => exercise.name);
        assert.equal(new Set(names).size, names.length, `duplicate exercise on ${day.label}: ${names.join(', ')}`);
      }
    }
  }
});

test('renders a plan PDF, including names the built-in fonts cannot draw', async () => {
  const content = fallbackDietPlan(context, dietPlanOptionsSchema.parse({ days: 7 }));
  const bytes = await renderPlanPdf({ content, createdAt: new Date('2026-10-03T08:00:00Z'), kind: 'diet' }, 'प्रिया Priya');
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(bytes.length > 3_000);

  const workout = fallbackExercisePlan(context, exercisePlanOptionsSchema.parse({ daysPerWeek: 4, location: 'gym' }));
  const workoutBytes = await renderPlanPdf({ content: workout, createdAt: new Date(), kind: 'exercise' }, null);
  assert.equal(workoutBytes.subarray(0, 5).toString(), '%PDF-');
});

test('download file names are slugged and safe', () => {
  assert.equal(planFileName('Priya’s 7-day Indian meal plan'), 'priya-s-7-day-indian-meal-plan.pdf');
  assert.equal(planFileName('"/../etc'), 'etc.pdf');
  assert.equal(planFileName('॥'), 'healthflip-plan.pdf');
});
