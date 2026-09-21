import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { sql } from '../lib/db';

type Kind = 'word' | 'phrase';
type Confusable = { word: string; meaning: string; tip?: string };
type ExistingWord = {
  id: number;
  word: string;
  meaning: string;
  senses: Array<Record<string, string>> | null;
  family: Array<Record<string, string>> | null;
  confusables: Confusable[] | null;
  etymology: string | null;
  kind: Kind;
  source: string | null;
  sourceContext: string | null;
  notes: string | null;
};
type ImportedWord = {
  word: string;
  meaning: string;
  usages: string[];
  kind: Kind;
  collections: Set<string>;
  notes: Set<string>;
  confusables: Confusable[];
};
type ParsedRow = { word: string; meaning: string; usage: string; supplemental: boolean };
type ParsedGroup = { title: string; tip: string; rows: ParsedRow[] };

const SOURCE = '英文生词整理 · Practice 2 ＋ 易混词表（p.133）';
const CONFUSION_LIST = 'Practice 2 · 易混词';
const PHRASE_LIST = 'Practice 2 · 短语';

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      return String.fromCodePoint(Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10));
    }
    return named[entity.toLowerCase()] ?? `&${entity};`;
  });
}

function textContent(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function section(html: string, start: string, end: string) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`找不到 HTML 区段：${start} → ${end}`);
  return html.slice(from, to);
}

function parseGroups(html: string): ParsedGroup[] {
  const groups: ParsedGroup[] = [];
  for (const match of html.matchAll(/<div class="grp">([\s\S]*?)<\/table><\/div>/g)) {
    const body = match[1];
    const title = textContent(body.match(/<span class="grp-t">([\s\S]*?)<\/span>/)?.[1] ?? '');
    const tip = textContent(body.match(/<span class="grp-tip">([\s\S]*?)<\/span>/)?.[1] ?? '');
    const rows: ParsedRow[] = [];
    for (const rowMatch of body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const cells = [...rowMatch[1].matchAll(/<td class="(?:en|zh|nt|bx)">([\s\S]*?)<\/td>/g)].map(cell => cell[1]);
      if (cells.length < 3) continue;
      const supplemental = /class="sup"(?:\s[^>]*)?>/.test(cells[0]);
      const word = textContent(cells[0].replace(/<span class="sup"(?:\s[^>]*)?>[\s\S]*?<\/span>/g, ''));
      const meaning = textContent(cells[1]);
      const usage = textContent(cells[2]);
      if (word && meaning) rows.push({ word, meaning, usage, supplemental });
    }
    if (rows.length) groups.push({ title, tip, rows });
  }
  return groups;
}

function parseDocument(html: string) {
  const parts = [
    { groups: parseGroups(section(html, '<h2 id="p1">', '<h2 id="p2">')), collection: CONFUSION_LIST, confusion: true, phrase: false },
    { groups: parseGroups(section(html, '<h2 id="p2">', '<h2 id="p3">')), collection: PHRASE_LIST, confusion: false, phrase: true },
    { groups: parseGroups(section(html, '<h3>A. 易混词汇', '<h3>B. 口语交际表达')), collection: CONFUSION_LIST, confusion: true, phrase: false },
    { groups: parseGroups(section(html, '<h3>B. 口语交际表达', '<h2 id="p4">')), collection: PHRASE_LIST, confusion: false, phrase: true },
  ];
  const words = new Map<string, ImportedWord>();
  const memberships: Array<{ collection: string; normalizedWord: string }> = [];
  let sourceRows = 0;
  let confusionPairs = 0;

  function ensure(row: ParsedRow, collection: string, forcePhrase: boolean, group: ParsedGroup) {
    const key = normalize(row.word);
    let item = words.get(key);
    const groupNote = [group.title && `分组：${group.title}`, group.tip && `辨析：${group.tip}`].filter(Boolean).join('\n');
    if (!item) {
      item = {
        word: row.word.replace(/\s+/g, ' ').trim(), meaning: row.meaning, usages: [],
        kind: forcePhrase || /\s/.test(row.word) ? 'phrase' : 'word',
        collections: new Set(), notes: new Set(), confusables: [],
      };
      words.set(key, item);
    }
    if (forcePhrase || /\s/.test(row.word)) item.kind = 'phrase';
    if (row.usage && !item.usages.includes(row.usage)) item.usages.push(row.usage);
    if (groupNote) item.notes.add(groupNote);
    item.collections.add(collection);
    memberships.push({ collection, normalizedWord: key });
    return item;
  }

  for (const part of parts) for (const group of part.groups) {
    sourceRows += group.rows.length;
    group.rows.forEach(row => ensure(row, part.collection, part.phrase, group));
    if (!part.confusion) continue;
    for (let left = 0; left < group.rows.length; left++) for (let right = left + 1; right < group.rows.length; right++) {
      const a = ensure(group.rows[left], part.collection, false, group);
      const b = ensure(group.rows[right], part.collection, false, group);
      const tip = [group.title, group.tip].filter(Boolean).join('：');
      if (!a.confusables.some(item => normalize(item.word) === normalize(b.word))) {
        a.confusables.push({ word: b.word, meaning: b.meaning, ...(tip ? { tip } : {}) });
        confusionPairs++;
      }
    }
  }
  return { words, memberships, sourceRows, confusionPairs, parts };
}

