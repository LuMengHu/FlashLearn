// components/PoetryPairCard.tsx

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

export default function PoetryPairCard({ question, isAnswerVisible }: Props) {
  const metadata = question.metadata as { title?: string; poet?: string } | null;

  // 【核心修复】随机决定哪一句是问题（透明），哪一句是答案（初始不可见）
  const isContentPrompt = useMemo(() => Math.random() < 0.5, [question]);

  // 上句始终是 content，下句始终是 answer
  const firstLine = question.content;
  const secondLine = question.answer;

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[300px]">
      <CardContent className="p-6 flex-grow flex flex-col items-center justify-center text-center">
        <div className="text-center">
          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose text-slate-200 indent-[-2.8em] pl-[2.8em] transition-opacity duration-300",
            // 如果 content 是问题，则它可见；如果它是答案，则初始不可见
            isContentPrompt ? "opacity-100" : (isAnswerVisible ? "opacity-100 text-brand-green-500" : "opacity-0")
          )}>
            {isContentPrompt ? `${firstLine}，` : (isAnswerVisible ? `${firstLine}，` : "　")}
          </p>
          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose text-slate-200 indent-[-2.8em] pl-[2.8em] transition-opacity duration-300",
            // 如果 answer 是问题，则它可见；如果它是答案，则初始不可见
            !isContentPrompt ? "opacity-100" : (isAnswerVisible ? "opacity-100 text-brand-green-500" : "opacity-0")
          )}>
            {!isContentPrompt ? `${secondLine}。` : (isAnswerVisible ? `${secondLine}。` : "　")}
          </p>
        </div>
      </CardContent>
      <CardFooter className={cn("flex justify-end transition-opacity duration-500", isAnswerVisible ? 'opacity-100' : 'opacity-0')}>
        <p className="text-slate-400 font-serif">
          —— {metadata?.poet || '佚名'}《{metadata?.title || '无题'}》
        </p>
      </CardFooter>
    </Card>
  );
}

// Props 定义保持不变
interface Props {
  question: Question;
  isAnswerVisible: boolean;
}
