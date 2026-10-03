CREATE TYPE "public"."memory_category" AS ENUM('diet', 'allergy', 'preference', 'routine', 'goal', 'other');--> statement-breakpoint
CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active');--> statement-breakpoint
CREATE TYPE "public"."profile_sex" AS ENUM('female', 'male', 'unspecified');--> statement-breakpoint
CREATE TABLE "guest_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"text" varchar(200) NOT NULL,
	"category" "memory_category" DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guest_profiles" (
	"guest_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(60) NOT NULL,
	"age" smallint NOT NULL,
	"sex" "profile_sex" NOT NULL,
	"height_cm" numeric(5, 1) NOT NULL,
	"weight_kg" numeric(5, 1) NOT NULL,
	"activity_level" "activity_level" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guest_profiles_age_range" CHECK ("guest_profiles"."age" between 18 and 100),
	CONSTRAINT "guest_profiles_height_range" CHECK ("guest_profiles"."height_cm" between 120 and 230),
	CONSTRAINT "guest_profiles_weight_range" CHECK ("guest_profiles"."weight_kg" between 30 and 300)
);
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "protein_target_grams" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "carbs_target_grams" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "fat_target_grams" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "daily_steps_target" integer;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "plan_rationale" text;--> statement-breakpoint
ALTER TABLE "guest_memories" ADD CONSTRAINT "guest_memories_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_profiles" ADD CONSTRAINT "guest_profiles_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guest_memories_guest_id_idx" ON "guest_memories" USING btree ("guest_id");