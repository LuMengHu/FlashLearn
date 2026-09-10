// 把 scripts/data/english/*.json 里的英文复习条目灌进 EnglishItems 表
// 用法: npm run db:seed:english
// 按 type+front 去重，重复则更新；只写 EnglishItems，不动题库/单词/中文条目。
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/schema';
import { ENGLISH_TYPES, type EnglishType } from '../lib/schema';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedType(type: EnglishType) {
  const file = path.join(__dirname, 'data', 'english', `${type}.json`);
  if (!fs.existsSync(file)) {
    console.log(`- ${type}: 没有数据文件，跳过`);
    return;
  }

  const items: any[] = JSON.parse(fs.readFileSync(file, 'utf-8'));
  let count = 0;

  for (const item of items) {
    const front = typeof item?.front === 'string' ? item.front.trim() : '';
    const back = typeof item?.back === 'string' ? item.back.trim() : '';
    if (!front || !back) continue;

    const row = {
      type,
      front,
      back,
      hint: typeof item?.hint === 'string' && item.hint.trim() ? item.hint.trim() : null,
      note: typeof item?.note === 'string' && item.note.trim() ? item.note.trim() : null,
      payload: item?.payload && typeof item.payload === 'object' ? item.payload : {},
    };

    await db
      .insert(schema.englishItems)
      .values(row)
      .onConflictDoUpdate({
        target: [schema.englishItems.type, schema.englishItems.front],
        set: { ...row, updatedAt: new Date() },
      });
    count++;
  }

  console.log(`- ${type}: 写入 ${count} 条`);
}

async function main() {
  console.log('🔤 Seeding 英文复习条目...');
  for (const type of ENGLISH_TYPES) {
    await seedType(type);
  }
  console.log('✅ 英文复习条目灌库完成');
}

main().catch(err => {
  console.error('❌ 灌库失败:', err);
  process.exit(1);
});
