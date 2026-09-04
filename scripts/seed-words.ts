// 把 scripts/data/words/words.json 灌回 Words 表（按 word 去重，已存在的更新）
// 用法: npm run db:seed:words
// 这个脚本只写 Words 表，不会动题库和中文条目；也不会删除 JSON 里没有的单词。
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/schema';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const FILE = path.join(__dirname, 'data', 'words', 'words.json');

/** 只保留有内容的字符串字段，避免把空对象写进 jsonb */
function cleanList(value: unknown, keys: string[]): Record<string, string>[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(item => {
      const next: Record<string, string> = {};
      for (const key of keys) {
        const raw = item[key];
        if (typeof raw === 'string' && raw.trim()) next[key] = raw.trim();
      }
      return next;
    })
    .filter(item => Object.keys(item).length > 0);
}

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`找不到 ${FILE}`);
    console.error('先运行 npm run words:export 导出一份，或者自己手写这个文件。');
    process.exit(1);
  }

  const items: any[] = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  let count = 0;
  let skipped = 0;

  for (const item of items) {
    const word = typeof item?.word === 'string' ? item.word.trim() : '';
    const meaning = typeof item?.meaning === 'string' ? item.meaning.trim() : '';
    if (!word || !meaning) {
      skipped++;
      continue;
    }

    const row = {
      word,
      meaning,
      senses: cleanList(item.senses, ['pos', 'meaning', 'example', 'translation']),
      family: cleanList(item.family, ['word', 'pos', 'meaning']),
      confusables: cleanList(item.confusables, ['word', 'meaning', 'tip']),
      etymology: typeof item?.etymology === 'string' && item.etymology.trim() ? item.etymology.trim() : null,
      notes: typeof item?.notes === 'string' && item.notes.trim() ? item.notes.trim() : null,
    } as any;

    await db
      .insert(schema.words)
      .values(row)
      .onConflictDoUpdate({ target: schema.words.word, set: { ...row, updatedAt: new Date() } });
    count++;
  }

  console.log(`✅ 灌入/更新 ${count} 个单词${skipped ? `，跳过 ${skipped} 条（缺 word 或 meaning）` : ''}`);
}

main().catch(err => {
  console.error('❌ 灌库失败:', err);
  process.exit(1);
});
