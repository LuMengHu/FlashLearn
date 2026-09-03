CREATE TABLE "Words" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"phonetic" text,
	"meaning" text NOT NULL,
	"senses" jsonb DEFAULT '[]'::jsonb,
	"family" jsonb DEFAULT '[]'::jsonb,
	"confusables" jsonb DEFAULT '[]'::jsonb,
	"etymology" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "Words_word_unique" ON "Words" USING btree ("word");