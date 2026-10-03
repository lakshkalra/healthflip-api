import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import type { HealthReportRepository } from '../../db/repositories/health-report.repository.js';
import type { MealRepository } from '../../db/repositories/meal.repository.js';
import type { WaterRepository } from '../../db/repositories/water.repository.js';
import { getDayRangeUtc } from '../../shared/time.js';
import { serializeReportSummary } from '../reports/report.helper.js';
import { serializeDailyDashboard } from './dashboard.helper.js';

export function createDashboardService(
  goalRepository: GoalRepository,
  mealRepository: MealRepository,
  waterRepository: WaterRepository,
  healthReportRepository: HealthReportRepository,
) {
  return {
    async getDaily(guestId: string, date: string, timeZone: string) {
      const range = getDayRangeUtc(date, timeZone);
      const [goal, summary, waterTarget, consumedMl, latestReport] = await Promise.all([
        goalRepository.findCurrent(guestId),
        mealRepository.getDailySummary(guestId, range.start, range.end),
        waterRepository.findTarget(guestId),
        waterRepository.totalForDay(guestId, date),
        healthReportRepository.latest(guestId),
      ]);

      return {
        ...serializeDailyDashboard({ date, goal, summary, timeZone }),
        latestReport: latestReport ? serializeReportSummary(latestReport) : null,
        water: { consumedMl, source: waterTarget?.source ?? null, targetMl: waterTarget?.targetMl ?? null },
      };
    },
  };
}
