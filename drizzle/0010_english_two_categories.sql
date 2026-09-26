ALTER TABLE "Words" ADD COLUMN IF NOT EXISTS excluded boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "EnglishConfusions" ADD COLUMN IF NOT EXISTS group_key text NOT NULL DEFAULT '';
