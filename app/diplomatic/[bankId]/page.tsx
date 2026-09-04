// 外交知识答题页（服务器组件）：按 id 加载题库、题目及同级/子题库，交给 QuizClient 渲染
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import QuizClient from '@/components/diplomatic/quiz-client';
import { eq } from 'drizzle-orm';
import { questionBanks } from '@/lib/schema';
import type { QuestionBank } from '@/lib/schema';

export default async function BankPage({ params }: { params: Promise<{ bankId: string }> }) {
  const { bankId: rawId } = await params;
  const bankId = parseInt(rawId, 10);

  if (!rawId || Number.isNaN(bankId)) {
    notFound();
  }

  // 1. 获取当前正在访问的题库
  const bank = await db.query.questionBanks.findFirst({
    where: eq(questionBanks.id, bankId),
    with: {
      questions: true,
      subBanks: { // 也获取其自身的子题库
        with: {
          questions: true,
        },
      },
    },
  });

  if (!bank) {
    notFound();
  }
  
  // 2. 【核心修复】构建完整的同级/子级题库列表
  let siblingBanks: QuestionBank[] | null = null;

  if (bank.parentId) {
    // 情况一：当前是子题库
    // 我们需要找到它的父题库，然后获取父题库和所有兄弟题库
    const parentBank = await db.query.questionBanks.findFirst({
      where: eq(questionBanks.id, bank.parentId),
      with: {
        subBanks: {
          with: {
            questions: true,
          },
        },
      },
    });

    if (parentBank) {
      // 列表包含父题库和所有子题库
      siblingBanks = [parentBank, ...(parentBank.subBanks || [])];
    }
  } else if (bank.subBanks && bank.subBanks.length > 0) {
    // 情况二：当前是父题库，并且它有子题库
    // 列表包含它自己和它的所有子题库
    siblingBanks = [bank, ...bank.subBanks];
  }

  // 3. 获取所有题库，用于“返回”按钮的记忆点功能
  const allBanks = await db.query.questionBanks.findMany();

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto flex-grow flex flex-col">
        <QuizClient
          bank={bank}
          initialQuestions={bank.questions || []}
          siblingBanks={siblingBanks}
          allBanks={allBanks} // 传递 allBanks 以支持 handleReturn
        />
      </div>
    </main>
  );
}
