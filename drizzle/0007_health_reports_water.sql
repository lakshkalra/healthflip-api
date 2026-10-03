CREATE TYPE "public"."water_target_source" AS ENUM('user', 'report');--> statement-breakpoint
CREATE TABLE "health_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"title" varchar(80) NOT NULL,
	"report_date" date,
	"values" jsonb NOT NULL,
	"summary" text NOT NULL,
	"nutrition_notes" jsonb NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"logged_on" date NOT NULL,
	"amount_ml" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "water_logs_amount_range" CHECK ("water_logs"."amount_ml" between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "water_targets" (
	"guest_id" uuid PRIMARY KEY NOT NULL,
	"target_ml" integer NOT NULL,
	"source" "water_target_source" DEFAULT 'user' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "water_targets_range" CHECK ("water_targets"."target_ml" between 500 and 6000)
);
--> statement-breakpoint
ALTER TABLE "health_reports" ADD CONSTRAINT "health_reports_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_targets" ADD CONSTRAINT "water_targets_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "health_reports_guest_created_idx" ON "health_reports" USING btree ("guest_id","created_at");--> statement-breakpoint
CREATE INDEX "water_logs_guest_day_idx" ON "water_logs" USING btree ("guest_id","logged_on");