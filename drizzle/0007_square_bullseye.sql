CREATE TABLE "EnglishItems" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"front" text NOT NULL,
	"hint" text,
	"back" text NOT NULL,
	"note" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "EnglishItems_type_front_unique" ON "EnglishItems" USING btree ("type","front");