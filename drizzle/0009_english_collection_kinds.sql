ALTER TABLE "EnglishCollections" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'word' NOT NULL;
--> statement-breakpoint
UPDATE "EnglishCollections" SET "kind" = 'confusion'
WHERE "name" ILIKE '%易混%' OR "name" ILIKE '%confus%';
--> statement-breakpoint
UPDATE "EnglishCollections" c SET "kind" = 'phrase'
WHERE c."kind" = 'word'
  AND EXISTS (SELECT 1 FROM "EnglishCollectionWords" cw WHERE cw.collection_id = c.id)
  AND NOT EXISTS (
    SELECT 1 FROM "EnglishCollectionWords" cw
    JOIN "Words" w ON w.id = cw.word_id
    WHERE cw.collection_id = c.id AND w.kind <> 'phrase'
  );