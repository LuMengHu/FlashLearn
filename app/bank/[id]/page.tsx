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
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        {/* 【修复】使用 CSS Grid 布局 */}
        <header className="grid grid-cols-[1fr_auto_1fr] items-center mb-8 px-4 py-4 sm:px-0">
          {/* 第一列：返回按钮，靠左对齐 */}
          <div className="justify-self-start">
            <Button asChild variant="ghost" className="text-slate-400 hover:bg-slate-800 hover:text-white p-2 md:p-4">
              <Link href="/" className="flex items-center gap-1 text-sm md:gap-2 md:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                返回
              </Link>
            </Button>
          </div>

          {/* 第二列：标题，自动宽度 */}
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-200 bg-slate-800/70 border border-slate-700 px-6 py-2 rounded-lg">
            {bank.name}
          </h1>

          {/* 第三列：空的占位符，靠右对齐 (这一列即使为空，也会占据和第一列一样的空间) */}
          <div className="justify-self-end"></div>
        </header>
        
        <div className="px-4 sm:px-0">
            <QuizClient bank={bank} initialQuestions={bank.questions} />
        </div>
      </div>
    </main>
  );
}
