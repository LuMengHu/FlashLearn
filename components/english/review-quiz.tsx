// 英文复习练习：看正面回忆，揭晓后自评记住/没记住
// 作文句型 = 给中文 + 挖空的英文，默写空格；词汇升级 = 给简单词，说出高级替换词
'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatBar } from '@/components/study/stat-bar';
import { RoundSummary } from '@/components/study/round-summary';
import { levelOf, reportResult, revertResults, type ProgressMap } from '@/lib/study';
import { cn } from '@/lib/utils';
import type { EnglishItem } from '@/lib/schema';
import type { EnglishMeta } from '@/lib/english-meta';

/** 已作答的一步，供回退时还原 */
type HistoryEntry = { item: EnglishItem; wasRight: boolean; previousLevel: number };

export default function ReviewQuiz({
  items,
  meta,
  progress,
  onFinish,
}: {
  items: EnglishItem[];
  meta: EnglishMeta;
  progress: ProgressMap;
  onFinish: () => void;
}) {
  const [queue, setQueue] = useState<EnglishItem[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongItems, setWrongItems] = useState<EnglishItem[]>([]);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const startRound = useCallback((source: EnglishItem[]) => {
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

  const handleMark = useCallback(
    (isRight: boolean) => {
      if (!current) return;
      reportResult('english', current.id, isRight);
      setHistory(prev => [...prev, { item: current, wasRight: isRight, previousLevel: levelOf(current.id, progress) }]);
      setDone(d => d + 1);
      if (isRight) setRight(r => r + 1);
      else setWrongItems(prev => [...prev, current]);
      setQueue(prev => prev.slice(1));
      setRevealed(false);
    },
    [current, progress]
  );

  /** 回退上一题：放回队首、撤掉计分，并把熟练度恢复成作答前 */
  const handleUndo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last) return;

    revertResults('english', [{ itemId: last.item.id, correct: last.wasRight, previousLevel: last.previousLevel }]);
    setHistory(prev => prev.slice(0, -1));
    setQueue(prev => [last.item, ...prev]);
    setDone(d => Math.max(0, d - 1));
    if (last.wasRight) setRight(r => Math.max(0, r - 1));
    else setWrongItems(prev => prev.filter(i => i.id !== last.item.id));
    setRevealed(false);
  }, [history]);

  // 键盘快捷键：空格/回车揭晓，← 没记住，→ 记住了，Backspace 回退
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === 'Backspace') {
        e.preventDefault();
        handleUndo();
        return;
      }
      if (!revealed) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setRevealed(true);
        }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === '2') handleMark(true);
      if (e.key === 'ArrowLeft' || e.key === '1') handleMark(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, revealed, handleMark, handleUndo]);

  if (!current) {
    return (
      <RoundSummary
        total={done}
        right={right}
        wrong={wrongItems.length}
        onRestart={onFinish}
        onReviewWrong={wrongItems.length > 0 ? () => startRound(wrongItems) : undefined}
        rightLabel="记住"
        wrongLabel="没记住"
      />
    );
  }

  const isPattern = meta.type === 'essay_pattern';
  const segments = current.payload?.segments ?? [];
  const upgrades = current.payload?.upgrades ?? [];

  return (
    <div>
      <StatBar
        done={done}
        total={total}
        right={right}
        wrong={wrongItems.length}
        rightLabel="记住"
        wrongLabel="没记住"
        onUndo={handleUndo}
        canUndo={history.length > 0}
      />

      <div className="flex min-h-[360px] flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-xl sm:p-7">
        {isPattern ? (
          <>
            {/* 中文提示永远可见 */}
            <p className="text-center text-lg leading-relaxed text-slate-100 sm:text-xl">{current.front}</p>

            {/* 带空格的英文句型 */}
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-left sm:p-5">
              <p className="text-base leading-loose text-slate-300 sm:text-lg">
                {segments.map((seg, i) =>
                  seg.blank ? (
                    <span
                      key={i}
                      className={cn(
                        'mx-0.5 inline-block rounded px-1',
                        revealed
                          ? 'bg-brand-green-500/15 font-semibold text-brand-green-500 underline decoration-brand-green-500/60 underline-offset-4'
                          : 'min-w-[5rem] border-b-2 border-dashed border-cyan-600/70 align-bottom'
                      )}
                    >
                      {revealed ? seg.text : ' '}
                    </span>
                  ) : (
                    <span key={i}>{seg.text}</span>
                  )
                )}
              </p>
            </div>

            {!revealed && (
              <p className="mt-4 text-center text-xs text-slate-600">
                {meta.hint} · 共 {segments.filter(s => s.blank).length} 个空
              </p>
            )}
          </>
        ) : (
          <>
            {/* 词汇升级：正面是简单词 */}
            <div className="text-center">
              <p className="text-4xl font-bold tracking-wide text-slate-100 sm:text-5xl">{current.front}</p>
              {current.hint && <p className="mt-2 text-slate-500">{current.hint}</p>}
              {!revealed && <p className="mt-8 text-sm text-slate-600">{meta.hint}</p>}
            </div>

            {revealed && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {upgrades.map((word, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-brand-green-500/40 bg-green-950/30 px-3 py-2 text-lg font-semibold text-brand-green-500"
                  >
                    {word}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* 考点说明：揭晓后才出现 */}
        {revealed && current.note && (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <h3 className="mb-1.5 text-xs uppercase tracking-wider text-slate-500">考点</h3>
            <p className="text-sm leading-relaxed text-slate-400">{current.note}</p>
          </div>
        )}
      </div>

      {/* 操作栏：手机常驻底部 */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        {revealed ? (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleMark(false)}
              className="flex-1 rounded-xl bg-red-600/90 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-500 sm:flex-none sm:px-7"
            >
              没记住
            </button>
            <button
              onClick={() => handleMark(true)}
              className="flex-1 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-500 sm:flex-none sm:px-7"
            >
              记住了
            </button>
          </div>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 sm:mx-auto sm:block sm:w-auto"
          >
            显示答案
          </button>
        )}
        <p className="mt-2 hidden text-center text-xs text-slate-700 sm:block">
          快捷键：空格 显示答案 · ← 没记住 · → 记住了 · Backspace 回退
        </p>
      </div>
    </div>
  );
}
