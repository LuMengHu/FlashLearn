import { createHash } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { db, sql } from '@/lib/db';
import { words } from '@/lib/schema';
import { catalog, EMPTY_MEMORY, normalizeTerm, schedule, scopeItems } from './learning';
import type { CollectionKind, Confusion, ImportRow, MemoryState, Rating, Workspace } from './types';

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function stringValue(value: unknown, label: string, max = 1000, required = true): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new RequestError(`${label}格式不正确。`);
  return value.trim();
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get('host') || new URL(request.url).host;
    if (originHost === requestHost) return;
  } catch { /* Reject malformed Origin values too. */ }
  throw new RequestError('请求来源不正确。', 403);
}

export function positiveId(value: unknown): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new RequestError('条目编号不正确。');
  return n;
}
function collectionKind(value: unknown): CollectionKind {
  if (!['word', 'confusion', 'phrase'].includes(String(value))) throw new RequestError('词表类别不正确。');
  return value as CollectionKind;
}

export async function workspace(): Promise<Workspace> {
  const [vocabulary, collections, memberships, confusions, memory] = await Promise.all([
    db.select().from(words).orderBy(desc(words.createdAt)),
    sql.query('SELECT id::int, name, kind, created_at AS "createdAt" FROM "EnglishCollections" ORDER BY created_at DESC'),
    sql.query('SELECT collection_id::int AS "collectionId", word_id::int AS "wordId" FROM "EnglishCollectionWords"'),
    sql.query('SELECT id::int, word_id::int AS "wordId", other_word AS "otherWord", other_meaning AS "otherMeaning", tip, created_at AS "createdAt" FROM "EnglishConfusions"'),
    sql.query('SELECT key,state FROM "EnglishMemory"'),
  ]);
  const pairs: Confusion[] = confusions.map(pair => ({ id: String(pair.id), wordId: Number(pair.wordId), otherWord: String(pair.otherWord), otherMeaning: String(pair.otherMeaning), tip: String(pair.tip || ''), createdAt: String(pair.createdAt) }));
  const pairKeys = new Set(pairs.map(pair => `${pair.wordId}:${normalizeTerm(pair.otherWord)}`));
  for (const word of vocabulary) for (const suggestion of word.confusables ?? []) {
    const otherWord = suggestion.word?.trim();
    const otherMeaning = suggestion.meaning?.trim();
    if (!otherWord || !otherMeaning || normalizeTerm(otherWord) === normalizeTerm(word.word)) continue;
    const key = `${word.id}:${normalizeTerm(otherWord)}`;
    if (pairKeys.has(key)) continue;
    pairKeys.add(key);
    pairs.push({ id: `auto:${word.id}:${createHash('sha256').update(normalizeTerm(otherWord)).digest('hex').slice(0, 16)}`, wordId: word.id,
      otherWord, otherMeaning, tip: suggestion.tip || '', createdAt: word.createdAt?.toISOString() || '' });
  }
  return JSON.parse(JSON.stringify({
    words: vocabulary,
    collections: collections.map(collection => ({ ...collection, wordIds: memberships.filter(member => member.collectionId === collection.id).map(member => member.wordId) })),
    confusions: pairs, memory: Object.fromEntries(memory.map(item => [item.key, item.state])),
  }));
}

async function validateCollectionMembers(kind: CollectionKind, ids: number[]) {
  if (!ids.length) return;
  const rows = await sql.query('SELECT id::int, kind FROM "Words" WHERE id=ANY($1::bigint[])', [ids]);
  if (rows.length !== ids.length) throw new RequestError('所选词条中有内容已不存在。');
  if (kind === 'word' && rows.some(row => row.kind !== 'word')) throw new RequestError('单词词表只能加入单词。');
  if (kind === 'phrase' && rows.some(row => row.kind !== 'phrase')) throw new RequestError('短语词表只能加入短语。');
  if (kind === 'confusion') {
    const data = await workspace();
    const allowed = new Set(scopeItems(data, 'confusion').flatMap(item => item.wordIds ?? [item.wordId]));
    if (ids.some(id => !allowed.has(id))) throw new RequestError('易混词表只能加入后台已有辨析关系的单词。');
  }
}

