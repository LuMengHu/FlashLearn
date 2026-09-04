// 单选题：显示正面，从固定选项里选一个，选完立即揭晓答案与解释
// 用于「六书」
'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatBar, RoundSummary } from '@/components/ui/page-shell';
import { cn } from '@/lib/utils';
import { reportResult } from '@/lib/study';
import type { ChineseItem } from '@/lib/schema';

export default function ChoiceQuiz({
  items,
  choices,
  onFinish,
}: {
  items: ChineseItem[];
  choices: string[];
  onFinish: () => void;
}) {
  const [queue, setQueue] = useState<ChineseItem[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongItems, setWrongItems] = useState<ChineseItem[]>([]);
  const [total, setTotal] = useState(0);

  const startRound = useCallback((source: ChineseItem[]) => {
    setQueue(source);
    setTotal(source.length);
    setPicked(null);
    setDone(0);
    setRight(0);
    setWrongItems([]);
  }, []);

  useEffect(() => {
    startRound(items);
  }, [items, startRound]);

  const current = queue[0];

  const handlePick = (choice: string) => {
    if (picked || !current) return;
    setPicked(choice);
    setDone(d => d + 1);
    const isCorrect = choice === current.back;
    reportResult('chinese', current.id, isCorrect);
    if (isCorrect) setRight(r => r + 1);
    else setWrongItems(prev => [...prev, current]);
  };

  const handleNext = () => {
    setPicked(null);
    setQueue(prev => prev.slice(1));
  };

  if (!current) {
    return (
      <RoundSummary
        total={done}
        right={right}
        wrong={done - right}
        onRestart={onFinish}
        onReviewWrong={wrongItems.length > 0 ? () => startRound(wrongItems) : undefined}
      />
    );
  }

  return (
    <div>
      <StatBar done={done} total={total} right={right} wrong={done - right} />

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl">
        <p className="mb-2 text-center text-sm text-slate-500">这个字属于六书中的哪一类？</p>
        <p className="text-center text-7xl font-serif font-bold text-slate-100 sm:text-8xl">{current.front}</p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {choices.map(choice => {
            const isAnswer = choice === current.back;
            const isPicked = choice === picked;
            return (
              <button
                key={choice}
                onClick={() => handlePick(choice)}
                disabled={!!picked}
                className={cn(
                  'rounded-xl border py-3 text-lg font-medium transition-all duration-200',
                  !picked && 'border-slate-700 bg-slate-800/50 text-slate-200 hover:border-cyan-600 hover:bg-slate-700',
                  picked && isAnswer && 'border-brand-green-500 bg-green-950/40 text-brand-green-500',
                  picked && isPicked && !isAnswer && 'border-brand-red-500 bg-red-950/40 text-brand-red-500',
                  picked && !isAnswer && !isPicked && 'border-slate-800 bg-slate-900/40 text-slate-600'
                )}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {picked && current.note && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="leading-relaxed text-slate-300">{current.note}</p>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        {picked && (
          <button
            onClick={handleNext}
            className="rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            下一题
          </button>
        )}
      </div>
    </div>
  );
}
