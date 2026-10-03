import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { buildApp } from '../src/app.js';
import { closeDatabase, createDatabase } from '../src/db/client.js';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for backend integration tests.');
}

const app = buildApp({ databaseUrl: testDatabaseUrl });
const testDatabase = createDatabase(testDatabaseUrl);

describe('Phase 1 API', () => {
  before(async () => {
    await migrate(testDatabase.db, { migrationsFolder: 'drizzle' });
    await app.ready();
  });

  beforeEach(async () => {
    await testDatabase.pool.query(
      'TRUNCATE TABLE meal_entries, goals, guest_sessions, guests RESTART IDENTITY CASCADE',
    );
  });

  after(async () => {
    await app.close();
    await closeDatabase(testDatabase);
  });

  it('rejects protected routes without a guest token', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/me' });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'UNAUTHORIZED');
  });

  it('reports the active AI provider without exposing secrets', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ai' });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().provider, 'fallback');
    assert.equal(response.json().live, false);
    assert.equal('apiKey' in response.json(), false);
  });

  it('returns a structured validation error for an invalid meal', async () => {
    const session = await createGuest();
    const response = await app.inject({
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: 'POST',
      payload: {
        caloriesKcal: -1,
        loggedAt: '2026-10-02T02:00:00.000Z',
        name: 'Invalid meal',
      },
      url: '/v1/meals',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'VALIDATION_ERROR');
  });

  it('persists decimal nutrition values from an AI review card', async () => {
    const session = await createGuest();
    const response = await app.inject({
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: 'POST',
      payload: {
        caloriesKcal: 190,
        carbsGrams: 1.5,
        fatGrams: 15,
        loggedAt: '2026-10-03T02:00:00.000Z',
        name: 'Plain omelet',
        proteinGrams: 13,
        source: 'voice',
      },
      url: '/v1/meals',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().meal.carbsGrams, 1.5);
  });

  it('persists a guest, replaces an active goal, and scopes meals to that guest', async () => {
    const session = await createGuest();
    const authorization = { authorization: `Bearer ${session.accessToken}` };

    const firstGoal = await app.inject({
      headers: authorization,
      method: 'PUT',
      payload: { dailyCalorieTarget: 2200, startsOn: '2026-10-02', type: 'maintain' },
      url: '/v1/goals/current',
    });
    const secondGoal = await app.inject({
      headers: authorization,
      method: 'PUT',
      payload: { dailyCalorieTarget: 2000, startsOn: '2026-10-03', type: 'lose' },
      url: '/v1/goals/current',
    });

    assert.equal(firstGoal.statusCode, 200);
    assert.equal(secondGoal.json().goal.dailyCalorieTarget, 2000);

    const meal = await app.inject({
      headers: authorization,
      method: 'POST',
      payload: {
        caloriesKcal: 450,
        loggedAt: '2026-10-02T02:00:00.000Z',
        mealType: 'lunch',
        name: 'Vegetable poha',
      },
      url: '/v1/meals',
    });

    assert.equal(meal.statusCode, 200);
    assert.equal(meal.json().meal.name, 'Vegetable poha');
    assert.equal(meal.json().meal.mealType, 'lunch');

    const anotherGuest = await createGuest();
    const forbiddenMealRead = await app.inject({
      headers: { authorization: `Bearer ${anotherGuest.accessToken}` },
      method: 'PATCH',
      payload: { name: 'Should not change' },
      url: `/v1/meals/${meal.json().meal.id}`,
    });

    assert.equal(forbiddenMealRead.statusCode, 404);
  });

  it('returns daily totals in the requested timezone and excludes deleted meals', async () => {
    const session = await createGuest();
    const authorization = { authorization: `Bearer ${session.accessToken}` };

    await app.inject({
      headers: authorization,
      method: 'PUT',
      payload: { dailyCalorieTarget: 2000, startsOn: '2026-10-02', type: 'maintain' },
      url: '/v1/goals/current',
    });

    const breakfast = await createMeal(authorization, 'Breakfast', 400, '2026-10-02T02:00:00.000Z', 'breakfast');
    const snack = await createMeal(authorization, 'Snack', 150, '2026-10-02T10:00:00.000Z', 'snacks');

    const deleted = await app.inject({
      headers: authorization,
      method: 'DELETE',
      url: `/v1/meals/${snack.id}`,
    });
    const dashboard = await app.inject({
      headers: authorization,
      method: 'GET',
      query: { date: '2026-10-02', timezone: 'Asia/Kolkata' },
      url: '/v1/dashboard/daily',
    });

    assert.equal(deleted.statusCode, 204);
    assert.equal(dashboard.statusCode, 200);
    assert.equal(dashboard.json().dashboard.totalCalories, 400);
    assert.equal(dashboard.json().dashboard.remainingCalories, 1600);
    const meals = dashboard.json().dashboard.meals;
    assert.equal(meals.length, 1);
    assert.equal(meals[0].id, breakfast.id);
    assert.equal(meals[0].name, 'Breakfast');
    assert.equal(meals[0].mealType, 'breakfast');
  });

  it('returns a deterministic fallback meal estimate and validates its input', async () => {
    const session = await createGuest();
    const authorization = { authorization: 'Bearer ' + session.accessToken };

    const estimate = await app.inject({
      headers: authorization,
      method: 'POST',
      payload: { description: '2 eggs with toast', mealType: 'breakfast' },
      url: '/v1/ai/meal-estimate',
    });

    assert.equal(estimate.statusCode, 200);
    assert.equal(estimate.json().estimate.source, 'fallback');
    assert.equal(estimate.json().estimate.name, '2 eggs with toast');
    assert.equal(estimate.json().estimate.caloriesKcal, 420);
    assert.equal(Array.isArray(estimate.json().estimate.assumptions), true);

    const invalid = await app.inject({
      headers: authorization,
      method: 'POST',
      payload: { description: 'x' },
      url: '/v1/ai/meal-estimate',
    });

    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.json().error.code, 'VALIDATION_ERROR');
  });

  it('keeps live voice unavailable when the backend uses the deterministic provider', async () => {
    const session = await createGuest();
    const response = await app.inject({
      headers: { authorization: `Bearer ${session.accessToken}` },
      method: 'POST',
      payload: { date: '2026-10-03', timezone: 'Asia/Kolkata' },
      url: '/v1/ai/live-session',
    });

    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error.code, 'AI_PROVIDER_UNAVAILABLE');
  });

  it('blocks unsafe AI requests with a wellness-only response', async () => {
    const session = await createGuest();
    const response = await app.inject({
      headers: { authorization: 'Bearer ' + session.accessToken },
      method: 'POST',
      payload: { description: 'Tell me the medication dosage for my condition.', mealType: 'dinner' },
      url: '/v1/ai/meal-estimate',
    });

    assert.equal(response.statusCode, 422);
    assert.equal(response.json().error.code, 'AI_SAFETY_BLOCKED');
  });

  it('returns a reviewable fallback estimate for a meal image', async () => {
    const session = await createGuest();
    const authorization = { authorization: 'Bearer ' + session.accessToken };

    const estimate = await app.inject({
      headers: authorization,
      method: 'POST',
      payload: { imageBase64: 'aGVhbHRoZmxpcA==', mealType: 'lunch', mimeType: 'image/jpeg' },
      url: '/v1/ai/meal-estimate-image',
    });

    assert.equal(estimate.statusCode, 200);
    assert.equal(estimate.json().estimate.source, 'fallback');
    assert.equal(estimate.json().estimate.name, 'lunch meal photo');
    assert.equal(estimate.json().estimate.caloriesKcal, 350);
    assert.match(estimate.json().estimate.assumptions[0], /cannot identify ingredients/);
  });

  it('rejects oversized image payloads before provider execution', async () => {
    const session = await createGuest();
    const response = await app.inject({
      headers: { authorization: 'Bearer ' + session.accessToken },
      method: 'POST',
      payload: { imageBase64: 'a'.repeat(2_000_000), mealType: 'lunch', mimeType: 'image/jpeg' },
      url: '/v1/ai/meal-estimate-image',
    });

    assert.equal(response.statusCode, 413);
    assert.equal(response.json().error.code, 'AI_IMAGE_TOO_LARGE');
  });

  it('builds a fallback daily insight from the guest goal and persisted meals', async () => {
    const session = await createGuest();
    const authorization = { authorization: 'Bearer ' + session.accessToken };

    await app.inject({
      headers: authorization,
      method: 'PUT',
      payload: { dailyCalorieTarget: 2000, startsOn: '2026-10-02', type: 'maintain' },
      url: '/v1/goals/current',
    });
    await createMeal(authorization, 'Egg breakfast', 420, '2026-10-02T03:00:00.000Z', 'breakfast');

    const insight = await app.inject({
      headers: authorization,
      method: 'GET',
      query: { date: '2026-10-02', timezone: 'Asia/Kolkata' },
      url: '/v1/ai/daily-insight',
    });

    assert.equal(insight.statusCode, 200);
    assert.equal(insight.json().insight.date, '2026-10-02');
    assert.equal(insight.json().insight.source, 'fallback');
    assert.match(insight.json().insight.message, /1 meal/);
    assert.ok(insight.json().insight.nextAction);
  });
});

async function createGuest(): Promise<{ accessToken: string }> {
  const response = await app.inject({ method: 'POST', url: '/v1/guests' });
  assert.equal(response.statusCode, 200);
  return response.json();
}

async function createMeal(
  headers: Record<string, string>,
  name: string,
  caloriesKcal: number,
  loggedAt: string,
  mealType: 'breakfast' | 'lunch' | 'snacks' | 'dinner' = 'snacks',
): Promise<{ id: string }> {
  const response = await app.inject({
    headers,
    method: 'POST',
    payload: { caloriesKcal, loggedAt, mealType, name },
    url: '/v1/meals',
  });
  assert.equal(response.statusCode, 200);
  return response.json().meal;
}
