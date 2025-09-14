// scripts/seed.ts

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/schema';
import { banksToSeed } from './question-banks';
// 【新】导入 Node.js 的文件系统和路径处理模块
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  console.log('🌱 Seeding database...');

  console.log('🗑️  Deleting existing data...');
  await db.delete(schema.questions).execute();
  await db.delete(schema.questionBanks).execute();
  console.log('✅ Existing data deleted.');

  console.log('🏦 Inserting new question banks and questions...');
  for (const bankMeta of banksToSeed) {
    // 1. 插入题库元信息
    const newBank = await db
      .insert(schema.questionBanks)
      .values({
        name: bankMeta.name,
        description: bankMeta.description,
        cover_image_url: bankMeta.cover_image_url,
        mode: bankMeta.mode,
      })
      .returning({ insertedId: schema.questionBanks.id });

    const bankId = newBank[0].insertedId;
    console.log(`- Created bank "${bankMeta.name}" with ID: ${bankId}`);

    // 2. 【新】动态读取并解析对应的 JSON 文件
    const dataFilePath = path.join(__dirname, 'data', bankMeta.dataFile);
    try {
      const jsonData = fs.readFileSync(dataFilePath, 'utf-8');
      const questions = JSON.parse(jsonData);

      if (questions && questions.length > 0) {
        const questionsToInsert = questions.map((q: any) => ({
          ...q,
          bankId: bankId,
        }));

        await db.insert(schema.questions).values(questionsToInsert);
        console.log(`  - Inserted ${questions.length} questions from ${bankMeta.dataFile}.`);
      }
    } catch (error) {
      console.error(`❌ Error reading or parsing file ${bankMeta.dataFile}:`, error);
    }
  }

  console.log('✅ Database seeded successfully!');
}

main().catch((err) => {
  console.error('❌ Error seeding database:', err);
  process.exit(1);
});
