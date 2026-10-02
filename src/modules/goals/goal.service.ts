import type { GoalRepository } from '../../db/repositories/goal.repository.js';
import { notFound } from '../../shared/errors.js';
import { currentDate, serializeGoal } from './goal.helper.js';
import type { ReplaceGoalInput } from './goal.validator.js';

export function createGoalService(goalRepository: GoalRepository) {
  return {
    async getCurrent(guestId: string) {
      const goal = await goalRepository.findCurrent(guestId);
      return goal ? serializeGoal(goal) : null;
    },

    async replaceCurrent(guestId: string, input: ReplaceGoalInput) {
      const goal = await goalRepository.replaceCurrent(guestId, {
        ...input,
        startsOn: input.startsOn ?? currentDate(),
      });

      if (!goal) {
        throw notFound('Goal');
      }

      return serializeGoal(goal);
    },
  };
}
