CREATE TABLE "EnglishBotSessions" (
	"peer" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL,
	"revision" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EnglishCollectionWords" (
	"collection_id" bigint NOT NULL,
	"word_id" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EnglishCollections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EnglishConfusions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"word_id" bigint NOT NULL,
	"other_word" text NOT NULL,
	"other_meaning" text NOT NULL,
	"tip" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EnglishMemory" (
	"key" text PRIMARY KEY NOT NULL,
	"state" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "EnglishReviewEvents" (
	"id" text PRIMARY KEY NOT NULL,
	"item_key" text NOT NULL,
	"rating" text NOT NULL,
	"channel" text NOT NULL,
	"previous" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"undone" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "Words" ADD COLUMN "kind" text DEFAULT 'word' NOT NULL;--> statement-breakpoint
ALTER TABLE "Words" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "Words" ADD COLUMN "source_context" text;--> statement-breakpoint
ALTER TABLE "EnglishCollectionWords" ADD CONSTRAINT "EnglishCollectionWords_collection_id_EnglishCollections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."EnglishCollections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EnglishCollectionWords" ADD CONSTRAINT "EnglishCollectionWords_word_id_Words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."Words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "EnglishConfusions" ADD CONSTRAINT "EnglishConfusions_word_id_Words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."Words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "EnglishCollectionWords_unique" ON "EnglishCollectionWords" USING btree ("collection_id","word_id");--> statement-breakpoint
CREATE UNIQUE INDEX "EnglishConfusions_pair_unique" ON "EnglishConfusions" USING btree ("word_id","other_word");
--> statement-breakpoint
-- Preserve legacy recognition history; make existing learned items due for calibration.
INSERT INTO "EnglishMemory" (key,state)
SELECT 'word:' || p.item_id, jsonb_build_object(
  'revision',0,'seen',p.seen_count,'lapses',p.wrong_count,
  'intervalDays',CASE WHEN p.level >= 5 THEN 7 WHEN p.level >= 3 THEN 3 ELSE 1 END,
  'dueAt',to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'lastReviewedAt',p.last_seen_at,'lastAdvancedAt',p.last_seen_at,
  'lastRating',CASE WHEN p.level=0 THEN 'again' ELSE 'good' END
) FROM "StudyProgress" p JOIN "Words" w ON w.id=p.item_id
WHERE p.item_type='word' AND p.seen_count > 0 ON CONFLICT (key) DO NOTHING;
