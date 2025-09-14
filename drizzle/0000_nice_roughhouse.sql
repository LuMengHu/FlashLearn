CREATE TABLE "QuestionBanks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"cover_image_url" text,
	"mode" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "Questions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"bank_id" bigint NOT NULL,
	"content" text NOT NULL,
	"answer" text NOT NULL,
	"options" jsonb,
	"correct_option_index" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_bank_id_QuestionBanks_id_fk" FOREIGN KEY ("bank_id") REFERENCES "public"."QuestionBanks"("id") ON DELETE cascade ON UPDATE no action;