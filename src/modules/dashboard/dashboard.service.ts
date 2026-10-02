import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import type { MealRepository } from '../../db/repositories/meal.repository.js';
import { getDayRangeUtc } from '../../shared/time.js';
import { serializeDailyDashboard } from './dashboard.helper.js';

export function createDashboardService(
  goalRepository: GoalRepository,
  mealRepository: MealRepository,
) {
  return {
    async getDaily(guestId: string, date: string, timeZone: string) {
      const range = getDayRangeUtc(date, timeZone);
      const [goal, summary] = await Promise.all([
        goalRepository.findCurrent(guestId),
        mealRepository.getDailySummary(guestId, range.start, range.end),
      ]);

      return serializeDailyDashboard({ date, goal, summary, timeZone });
    },
  };
}
