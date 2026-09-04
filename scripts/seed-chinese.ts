// 把 scripts/data/chinese/*.json 里的中文条目灌进 ChineseItems 表（按 type+front 去重，重复则更新）
// 用法: npm run db:seed:chinese
// 注意：这个脚本只写 ChineseItems，不会动题库和单词表。
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/schema';
import { CHINESE_TYPES, type ChineseType } from '../lib/schema';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function seedType(type: ChineseType) {
  const file = path.join(__dirname, 'data', 'chinese', `${type}.json`);
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
      wrong: typeof item?.wrong === 'string' && item.wrong.trim() ? item.wrong.trim() : null,
      note: typeof item?.note === 'string' && item.note.trim() ? item.note.trim() : null,
      payload: item?.payload && typeof item.payload === 'object' ? item.payload : {},
    };

    await db
      .insert(schema.chineseItems)
      .values(row)
      .onConflictDoUpdate({
        target: [schema.chineseItems.type, schema.chineseItems.front],
        set: { ...row, updatedAt: new Date() },
      });
    count++;
  }

  console.log(`- ${type}: 写入 ${count} 条`);
}

async function main() {
  console.log('🀄 Seeding 中文条目...');
  for (const type of CHINESE_TYPES) {
    await seedType(type);
  }
  console.log('✅ 中文条目灌库完成');
}

main().catch(err => {
  console.error('❌ 灌库失败:', err);
  process.exit(1);
});
