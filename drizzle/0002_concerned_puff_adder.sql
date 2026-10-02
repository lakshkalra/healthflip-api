CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'snacks', 'dinner');--> statement-breakpoint
ALTER TABLE "meal_entries" ADD COLUMN "meal_type" "meal_type" DEFAULT 'snacks' NOT NULL;