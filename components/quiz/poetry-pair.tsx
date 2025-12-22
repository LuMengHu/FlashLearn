// components/poetry-pair.tsx

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function PoetryPairCard({ question, isAnswerVisible }: Props) {
  const metadata = question.metadata as { title?: string; poet?: string } | null;

  // 随机决定哪一句是问题
  const isContentPrompt = useMemo(() => Math.random() < 0.5, [question]);

  const firstLine = question.content;
  const secondLine = question.answer;

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[300px]">
      <CardContent className="p-6 flex-grow flex flex-col items-center justify-center text-center">
        <div className="space-y-4">
          {/* 上句 */}
          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose text-slate-200 transition-opacity duration-300",
            isContentPrompt ? "opacity-100" : (isAnswerVisible ? "opacity-100 text-brand-green-500" : "opacity-0 h-0")
          )}>
            {/* 【解决问题1】添加提示 */}
            <span className="text-slate-500 text-xl">上句：</span>
            {firstLine}
          </p>
          {/* 下句 */}
          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose text-slate-200 transition-opacity duration-300",
            !isContentPrompt ? "opacity-100" : (isAnswerVisible ? "opacity-100 text-brand-green-500" : "opacity-0 h-0")
          )}>
            {/* 【解决问题1】添加提示 */}
            <span className="text-slate-500 text-xl">下句：</span>
            {secondLine}
          </p>
        </div>
      </CardContent>
      <CardFooter className={cn("flex justify-end transition-opacity duration-500", isAnswerVisible ? 'opacity-100' : 'opacity-0')}>
        {/* 【解决问题2】增大字体 */}
        <p className="text-slate-400 font-serif text-lg">
          —— {metadata?.poet || '佚名'}《{metadata?.title || '无题'}》
        </p>
      </CardFooter>
    </Card>
  );
}
