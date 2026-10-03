CREATE TYPE "public"."wellness_plan_kind" AS ENUM('diet', 'exercise');--> statement-breakpoint
CREATE TYPE "public"."wellness_plan_source" AS ENUM('ai', 'fallback');--> statement-breakpoint
CREATE TABLE "wellness_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"kind" "wellness_plan_kind" NOT NULL,
	"title" varchar(120) NOT NULL,
	"options" jsonb NOT NULL,
	"content" jsonb NOT NULL,
	"source" "wellness_plan_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wellness_plans" ADD CONSTRAINT "wellness_plans_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wellness_plans_guest_id_idx" ON "wellness_plans" USING btree ("guest_id");