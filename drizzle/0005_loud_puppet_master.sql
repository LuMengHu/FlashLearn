CREATE TABLE "ChineseItems" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"wrong" text,
	"note" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ChineseItems_type_front_unique" ON "ChineseItems" USING btree ("type","front");--> statement-breakpoint
ALTER TABLE "Words" DROP COLUMN "phonetic";