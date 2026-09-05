// 回忆题：看正面回忆内容，揭晓答案后自评记住/没记住
// 用于「文化常识」「作者常识」「文言常识」
'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatBar } from '@/components/study/stat-bar';
import { RoundSummary } from '@/components/study/round-summary';
import { levelOf, reportResult, revertResults, type ProgressMap } from '@/lib/study';
import type { ChineseItem, ChineseType } from '@/lib/schema';

/** 已作答的一步，供回退时还原 */
type HistoryEntry = { item: ChineseItem; wasRight: boolean; previousLevel: number };

export default function RecallQuiz({
  items,
  type,
  hint,
  progress,
  onFinish,
}: {
  items: ChineseItem[];
  type: ChineseType;
  hint?: string;
  progress: ProgressMap;
  onFinish: () => void;
}) {
  const [queue, setQueue] = useState<ChineseItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongItems, setWrongItems] = useState<ChineseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const startRound = useCallback((source: ChineseItem[]) => {
    setQueue(source);
    setTotal(source.length);
    setRevealed(false);
    setDone(0);
    setRight(0);
    setWrongItems([]);
    setHistory([]);
  }, []);

  useEffect(() => {
    startRound(items);
  }, [items, startRound]);

  const current = queue[0];

  const handleMark = (isRight: boolean) => {
    if (!current) return;
    reportResult('chinese', current.id, isRight);
    setHistory(prev => [...prev, { item: current, wasRight: isRight, previousLevel: levelOf(current.id, progress) }]);
    setDone(d => d + 1);
    if (isRight) setRight(r => r + 1);
    else setWrongItems(prev => [...prev, current]);
    setQueue(prev => prev.slice(1));
    setRevealed(false);
  };

  /** 回退上一题：放回队首、撤掉计分，并把熟练度恢复成作答前 */
  const handleUndo = () => {
    const last = history[history.length - 1];
    if (!last) return;

    revertResults('chinese', [{ itemId: last.item.id, correct: last.wasRight, previousLevel: last.previousLevel }]);
    setHistory(prev => prev.slice(0, -1));
    setQueue(prev => [last.item, ...prev]);
    setDone(d => Math.max(0, d - 1));
    if (last.wasRight) setRight(r => Math.max(0, r - 1));
    else setWrongItems(prev => prev.filter(i => i.id !== last.item.id));
    setRevealed(false);
  };

  if (!current) {
    return (
      <RoundSummary
        total={done}
        right={right}
        wrong={done - right}
        onRestart={onFinish}
        onReviewWrong={wrongItems.length > 0 ? () => startRound(wrongItems) : undefined}
        rightLabel="记住"
        wrongLabel="没记住"
      />
    );
  }

  const payload = current.payload ?? {};
  const isQuestion = type === 'culture';

  return (
    <div>
      <StatBar
        done={done}
        total={total}
        right={right}
        wrong={done - right}
        rightLabel="记住"
        wrongLabel="没记住"
        onUndo={handleUndo}
        canUndo={history.length > 0}
      />

      <div className="flex min-h-[380px] flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl sm:p-8">
        {/* 正面 */}
        <div className="text-center">
          <p
            className={
              isQuestion
                ? 'text-xl font-medium leading-relaxed text-slate-100 sm:text-2xl'
                : 'font-serif text-4xl font-bold tracking-wide text-slate-100 sm:text-5xl'
            }
          >
            {current.front}
          </p>
          {!revealed && hint && <p className="mt-6 text-sm text-slate-600">{hint}</p>}
        </div>

        {/* 背面 */}
        {revealed && (
          <div className="mt-6 flex-grow space-y-4 border-t border-slate-800 pt-6">
            <p className="text-lg leading-relaxed text-brand-green-500 sm:text-xl">{current.back}</p>

            {(payload.dynasty || payload.aka) && (
              <div className="flex flex-wrap gap-2">
                {payload.dynasty && (
                  <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
                    {payload.dynasty}
                  </span>
                )}
                {payload.aka && (
                  <span className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-sm text-slate-300">
                    {payload.aka}
                  </span>
                )}
              </div>
            )}

            {payload.works && payload.works.length > 0 && (
              <Section title="代表作">
                <div className="flex flex-wrap gap-2">
                  {payload.works.map((work, i) => (
                    <span key={i} className="rounded-lg bg-slate-800/70 px-3 py-1.5 text-slate-200">
                      《{work.replace(/^《|》$/g, '')}》
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {payload.senses && payload.senses.length > 0 && (
              <Section title="义项">
                <ul className="space-y-2.5">
                  {payload.senses.map((sense, i) => (
                    <li key={i}>
                      <p className="text-slate-200">
                        <span className="mr-2 font-mono text-sm text-cyan-500">{i + 1}</span>
                        {sense.meaning}
                      </p>
                      {sense.example && (
                        <p className="mt-1 border-l-2 border-slate-700 pl-3 font-serif text-sm text-slate-400">
                          {sense.example}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {payload.examples && payload.examples.length > 0 && (
              <Section title="例句">
                <ul className="space-y-2">
                  {payload.examples.map((ex, i) => (
                    <li key={i}>
                      <p className="font-serif text-slate-200">{ex.sentence}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{ex.translation}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {current.note && (
              <Section title="补充">
                <p className="leading-relaxed text-slate-400">{current.note}</p>
              </Section>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        {revealed ? (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleMark(true)}
              className="rounded-xl bg-green-600 px-7 py-3 font-semibold text-white transition-colors hover:bg-green-500"
            >
              记住了
            </button>
            <button
              onClick={() => handleMark(false)}
              className="rounded-xl bg-red-600/90 px-7 py-3 font-semibold text-white transition-colors hover:bg-red-500"
            >
              没记住
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            显示答案
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}
