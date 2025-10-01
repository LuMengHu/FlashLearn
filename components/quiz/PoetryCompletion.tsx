// components/PoetryCompletion.tsx

'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { Question } from '@/lib/schema';
import { cn } from '@/lib/utils';

const createPlaceholder = (sentence: string) => {
  return '＿'.repeat(sentence.length);
};

// 【新】一个辅助函数，用来从数组中随机挑选 N 个元素
function getRandomElements<T>(arr: T[], n: number): T[] {
  const result = new Array(n);
  let len = arr.length;
  const taken = new Array(len);
  if (n > len) throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
    const x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function PoetryCompletionCard({ question, isAnswerVisible }: Props) {
  const metadata = question.metadata as { title?: string; poet?: string } | null;

  // 【核心修复】在每次渲染时，都重新随机选择要隐藏的句子
  const poemForDisplay = useMemo(() => {
    const fullPoem = question.content.split('|');
    // 如果诗句少于2句，则不挖空
    const numToHide = Math.min(2, fullPoem.length); 
    // 随机挑选要隐藏的句子
    const hiddenSentences = new Set(getRandomElements(fullPoem, numToHide));
    
    return fullPoem.map(sentence => ({
      text: sentence,
      isHidden: hiddenSentences.has(sentence),
    }));
  }, [question]);

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[300px]">
      <CardContent className="p-6 flex-grow flex flex-col items-center justify-center text-center">
        <div className="space-y-2">
          {poemForDisplay.map((line, index) => (
            <p key={index} className="text-2xl sm:text-3xl font-serif leading-loose text-slate-200">
              {isAnswerVisible
                ? <span className={cn(line.isHidden && 'text-brand-green-500')}>{line.text}</span>
                : (line.isHidden ? createPlaceholder(line.text) : line.text)
              }
            </p>
          ))}
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
