// scripts/seed.ts

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../lib/schema';
import { banksToSeed, type BankMeta } from './question-banks'; // 导入类型
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

/**
 * 递归函数，用于插入一个题库及其所有子题库
 * @param bankMeta - 要插入的题库的元数据
 * @param parentId - (可选) 父题库的ID
 */
async function insertBank(bankMeta: BankMeta, parentId: number | null = null) {
  // 1. 插入当前题库的元信息
  const newBankResult = await db
    .insert(schema.questionBanks)
    .values({
      name: bankMeta.name,
      description: bankMeta.description,
      cover_image_url: bankMeta.cover_image_url,
      mode: bankMeta.mode,
      category: bankMeta.category,
      parentId: parentId, // 关联父ID
    })
    .returning({ insertedId: schema.questionBanks.id });

  const bankId = newBankResult[0].insertedId;
  console.log(`- Created bank "${bankMeta.name}" with ID: ${bankId}`);

  // 2. 如果dataFile存在，则读取并插入对应的题目
  if (bankMeta.dataFile) {
    const dataFilePath = path.join(__dirname, 'data', bankMeta.dataFile);
    try {
      const jsonData = fs.readFileSync(dataFilePath, 'utf-8');
      const questions: any[] = JSON.parse(jsonData);

      if (questions && questions.length > 0) {
        const questionsToInsert = questions.map((q: any) => ({
          ...q,
          // 如果 answer 是一个对象/数组，则序列化为JSON字符串 [1][11]
          answer: typeof q.answer === 'object' ? JSON.stringify(q.answer) : q.answer,
          bankId: bankId,
        }));

        await db.insert(schema.questions).values(questionsToInsert);
        console.log(`  - Inserted ${questions.length} questions from ${bankMeta.dataFile}.`);
      }
    } catch (error) {
      console.error(`❌ Error reading or parsing file ${bankMeta.dataFile}:`, error);
    }
  }

  // 3. 如果有子题库，则递归为每个子题库调用此函数
  if (bankMeta.subBanks && bankMeta.subBanks.length > 0) {
    for (const subBankMeta of bankMeta.subBanks) {
      // 递归调用，并传入当前题库的ID作为父ID
      await insertBank(subBankMeta, bankId);
    }
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  // 清空旧数据
  console.log('🗑️  Deleting existing data...');
  await db.delete(schema.questions).execute();
  await db.delete(schema.questionBanks).execute();
  console.log('✅ Existing data deleted.');

  // 从顶层开始插入题库
  console.log('🏦 Inserting new question banks and questions...');
  for (const bankMeta of banksToSeed) {
    // 对每个顶层题库调用递归插入函数，不传入 parentId
    await insertBank(bankMeta);
  }

  console.log('✅ Database seeded successfully!');
}

main().catch((err) => {
  console.error('❌ Error seeding database:', err);
  process.exit(1);
});
