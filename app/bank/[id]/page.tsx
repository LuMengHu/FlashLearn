// app/bank/[id]/page.tsx

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import QuizClient from '@/components/QuizClient';

interface BankPageProps {
  params: {
    id: string;
  };
}

export default async function BankPage({ params }: BankPageProps) {
  const bankId = parseInt(params.id, 10);
  const bank = await db.query.questionBanks.findFirst({
    where: (banks, { eq }) => eq(banks.id, bankId),
    with: { questions: true },
  });

  if (!bank) {
    notFound();
  }
  
  return (
    // 【修复】移除这里的内边距，让 header 可以占满全宽
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white">
      {/* 【修复】创建一个新的容器来控制内容的最大宽度和左右边距 */}
      <div className="w-full max-w-4xl">
        {/* 【修复】header 现在可以控制自己的内边距，确保返回按钮可以靠左 */}
        <header className="flex justify-between items-center mb-8 px-4 sm:px-0 py-4">
          <Button asChild variant="ghost" className="text-slate-400 hover:bg-slate-800 hover:text-white p-2 md:p-4">
            <Link href="/" className="flex items-center gap-1 text-sm md:gap-2 md:text-base">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              返回
            </Link>
          </Button>

          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-200 bg-slate-800/70 border border-slate-700 px-6 py-2 rounded-lg">
            {bank.name}
          </h1>

          <div style={{ width: '90px' }}></div>
        </header>
        
        {/* 【修复】将内边距应用到 QuizClient 的容器上 */}
        <div className="px-4 sm:px-0">
            <QuizClient bank={bank} initialQuestions={bank.questions} />
        </div>
      </div>
    </main>
  );
}
