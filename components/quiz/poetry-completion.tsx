// 古诗补全模式：随机挖空诗句中的若干句，揭晓答案后高亮显示
'use client';

import { useMemo } from 'react';
import { CardContent, CardFooter } from '@/components/ui/card';
import QuizCardShell from './quiz-card-shell';
import type { Question } from '@/lib/schema';
import { cn, shuffle } from '@/lib/utils';

const createPlaceholder = (sentence: string) => {
  return '＿'.repeat(sentence.length);
};

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function PoetryCompletionCard({ question, isAnswerVisible }: Props) {
  const metadata = question.metadata as { title?: string; poet?: string } | null;

  // 每次切换题目时重新随机挑选要挖空的句子
  const poemForDisplay = useMemo(() => {
    const fullPoem = question.content.split('|');
    // 如果诗句少于2句，则不挖空
    const numToHide = Math.min(2, fullPoem.length);
    const hiddenSentences = new Set(shuffle(fullPoem).slice(0, numToHide));

    return fullPoem.map(sentence => ({
      text: sentence,
      isHidden: hiddenSentences.has(sentence),
    }));
  }, [question]);

  return (
    <QuizCardShell className="flex flex-col min-h-[300px]">
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
    </QuizCardShell>
  );
}