export async function importVocabulary(input: unknown, name: unknown) {
  const title = stringValue(name, '清单名称', 100);
  if (!Array.isArray(input) || !input.length || input.length > 200) throw new RequestError('请添加 1–200 条词汇。');
  const unique = new Map<string, ImportRow>();
  for (const value of input) {
    if (!value || typeof value !== 'object') throw new RequestError('词汇格式不正确。');
    const row = value as Record<string, unknown>;
    const word = normalizeTerm(stringValue(row.word, '单词或短语', 120));
    if (row.kind !== 'word' && row.kind !== 'phrase') throw new RequestError('请选择单词或短语。');
    unique.set(word, {
      word, kind: row.kind, meaning: stringValue(row.meaning, '核心释义', 1000),
      example: stringValue(row.example ?? '', '例句', 2000, false),
      translation: stringValue(row.translation ?? '', '翻译', 2000, false),
      source: stringValue(row.source ?? title, '来源', 200, false),
      sourceContext: stringValue(row.sourceContext ?? '', '原句', 2000, false),
    });
  }
  const kinds = new Set([...unique.values()].map(row => row.kind));
  if (kinds.size !== 1) throw new RequestError('单词和短语请分成两份词表导入。');
  const kind = [...kinds][0];

  const result = await sql.query(`
    WITH input AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(word text, meaning text, kind text, example text, translation text, source text, "sourceContext" text)),
    saved AS (
      INSERT INTO "Words" (word, meaning, kind, senses, source, source_context)
      SELECT word, meaning, kind, CASE WHEN example <> '' THEN jsonb_build_array(jsonb_build_object('meaning',meaning,'example',example,'translation',translation)) ELSE '[]'::jsonb END, source, "sourceContext" FROM input
      ON CONFLICT (word) DO UPDATE SET word = EXCLUDED.word RETURNING id
    ), collection AS (INSERT INTO "EnglishCollections" (name,kind) VALUES ($2,$3) RETURNING id),
    members AS (INSERT INTO "EnglishCollectionWords" (collection_id, word_id) SELECT collection.id, saved.id FROM collection CROSS JOIN saved RETURNING word_id)
    SELECT collection.id::int, (SELECT count(*)::int FROM members) AS count FROM collection`, [JSON.stringify([...unique.values()]), title, kind]);
  return { ...result[0], kind };
}

