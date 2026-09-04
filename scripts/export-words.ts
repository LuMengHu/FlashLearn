// 把数据库里的全部单词导出成 scripts/data/words/words.json（包含所有字段）
// 用法: npm run words:export
// 导出后可以直接在 JSON 里批量编辑，再用 npm run db:seed:words 灌回数据库。
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { asc } from 'drizzle-orm';
import * as schema from '../lib/schema';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const OUT_FILE = path.join(__dirname, 'data', 'words', 'words.json');

async function main() {
  const rows = await db.query.words.findMany({ orderBy: [asc(schema.words.word)] });

  // 只导出内容字段，不导出 id / 时间戳：灌回时按 word 匹配，换库也能用
  const payload = rows.map(row => ({
    word: row.word,
    meaning: row.meaning,
    senses: row.senses ?? [],
    family: row.family ?? [],
    confusables: row.confusables ?? [],
    etymology: row.etymology ?? '',
    notes: row.notes ?? '',
  }));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`✅ 已导出 ${payload.length} 个单词 → ${path.relative(process.cwd(), OUT_FILE)}`);
  console.log('   可以直接编辑这个文件，改完运行 npm run db:seed:words 灌回数据库。');
}

main().catch(err => {
  console.error('❌ 导出失败:', err);
  process.exit(1);
});
