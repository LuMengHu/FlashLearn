// app/bank/[id]/page.tsx
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import QuizClient from '@/components/quiz/QuizClient';
import { eq } from 'drizzle-orm';
import { questionBanks } from '@/lib/schema';

interface BankPageProps {
  params: {
    id: string;
  };
}

export default async function BankPage({ params }: BankPageProps) {
  const bankId = parseInt(params.id, 10);
  
  if (isNaN(bankId)) {
    notFound();
  }

  const bank = await db.query.questionBanks.findFirst({
    where: eq(questionBanks.id, bankId),
    with: {
      questions: true,
      subBanks: {
        with: {
          questions: true,
        },
      },
    },
  });

  if (!bank) {
    notFound();
  }
  
  const siblingBanks = bank.subBanks && bank.subBanks.length > 0 
    ? [bank, ...bank.subBanks] 
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-4 sm:p-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* 移除 header，将布局控制交给 QuizClient */}
        <QuizClient
          bank={bank}
          initialQuestions={bank.questions || []}
          siblingBanks={siblingBanks}
        />
      </div>
    </main>
  );
}
