export function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

type PlanTargetColumns = {
  carbsTargetGrams: number | null;
  dailyStepsTarget: number | null;
  fatTargetGrams: number | null;
  planRationale: string | null;
  proteinTargetGrams: number | null;
};

/** Plan targets in API shape; macroTargets is null unless all three macros are set. */
export function serializePlanTargets(goal: PlanTargetColumns) {
  const hasMacros = goal.proteinTargetGrams != null && goal.carbsTargetGrams != null && goal.fatTargetGrams != null;
  return {
    dailyStepsTarget: goal.dailyStepsTarget,
    macroTargets: hasMacros
      ? { carbsGrams: goal.carbsTargetGrams!, fatGrams: goal.fatTargetGrams!, proteinGrams: goal.proteinTargetGrams! }
      : null,
    planRationale: goal.planRationale,
  };
}

export function serializeGoal(goal: PlanTargetColumns & {
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
    ...serializePlanTargets(goal),
  };
}