export async function mutateWorkspace(body: Record<string, unknown>) {
  switch (body.action) {
    case 'import': return importVocabulary(body.rows, body.name);
    case 'deleteWord': {
      const id = positiveId(body.id);
      const existing = await db.query.words.findFirst({ where: eq(words.id, id) });
      if (!existing) throw new RequestError('这个词已不存在。', 404);
      const wordKey = `word:${id}`;
      await sql.transaction([
        sql.query('DELETE FROM "EnglishReviewEvents" WHERE item_key=$1 OR item_key LIKE $2', [wordKey, 'confusion-group:%']),
        sql.query('DELETE FROM "EnglishMemory" WHERE key=$1 OR key LIKE $2', [wordKey, 'confusion-group:%']),
        sql.query('DELETE FROM "StudyProgress" WHERE item_type=$1 AND item_id=$2', ['word', id]),
        sql.query('DELETE FROM "Words" WHERE id=$1', [id]),
      ]);
      return { ok: true };
    }
    case 'save': {
      const id = positiveId(body.id);
      const existing = await db.query.words.findFirst({ where: eq(words.id, id) });
      if (!existing) throw new RequestError('这个词已不存在。', 404);
      const meaning = stringValue(body.meaning, '核心释义', 1000);
      if (body.kind !== 'word' && body.kind !== 'phrase') throw new RequestError('词条类型不正确。');
      const senses = [...(existing.senses ?? [])];
      const example = stringValue(body.example ?? '', '例句', 2000, false);
      const translation = stringValue(body.translation ?? '', '翻译', 2000, false);
      if (senses.length || example) senses[0] = { ...senses[0], meaning, example, translation };
      await db.update(words).set({ word: normalizeTerm(stringValue(body.word, '词条', 120)), meaning, kind: body.kind, senses,
        notes: stringValue(body.notes ?? '', '笔记', 8000, false), updatedAt: new Date(),
      }).where(eq(words.id, id));
      await sql.query(`DELETE FROM "EnglishCollectionWords" cw USING "EnglishCollections" c
        WHERE cw.collection_id=c.id AND cw.word_id=$1
          AND NOT (c.kind=$2 OR (c.kind='confusion' AND $2='word'))`, [id, body.kind]);
      return { id };
    }
    case 'collection': {
      const name = stringValue(body.name, '词表名称', 100);
      const kind = collectionKind(body.kind);
      const ids = Array.isArray(body.wordIds) ? [...new Set(body.wordIds.map(positiveId))] : [];
      if (ids.length > 1000) throw new RequestError('词表最多选择 1000 条。');
      await validateCollectionMembers(kind, ids);
      const [row] = await sql.query(`WITH c AS (INSERT INTO "EnglishCollections" (name,kind) VALUES ($1,$2) RETURNING id),
        members AS (INSERT INTO "EnglishCollectionWords" (collection_id, word_id) SELECT c.id,w.id FROM c CROSS JOIN "Words" w WHERE w.id = ANY($3::bigint[]) RETURNING word_id)
        SELECT id::int FROM c`, [name, kind, ids]);
      return row;
    }
    case 'renameCollection': {
      await sql.query('UPDATE "EnglishCollections" SET name=$1 WHERE id=$2', [stringValue(body.name, '名称', 100), positiveId(body.id)]);
      return { ok: true };
    }
    case 'deleteCollection': {
      await sql.query('DELETE FROM "EnglishCollections" WHERE id=$1', [positiveId(body.id)]);
      return { ok: true };
    }
    case 'members': {
      const id = positiveId(body.id);
      if (!Array.isArray(body.wordIds) || body.wordIds.length > 1000) throw new RequestError('请选择词条。');
      const ids = [...new Set(body.wordIds.map(positiveId))];
      if (body.remove === true) {
        await sql.query('DELETE FROM "EnglishCollectionWords" WHERE collection_id=$1 AND word_id=ANY($2::bigint[])', [id, ids]);
      } else {
        const [collection] = await sql.query('SELECT kind FROM "EnglishCollections" WHERE id=$1', [id]);
        if (!collection) throw new RequestError('这份词表已不存在。', 404);
        await validateCollectionMembers(collectionKind(collection.kind), ids);
        await sql.query('INSERT INTO "EnglishCollectionWords" (collection_id,word_id) SELECT $1,id FROM "Words" WHERE id=ANY($2::bigint[]) ON CONFLICT DO NOTHING', [id, ids]);
      }
      return { ok: true };
    }
    case 'confusion': {
      const wordId = positiveId(body.wordId);
      const otherWord = normalizeTerm(stringValue(body.otherWord, '易混词', 120));
      const word = await db.query.words.findFirst({ where: eq(words.id, wordId) });
      if (!word) throw new RequestError('请先把原词加入词库。', 404);
      if (normalizeTerm(word.word) === otherWord) throw new RequestError('请填写另一个容易认错的词。');
      const [saved] = await sql.query(`INSERT INTO "EnglishConfusions" (word_id,other_word,other_meaning,tip) VALUES ($1,$2,$3,$4)
        ON CONFLICT (word_id,other_word) DO UPDATE SET other_meaning=EXCLUDED.other_meaning,tip=EXCLUDED.tip RETURNING id::int`,
      [wordId, otherWord, stringValue(body.otherMeaning, '易混词释义', 1000), stringValue(body.tip ?? '', '辨析', 2000, false)]);
      await sql.query('DELETE FROM "EnglishMemory" WHERE key LIKE $1', ['confusion-group:%']);
      return saved;
    }
    case 'deleteConfusion': {
      const id = positiveId(body.id);
      await sql.transaction([
        sql.query('DELETE FROM "EnglishConfusions" WHERE id=$1', [id]),
        sql.query('DELETE FROM "EnglishMemory" WHERE key LIKE $1', ['confusion-group:%']),
      ]);
      return { ok: true };
    }
    default: throw new RequestError('无法识别这个操作。');
  }
}

