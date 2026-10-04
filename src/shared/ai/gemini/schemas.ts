// Gemini structured-output schemas (responseSchema) for each AI operation.

export const mealEstimateSchema = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    caloriesKcal: { type: 'INTEGER' },
    proteinGrams: { type: 'NUMBER', nullable: true },
    carbsGrams: { type: 'NUMBER', nullable: true },
    fatGrams: { type: 'NUMBER', nullable: true },
    confidence: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    assumptions: { type: 'ARRAY', items: { type: 'STRING' } },
    healthTip: { type: 'STRING' },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          grams: { type: 'INTEGER' },
          caloriesKcal: { type: 'INTEGER' },
          proteinGrams: { type: 'NUMBER', nullable: true },
          carbsGrams: { type: 'NUMBER', nullable: true },
          fatGrams: { type: 'NUMBER', nullable: true },
        },
        required: ['name', 'grams', 'caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams'],
      },
    },
  },
  required: ['name', 'caloriesKcal', 'proteinGrams', 'carbsGrams', 'fatGrams', 'confidence', 'assumptions', 'items'],
} as const;

export const dailyInsightSchema = {
  type: 'OBJECT',
  properties: {
    message: { type: 'STRING' },
    nextAction: { type: 'STRING' },
  },
  required: ['message', 'nextAction'],
} as const;

export const planSchema = {
  type: 'OBJECT',
  properties: {
    dailyCalorieTarget: { type: 'INTEGER' },
    proteinGrams: { type: 'INTEGER' },
    carbsGrams: { type: 'INTEGER' },
    fatGrams: { type: 'INTEGER' },
    dailySteps: { type: 'INTEGER' },
    rationale: { type: 'STRING' },
  },
  required: ['dailyCalorieTarget', 'proteinGrams', 'carbsGrams', 'fatGrams', 'dailySteps', 'rationale'],
} as const;

const stringType = { type: 'STRING' } as const;

const integerType = { type: 'INTEGER' } as const;

export const dietPlanSchema = {
  type: 'OBJECT',
  properties: {
    title: stringType,
    summary: stringType,
    dailyCalories: integerType,
    macros: { type: 'OBJECT', properties: { proteinGrams: integerType, carbsGrams: integerType, fatGrams: integerType }, required: ['proteinGrams', 'carbsGrams', 'fatGrams'] },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: stringType,
          meals: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING', enum: ['breakfast', 'lunch', 'snack', 'dinner'] },
                name: stringType,
                portion: stringType,
                calories: integerType,
                proteinGrams: { type: 'NUMBER' },
              },
              required: ['type', 'name', 'portion', 'calories', 'proteinGrams'],
            },
          },
        },
        required: ['label', 'meals'],
      },
    },
    tips: { type: 'ARRAY', items: stringType },
  },
  required: ['title', 'summary', 'dailyCalories', 'macros', 'days', 'tips'],
} as const;

export const exercisePlanSchema = {
  type: 'OBJECT',
  properties: {
    title: stringType,
    summary: stringType,
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: stringType,
          focus: stringType,
          rest: { type: 'BOOLEAN' },
          durationMinutes: integerType,
          exercises: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: stringType, detail: stringType }, required: ['name', 'detail'] } },
        },
        required: ['label', 'focus', 'rest', 'durationMinutes', 'exercises'],
      },
    },
    tips: { type: 'ARRAY', items: stringType },
  },
  required: ['title', 'summary', 'days', 'tips'],
} as const;

export const reportSchema = {
  type: 'OBJECT',
  properties: {
    title: stringType,
    reportDate: { type: 'STRING', nullable: true },
    values: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: stringType,
          value: stringType,
          unit: { type: 'STRING', nullable: true },
          referenceRange: { type: 'STRING', nullable: true },
          flag: { type: 'STRING', enum: ['low', 'normal', 'high', 'critical', 'unknown'] },
          category: { type: 'STRING', enum: ['vitals', 'blood sugar', 'lipids', 'kidney', 'liver', 'thyroid', 'blood count', 'vitamins & minerals', 'electrolytes', 'heart', 'other'] },
        },
        required: ['name', 'value', 'unit', 'referenceRange', 'flag', 'category'],
      },
    },
    summary: stringType,
    nutritionNotes: { type: 'ARRAY', items: stringType },
    hydration: {
      type: 'OBJECT',
      properties: { suggestedLitres: { type: 'NUMBER', nullable: true }, reason: stringType },
      required: ['suggestedLitres', 'reason'],
    },
    urgent: { type: 'BOOLEAN' },
  },
  required: ['title', 'reportDate', 'values', 'summary', 'nutritionNotes', 'hydration', 'urgent'],
} as const;
