CREATE TABLE "StudyProgress" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_id" bigint NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"seen_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"wrong_count" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "StudyProgress_item_unique" ON "StudyProgress" USING btree ("item_type","item_id");