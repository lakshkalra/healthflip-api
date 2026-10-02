export function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function serializeGoal(goal: {
  createdAt: Date;
  dailyCalorieTarget: number;
  id: string;
  startsOn: string;
  type: 'lose' | 'maintain' | 'gain';
}) {
  return {
    createdAt: goal.createdAt.toISOString(),
    dailyCalorieTarget: goal.dailyCalorieTarget,
    id: goal.id,
    startsOn: goal.startsOn,
    type: goal.type,
  };
}
