import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Entry = { word: string; meaning: string };
type Group = { name: string; tip: string; source: string; entries: Entry[] };
type Phrase = { word: string; meaning: string; source: string; cluster?: string; example?: string };
type Curated = { version: number; groups: Group[]; phrases: Phrase[] };

async function main() {
  const file = join(process.cwd(), 'scripts/data/english/curated-2026-09.json');
  const raw = readFileSync(file, 'utf8');
  const data = JSON.parse(raw) as Curated;
  if (data.version !== 1 || data.groups.length < 70 || data.phrases.length < 140) throw new Error('整理数据数量异常，停止重建。');
  for (const group of data.groups) {
    if (!group.source || group.entries.length < 2 || group.entries.length > 20) throw new Error('易混组格式异常：' + group.name);
    if (group.entries.some(row => !row.word || !row.meaning || /\s/.test(row.word))) throw new Error('易混词格式异常：' + group.name);
  }
  if (data.phrases.some(row => !row.word || !row.meaning || !/\s/.test(row.word))) throw new Error('短语格式异常。');

  const sql = neon(process.env.DATABASE_URL!);
  const tableNames = ['Words','EnglishCollections','EnglishCollectionWords','EnglishConfusions','EnglishMemory','EnglishReviewEvents','EnglishBotSessions','EnglishItems'] as const;
  const snapshots = await Promise.all(tableNames.map(name => sql.query('SELECT * FROM "' + name + '"')));
  const progress = await sql.query('SELECT * FROM "StudyProgress" WHERE item_type IN ($1,$2)', ['word','english']);
  const backup = {
    createdAt: new Date().toISOString(),
    sourceSha256: createHash('sha256').update(raw).digest('hex'),
    tables: Object.fromEntries(tableNames.map((name,index) => [name,snapshots[index]])),
    EnglishStudyProgress: progress,
  };
  const folder = join(process.cwd(), '.local', 'backups');
  mkdirSync(folder, { recursive: true });
  const backupPath = join(folder, 'english-before-rebuild-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json');
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), { encoding: 'utf8', flag: 'wx' });
  if (statSync(backupPath).size < 100) throw new Error('备份写入失败，停止重建。');
  console.log('English backup saved:', backupPath);

  const terms = new Map<string, { word: string; meaning: string; kind: string; source: string; example: string }>();
  const listMembers: { name: string; kind: string; word: string }[] = [];
  const lists = new Map<string, { name: string; kind: string }>();
  const pairs: { anchor: string; other: string; meaning: string; tip: string; groupKey: string }[] = [];
  function listName(source: string, kind: string) {
    const base = source === '132.pdf' ? '132'
      : source === 'Practice 2 HTML p.133' ? '133'
      : source.replace('.pdf','').replaceAll('Practice','Practice');
    return base + ' · ' + (kind === 'confusion' ? '易混词' : '短语');
  }
  data.groups.forEach((group, index) => {
    const name = listName(group.source, 'confusion');
    lists.set(name, { name, kind: 'confusion' });
    const groupKey = 'curated:' + index;
    for (const row of group.entries) {
      const word = row.word.trim().toLowerCase();
      if (!terms.has(word)) terms.set(word, { word, meaning: row.meaning, kind: 'word', source: group.source, example: '' });
      listMembers.push({ name, kind: 'confusion', word });
    }
    for (const row of group.entries.slice(1)) pairs.push({
      anchor: group.entries[0].word.trim().toLowerCase(), other: row.word.trim().toLowerCase(),
      meaning: row.meaning, tip: group.tip || '', groupKey,
    });
  });
  for (const phrase of data.phrases) {
    const word = phrase.word.trim().toLowerCase();
    if (terms.has(word)) throw new Error('易混词与短语重名：' + word);
    const name = listName(phrase.source, 'phrase');
    lists.set(name, { name, kind: 'phrase' });
    terms.set(word, { word, meaning: phrase.meaning, kind: 'phrase', source: phrase.source, example: phrase.example || '' });
    listMembers.push({ name, kind: 'phrase', word });
  }

  await sql.transaction([
    sql.query('DELETE FROM "EnglishReviewEvents"'),
    sql.query('DELETE FROM "EnglishMemory"'),
    sql.query('DELETE FROM "EnglishBotSessions"'),
    sql.query('DELETE FROM "EnglishCollectionWords"'),
    sql.query('DELETE FROM "EnglishCollections"'),
    sql.query('DELETE FROM "EnglishConfusions"'),
    sql.query('DELETE FROM "EnglishItems"'),
    sql.query('DELETE FROM "StudyProgress" WHERE item_type IN ($1,$2)', ['word','english']),
    sql.query('DELETE FROM "Words"'),
    sql.query('INSERT INTO "Words" (word,meaning,kind,source,senses,excluded) SELECT word,meaning,kind,source,CASE WHEN example<>$$$$ THEN jsonb_build_array(jsonb_build_object($$meaning$$,meaning,$$example$$,example)) ELSE $$[]$$::jsonb END,false FROM jsonb_to_recordset($1::jsonb) AS x(word text,meaning text,kind text,source text,example text)', [JSON.stringify([...terms.values()])]),
    sql.query('INSERT INTO "EnglishCollections" (name,kind) SELECT name,kind FROM jsonb_to_recordset($1::jsonb) AS x(name text,kind text)', [JSON.stringify([...lists.values()])]),
    sql.query('INSERT INTO "EnglishConfusions" (word_id,other_word,other_meaning,tip,group_key) SELECT w.id,p.other,p.meaning,p.tip,p."groupKey" FROM jsonb_to_recordset($1::jsonb) AS p(anchor text,other text,meaning text,tip text,"groupKey" text) JOIN "Words" w ON w.word=p.anchor', [JSON.stringify(pairs)]),
    sql.query('INSERT INTO "EnglishCollectionWords" (collection_id,word_id) SELECT DISTINCT c.id,w.id FROM jsonb_to_recordset($1::jsonb) AS m(name text,kind text,word text) JOIN "EnglishCollections" c ON c.name=m.name AND c.kind=m.kind JOIN "Words" w ON w.word=m.word', [JSON.stringify(listMembers)]),
  ]);
  const [counts] = await sql.query('SELECT (SELECT count(*)::int FROM "Words") AS words,(SELECT count(*)::int FROM "EnglishCollections") AS lists,(SELECT count(*)::int FROM "EnglishConfusions") AS pairs,(SELECT count(*)::int FROM "EnglishMemory") AS memory');
  if (Number(counts.words) !== terms.size || Number(counts.lists) !== lists.size || Number(counts.pairs) !== pairs.length || Number(counts.memory) !== 0) throw new Error('重建后数据量不匹配，请立即检查备份与数据库。');
  console.log('English rebuilt:', counts, 'groups:', data.groups.length, 'phrases:', data.phrases.length);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
