import { serializePlanTargets } from '../goals/goal.helper.js';
import { serializeMeal } from '../meals/meal.helper.js';

export function serializeDailyDashboard({
  date,
  goal,
  summary,
  timeZone,
}: {
  date: string;
  goal: (Parameters<typeof serializePlanTargets>[0] & { dailyCalorieTarget: number; id: string; type: 'lose' | 'maintain' | 'gain' }) | null;
  summary: { meals: Parameters<typeof serializeMeal>[0][]; totalCalories: number };
  timeZone: string;
}) {
  const dailyCalorieTarget = goal?.dailyCalorieTarget ?? null;

  return {
    date,
    goal: goal
      ? {
          dailyCalorieTarget,
          id: goal.id,
          type: goal.type,
          ...serializePlanTargets(goal),
        }
      : null,
    meals: summary.meals.map(serializeMeal),
    remainingCalories:
      dailyCalorieTarget === null ? null : dailyCalorieTarget - summary.totalCalories,
    timezone: timeZone,
    totalCalories: summary.totalCalories,
  };
}