function mergeNotes(existing: string | null, imported: ImportedWord) {
  const retained = (existing || '').split(/\r?\n/)
    .filter(line => line.trim() && !/^导入材料[:：]/.test(line.trim()) && !/^原材料标记[:：]/.test(line.trim()) && !/第\s*\d+\s*题|题干出现|试卷第|P\s*\d+\s*(页|左|右)/i.test(line));
  return [...new Set([...retained, ...imported.notes])].join('\n');
}

async function main() {
  const apply = process.argv.includes('--apply');
  const input = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  if (!input) throw new Error('请提供 HTML 路径，例如：npm run import:english:html -- "D:\\资料.html" --apply');
  const file = path.resolve(input);
  if (!fs.existsSync(file)) throw new Error(`找不到 HTML：${file}`);
  const parsed = parseDocument(fs.readFileSync(file, 'utf8'));
  if (parsed.sourceRows !== 218) throw new Error(`预期 218 行，实际解析到 ${parsed.sourceRows} 行；已停止，避免不完整导入。`);
  const existingRows = await sql.query(`SELECT id::int,word,meaning,senses,family,confusables,etymology,kind,source,source_context AS "sourceContext",notes FROM "Words"`) as ExistingWord[];
  const existingByKey = new Map(existingRows.map(row => [normalize(row.word), row]));
  const canonicalWordByKey = new Map<string, string>();
  const meaningByKey = new Map<string, string>();
  for (const [key, imported] of parsed.words) {
    const existing = existingByKey.get(key);
    canonicalWordByKey.set(key, existing?.word ?? imported.word);
    meaningByKey.set(key, existing?.meaning?.trim() || imported.meaning);
  }
  const payload = [...parsed.words].map(([key, imported]) => {
    const existing = existingByKey.get(key);
    const confusables = new Map((existing?.confusables ?? []).map(item => [normalize(item.word), item]));
    for (const item of imported.confusables) {
      const otherKey = normalize(item.word);
      if (!confusables.has(otherKey)) confusables.set(otherKey, { ...item, word: canonicalWordByKey.get(otherKey) ?? item.word, meaning: meaningByKey.get(otherKey) ?? item.meaning });
    }
    const sourceContext = imported.usages.join('；');
    return {
      word: canonicalWordByKey.get(key)!, meaning: meaningByKey.get(key)!,
      senses: existing?.senses?.length ? existing.senses : [{ meaning: imported.meaning, ...(sourceContext ? { example: sourceContext } : {}) }],
      family: existing?.family ?? [], confusables: [...confusables.values()], etymology: existing?.etymology ?? null,
      kind: existing?.kind === 'phrase' || imported.kind === 'phrase' ? 'phrase' : 'word',
      source: existing?.source ?? SOURCE, sourceContext: existing?.sourceContext ?? (sourceContext || null),
      notes: mergeNotes(existing?.notes ?? null, imported),
    };
  });
  const membershipPayload = [...new Map(parsed.memberships.map(item => {
    const word = canonicalWordByKey.get(item.normalizedWord)!;
    return [`${item.collection}\u0000${word}`, { collection: item.collection, word }];
  })).values()];
  const counts = Object.fromEntries([CONFUSION_LIST, PHRASE_LIST].map(name => [name, new Set(membershipPayload.filter(item => item.collection === name).map(item => item.word)).size]));
  const existingMatches = [...parsed.words.keys()].filter(key => existingByKey.has(key)).length;
  console.log(JSON.stringify({ file, apply, sourceRows: parsed.sourceRows, uniqueWords: parsed.words.size, existingMatches,
    newWords: parsed.words.size - existingMatches, confusionPairs: parsed.confusionPairs, collections: counts, sectionRows: parsed.parts.map(part => part.groups.reduce((sum, group) => sum + group.rows.length, 0)) }, null, 2));
  if (!apply) {
    console.log('预览完成；加 --apply 才会写入数据库。');
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), '.local', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const matchedExisting = existingRows.filter(row => parsed.words.has(normalize(row.word)));
  const priorCollections = await sql.query(`SELECT c.id::int,c.name,c.kind,c.created_at AS "createdAt",coalesce(json_agg(cw.word_id) FILTER (WHERE cw.word_id IS NOT NULL),'[]') AS "wordIds" FROM "EnglishCollections" c LEFT JOIN "EnglishCollectionWords" cw ON cw.collection_id=c.id WHERE c.name=ANY($1::text[]) GROUP BY c.id,c.name,c.created_at`, [[CONFUSION_LIST, PHRASE_LIST]]);
  const backupPath = path.join(backupDir, `practice2-before-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ createdAt: new Date().toISOString(), sourceFile: file, words: matchedExisting, collections: priorCollections }, null, 2));
  await sql.transaction([
    sql.query(`INSERT INTO "Words" (word,meaning,senses,family,confusables,etymology,kind,source,source_context,notes,updated_at)
      SELECT word,meaning,senses,family,confusables,etymology,kind,source,"sourceContext",notes,now()
      FROM jsonb_to_recordset($1::jsonb) AS x(word text,meaning text,senses jsonb,family jsonb,confusables jsonb,etymology text,kind text,source text,"sourceContext" text,notes text)
      ON CONFLICT (word) DO UPDATE SET meaning=EXCLUDED.meaning,senses=EXCLUDED.senses,family=EXCLUDED.family,confusables=EXCLUDED.confusables,
      etymology=EXCLUDED.etymology,kind=EXCLUDED.kind,source=EXCLUDED.source,source_context=EXCLUDED.source_context,notes=EXCLUDED.notes,updated_at=now()`, [JSON.stringify(payload)]),
    sql.query(`INSERT INTO "EnglishCollections" (name,kind)
      SELECT name,CASE WHEN name=$2 THEN 'confusion' ELSE 'phrase' END FROM unnest($1::text[]) AS name
      WHERE NOT EXISTS (SELECT 1 FROM "EnglishCollections" c WHERE c.name=name)`, [[CONFUSION_LIST, PHRASE_LIST], CONFUSION_LIST]),
    sql.query(`WITH memberships AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(collection text,word text))
      INSERT INTO "EnglishCollectionWords" (collection_id,word_id)
      SELECT c.id,w.id FROM memberships m JOIN "Words" w ON w.word=m.word
      JOIN LATERAL (SELECT id FROM "EnglishCollections" WHERE name=m.collection ORDER BY id LIMIT 1) c ON true
      ON CONFLICT DO NOTHING`, [JSON.stringify(membershipPayload)]),
  ]);
  const [verified] = await sql.query(`SELECT
    (SELECT count(*)::int FROM "Words" WHERE lower(word)=ANY($1::text[])) AS words,
    (SELECT count(*)::int FROM "EnglishCollectionWords" cw JOIN "EnglishCollections" c ON c.id=cw.collection_id WHERE c.name=$2) AS confusions,
    (SELECT count(*)::int FROM "EnglishCollectionWords" cw JOIN "EnglishCollections" c ON c.id=cw.collection_id WHERE c.name=$3) AS phrases`,
  [[...parsed.words.keys()], CONFUSION_LIST, PHRASE_LIST]);
  console.log(JSON.stringify({ imported: verified, backup: backupPath }, null, 2));
}

main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
