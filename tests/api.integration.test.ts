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
        name: 'Vegetable poha',
      },
      url: '/v1/meals',
    });

    assert.equal(meal.statusCode, 200);
    assert.equal(meal.json().meal.name, 'Vegetable poha');

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

    const breakfast = await createMeal(authorization, 'Breakfast', 400, '2026-10-02T02:00:00.000Z');
    const snack = await createMeal(authorization, 'Snack', 150, '2026-10-02T10:00:00.000Z');

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
): Promise<{ id: string }> {
  const response = await app.inject({
    headers,
    method: 'POST',
    payload: { caloriesKcal, loggedAt, name },
    url: '/v1/meals',
  });
  assert.equal(response.statusCode, 200);
  return response.json().meal;
}
