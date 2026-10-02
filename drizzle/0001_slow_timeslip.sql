ALTER TABLE "goals" ADD CONSTRAINT "goals_daily_calorie_target_range" CHECK ("goals"."daily_calorie_target" between 800 and 6000);--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_non_negative_nutrition" CHECK (("meal_entries"."calories_kcal" is null or "meal_entries"."calories_kcal" >= 0)
        and ("meal_entries"."protein_grams" is null or "meal_entries"."protein_grams" >= 0)
        and ("meal_entries"."carbs_grams" is null or "meal_entries"."carbs_grams" >= 0)
        and ("meal_entries"."fat_grams" is null or "meal_entries"."fat_grams" >= 0));