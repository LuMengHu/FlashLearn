// app/page.tsx

import { db } from '@/lib/db';
import QuestionBankCarousel from '@/components/QuestionBankCarousel';

export default async function HomePage() {
  const banks = await db.query.questionBanks.findMany({
    orderBy: (banks, { asc }) => [asc(banks.id)],
  });

  // 【关键改动】: 创建一个更长的数组来实现手动循环
  // 如果题库数量大于1，我们就创建三倍的数组，否则直接使用原数组
  const displayBanks = banks.length > 1 ? [...banks, ...banks, ...banks] : banks;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white overflow-hidden">
      <div className="text-center mb-10 px-4">
        <h1 className="text-5xl font-extrabold tracking-tight">FlashLearn</h1>
        <p className="text-lg text-gray-400 mt-2">选择一个题库，开始你的学习之旅</p>
      </div>
      
      {/* 【关键改动】: 将原始数据和加倍后的数据都传递给客户端组件 */}
      <div className="w-full relative">
        <QuestionBankCarousel 
          originalBanks={banks} 
          displayBanks={displayBanks} 
        />
      </div>
    </main>
  );
}
