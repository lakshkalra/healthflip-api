CREATE TABLE "guest_foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"serving" varchar(200) NOT NULL,
	"calories_kcal" integer NOT NULL,
	"protein_grams" numeric(8, 1),
	"carbs_grams" numeric(8, 1),
	"fat_grams" numeric(8, 1),
	"times_used" integer DEFAULT 1 NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "guest_foods" ADD CONSTRAINT "guest_foods_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "guest_foods_guest_name_idx" ON "guest_foods" USING btree ("guest_id",lower("name"));--> statement-breakpoint
CREATE INDEX "guest_foods_guest_last_used_idx" ON "guest_foods" USING btree ("guest_id","last_used_at");