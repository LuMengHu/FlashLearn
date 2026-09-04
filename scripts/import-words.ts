// 批量导入单词：读 scripts/data/words/wordlist.txt，逐个调 AI 生成解析后写入 Words 表
// 用法:
//   npm run words:import           已在库里的单词跳过
//   npm run words:import -- --force  已在库里的也重新生成并覆盖
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/schema';
import { generateWordDraft } from '../lib/ai';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const LIST_FILE = path.join(__dirname, 'data', 'words', 'wordlist.txt');

function readWordList(): string[] {
  if (!fs.existsSync(LIST_FILE)) {
    console.error(`找不到单词表文件：${LIST_FILE}`);
    process.exit(1);
  }
  return fs
    .readFileSync(LIST_FILE, 'utf-8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

async function main() {
  const force = process.argv.includes('--force');
  const list = readWordList();

  if (list.length === 0) {
    console.log('单词表是空的，先在 scripts/data/words/wordlist.txt 里写上要导入的单词。');
    return;
  }

  const existing = new Set((await db.query.words.findMany({ columns: { word: true } })).map(w => w.word.toLowerCase()));

  console.log(`📖 单词表共 ${list.length} 个，库里已有 ${existing.size} 个\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, word] of list.entries()) {
    const prefix = `[${index + 1}/${list.length}] ${word}`;

    if (!force && existing.has(word.toLowerCase())) {
      console.log(`${prefix} —— 已存在，跳过`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`${prefix} —— 生成中...`);
      const draft = await generateWordDraft(word);

      if (!draft.meaning) {
        console.log(' ⚠️ AI 没给出释义，跳过');
        failed++;
        continue;
      }

      const row = {
        word: draft.word || word,
        meaning: draft.meaning,
        senses: draft.senses,
        family: draft.family,
        confusables: draft.confusables,
        etymology: draft.etymology || null,
      };

      await db
        .insert(schema.words)
        .values(row)
        .onConflictDoUpdate({
          target: schema.words.word,
          set: { ...row, updatedAt: new Date() },
        });

      console.log(` ✅ ${draft.meaning}（家族 ${draft.family.length} · 易混 ${draft.confusables.length}）`);
      created++;
    } catch (err) {
      console.log(` ❌ ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n完成：新增/更新 ${created} 个，跳过 ${skipped} 个，失败 ${failed} 个`);
  if (created > 0) console.log('去 /english → 背单词 就能看到它们了。');
}

main().catch(err => {
  console.error('❌ 导入失败:', err);
  process.exit(1);
});