type EventRow = { id: string; item_key: string; rating: Rating; previous: MemoryState; result: MemoryState; undone: number };
export async function review(input: Record<string, unknown>, channel = 'web') {
  const eventId = stringValue(input.eventId, '作答编号', 150);
  const key = stringValue(input.key, '词条编号', 100);
  const rating = input.rating;
  if (!['again', 'good'].includes(String(rating))) throw new RequestError('作答结果不正确。');
  const existing = await sql.query('SELECT * FROM "EnglishReviewEvents" WHERE id=$1', [eventId]) as EventRow[];
  if (existing[0]) {
    if (existing[0].item_key !== key || existing[0].rating !== rating || existing[0].undone) throw new RequestError('这次作答已被使用或撤销，请刷新后重试。', 409);
    return { eventId, key, state: existing[0].result };
  }
  const data = await workspace();
  if (!catalog(data).some(item => item.key === key)) throw new RequestError('这个学习条目已不存在。', 404);
  const previous = data.memory[key] ?? { ...EMPTY_MEMORY };
  if (input.revision !== previous.revision) throw new RequestError('另一个页面或微信已更新这个词，请刷新进度后重试。', 409);
  const result = schedule(previous, rating as Rating);
  try {
    const rows = await sql.query(`WITH changed AS (
      INSERT INTO "EnglishMemory" (key,state) VALUES ($1,$2::jsonb)
      ON CONFLICT (key) DO UPDATE SET state=EXCLUDED.state WHERE ("EnglishMemory".state->>'revision')::int=$3 RETURNING key
    ) INSERT INTO "EnglishReviewEvents" (id,item_key,rating,channel,previous,result)
      SELECT $4,key,$5,$6,$7::jsonb,$2::jsonb FROM changed RETURNING id`,
    [key, JSON.stringify(result), previous.revision, eventId, rating, channel, JSON.stringify(previous)]);
    if (!rows.length) throw new RequestError('进度已改变，请刷新后重试。', 409);
  } catch (error) {
    const retry = await sql.query('SELECT * FROM "EnglishReviewEvents" WHERE id=$1', [eventId]) as EventRow[];
    if (retry[0] && retry[0].item_key === key && retry[0].rating === rating && !retry[0].undone) return { eventId, key, state: retry[0].result };
    throw error;
  }
  return { eventId, key, state: result };
}

export async function undo(eventId: string) {
  const [event] = await sql.query('SELECT * FROM "EnglishReviewEvents" WHERE id=$1', [eventId]) as EventRow[];
  if (!event) throw new RequestError('找不到这次作答。', 404);
  if (event.undone) {
    const [row] = await sql.query('SELECT state FROM "EnglishMemory" WHERE key=$1', [event.item_key]);
    return { key: event.item_key, state: row?.state };
  }
  const restored = { ...event.previous, revision: event.result.revision + 1 };
  const rows = await sql.query(`WITH restored AS (
    UPDATE "EnglishMemory" SET state=$2::jsonb WHERE key=$1 AND (state->>'revision')::int=$3 RETURNING key
  ) UPDATE "EnglishReviewEvents" SET undone=1 WHERE id=$4 AND EXISTS (SELECT 1 FROM restored) RETURNING id`,
  [event.item_key, JSON.stringify(restored), event.result.revision, eventId]);
  if (!rows.length) throw new RequestError('这个词已经有后续练习，无法撤销旧记录。', 409);
  return { key: event.item_key, state: restored };
}