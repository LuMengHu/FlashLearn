// lib/actions.ts
import { db } from '@/lib/db';
import { questionBanks, questions } from '@/lib/schema';
import { eq, isNull, sql, and, desc, ne } from 'drizzle-orm';
import { unstable_noStore as noStore } from 'next/cache';

export type BankWithQuestionCount = Awaited<ReturnType<typeof getTopLevelBanksWithCounts>>[0];

// 【核心修复】重写数据获取函数，确保所有顶级题库都被正确查询
export async function getTopLevelBanksWithCounts() {
  noStore(); // 禁用缓存，确保每次都获取最新数据

  // 使用 leftJoin 来统计每个题库的问题数量
  const banksWithCounts = await db
    .select({
      id: questionBanks.id,
      name: questionBanks.name,
      description: questionBanks.description,
      cover_image_url: questionBanks.cover_image_url,
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(questionBanks)
    .leftJoin(questions, eq(questionBanks.id, questions.bankId))
    .where(isNull(questionBanks.parentId)) // 只选择顶级题库
    .groupBy(questionBanks.id)
    .orderBy(desc(questionBanks.createdAt));

  // 确保 questionCount 即使为 null 也被处理为 0
  return banksWithCounts.map(bank => ({
    ...bank,
    questionCount: bank.questionCount || 0,
  }));
}

// 这个函数用于获取单个题库及其相关信息，之前的版本可能没问题，但我们统一更新以确保健壮性
export async function getBankAndQuestions(bankId: number) {
  noStore();
  return await db.query.questionBanks.findFirst({
    where: eq(questionBanks.id, bankId),
    with: {
      questions: true,
    },
  });
}

// 这个函数用于获取子题库或同级题库
export async function getSiblingBanks(bankId: number, parentId: number | null) {
  noStore();
  if (parentId === null) {
    // 如果是顶级题库，它的 "siblings" 就是它的子题库
    return await db.query.questionBanks.findMany({
      where: eq(questionBanks.parentId, bankId),
      with: {
        questions: true,
      },
    });
  } else {
    // 如果是子题库，它的 siblings 就是所有拥有相同 parentId 的其他子题库
    return await db.query.questionBanks.findMany({
      where: and(
        eq(questionBanks.parentId, parentId),
        ne(questionBanks.id, bankId)
      ),
      with: {
        questions: true,
      },
    });
  }
}
