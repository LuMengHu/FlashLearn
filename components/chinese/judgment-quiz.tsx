// 判断题：一次给 N 条，其中随机 1-2 条是正确的，其余是错版，让用户挑出正确的那几条
// 用于「易错字辨析」和「拼音」
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { StatBar } from '@/components/study/stat-bar';
import { RoundSummary } from '@/components/study/round-summary';
import { shuffle } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { levelOf, reportResults, revertResults, type AnswerRecord, type ProgressMap } from '@/lib/study';
import type { ChineseItem } from '@/lib/schema';

type Card = {
  item: ChineseItem;
  /** 这张卡展示的是正确版本还是错版 */
  isRight: boolean;
};

/** 揭晓一组时存一份快照，回退时整组还原回未作答的状态 */
type HistoryEntry = {
  cards: Card[];
  pool: ChineseItem[];
  done: number;
  right: number;
  wrongItems: ChineseItem[];
  reported: AnswerRecord[];
};

export default function JudgmentQuiz({
  items,
  batchSize,
  variant,
  progress,
  onFinish,
}: {
  items: ChineseItem[];
  batchSize: number;
  /** single: 只显示词本身（易错字）；pair: 上面词、下面注音（拼音） */
  variant: 'single' | 'pair';
  progress: ProgressMap;
  onFinish: () => void;
}) {
  const [pool, setPool] = useState<ChineseItem[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongItems, setWrongItems] = useState<ChineseItem[]>([]);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const totalRounds = useMemo(
    () => Math.max(1, Math.ceil(items.length / batchSize)),
    [items.length, batchSize]
  );

  const dealFrom = useCallback(
    (source: ChineseItem[]) => {
      if (source.length === 0) {
        setFinished(true);
        return;
      }
      // 按优先级顺序取一批，再打乱这一批的展示顺序
      const batch = shuffle(source.slice(0, batchSize));
      // 随机决定 1-2 条展示正确版本，其余展示错版
      const rightCount = Math.min(batch.length, Math.random() < 0.5 ? 1 : 2);
      const rightIndexes = new Set(shuffle(batch.map((_, i) => i)).slice(0, rightCount));

      setCards(batch.map((item, i) => ({ item, isRight: rightIndexes.has(i) })));
      setPool(source.slice(batchSize));
      setPicked(new Set());
      setRevealed(false);
    },
    [batchSize]
  );

  const startRound = useCallback(
    (source: ChineseItem[]) => {
      setDone(0);
      setRight(0);
      setWrongItems([]);
      setFinished(false);
      setHistory([]);
      dealFrom(source);
    },
    [dealFrom]
  );

  useEffect(() => {
    startRound(items);
  }, [items, startRound]);

  const toggle = (index: number) => {
    if (revealed) return;
    setPicked(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const handleReveal = () => {
    setRevealed(true);

    // 每张卡单独判定：勾了且确实是对的、或没勾且确实是错的，都算判断正确
    const perCard = cards.map((card, index) => ({
      itemId: card.item.id,
      correct: picked.has(index) === card.isRight,
      previousLevel: levelOf(card.item.id, progress),
    }));
    reportResults('chinese', perCard);

    // 先把这一组作答前的状态压栈，回退时整组还原
    setHistory(prev => [...prev, { cards, pool, done, right, wrongItems, reported: perCard }]);

    const isAllCorrect = perCard.every(r => r.correct);
    setDone(d => d + 1);
    if (isAllCorrect) setRight(r => r + 1);
    else setWrongItems(prev => [...prev, ...cards.filter((_, i) => !perCard[i].correct).map(c => c.item)]);
  };

  const handleNext = () => {
    if (pool.length === 0) setFinished(true);
    else dealFrom(pool);
  };

  /**
   * 回退一组：把上一组原样发回来（未作答状态），计分和熟练度都退回去。
   * 已揭晓但还没点「下一组」时，回退的就是当前这一组，相当于重做。
   */
  const handleUndo = () => {
    const last = history[history.length - 1];
    if (!last) return;

    revertResults('chinese', last.reported);
    setHistory(prev => prev.slice(0, -1));
    setCards(last.cards);
    setPool(last.pool);
    setDone(last.done);
    setRight(last.right);
    setWrongItems(last.wrongItems);
    setPicked(new Set());
    setRevealed(false);
    setFinished(false);
  };

  if (finished) {
    return (
      <RoundSummary
        total={done}
        right={right}
        wrong={done - right}
        onRestart={onFinish}
        onReviewWrong={wrongItems.length > 0 ? () => startRound(wrongItems) : undefined}
        rightLabel="全对"
        wrongLabel="有错"
      />
    );
  }

  if (cards.length === 0) return null;

  const answerCount = cards.filter(c => c.isRight).length;

  return (
    <div>
      <StatBar
        done={done}
        total={totalRounds}
        right={right}
        wrong={done - right}
        rightLabel="全对"
        wrongLabel="有错"
        onUndo={handleUndo}
        canUndo={history.length > 0}
      />

      <p className="mb-4 text-center text-slate-400">
        选出 <span className="font-semibold text-cyan-400">{variant === 'pair' ? '注音正确' : '没有写错'}</span> 的
        {revealed ? `（共 ${answerCount} 个）` : `（共 ${answerCount} 个）`}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card, index) => {
          const isPicked = picked.has(index);
          const shown = variant === 'pair'
            ? (card.isRight ? card.item.back : card.item.wrong ?? card.item.back)
            : (card.isRight ? card.item.front : card.item.wrong ?? card.item.front);

          return (
            <button
              key={card.item.id}
              type="button"
              onClick={() => toggle(index)}
              disabled={revealed}
              className={cn(
                'rounded-xl border p-4 text-left transition-all duration-200',
                !revealed && 'hover:border-slate-600 hover:bg-slate-800/60',
                !revealed && isPicked
                  ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/40'
                  : 'border-slate-800 bg-slate-900/50',
                revealed && card.isRight && 'border-brand-green-500 bg-green-950/30',
                revealed && !card.isRight && 'border-brand-red-500/60 bg-red-950/20'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {variant === 'pair' ? (
                    <>
                      <p className="text-xl font-semibold text-slate-100">{card.item.front}</p>
                      <p className="mt-1 font-mono text-lg tracking-wide text-slate-300">{shown}</p>
                    </>
                  ) : (
                    <p className="text-2xl font-semibold tracking-wide text-slate-100">{shown}</p>
                  )}

                  {revealed && !card.isRight && (
                    <div className="mt-3 border-t border-slate-700/60 pt-2">
                      <p className="text-sm text-brand-green-500">
                        正确：{variant === 'pair' ? card.item.back : card.item.front}
                        {variant === 'single' && card.item.back && (
                          <span className="ml-2 text-slate-500">（{card.item.back}）</span>
                        )}
                      </p>
                      {card.item.note && <p className="mt-1 text-sm leading-relaxed text-slate-400">{card.item.note}</p>}
                    </div>
                  )}
                  {revealed && card.isRight && card.item.note && (
                    <p className="mt-3 border-t border-slate-700/60 pt-2 text-sm leading-relaxed text-slate-400">
                      {card.item.note}
                    </p>
                  )}
                </div>

                <span
                  className={cn(
                    'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                    revealed
                      ? card.isRight
                        ? 'border-brand-green-500 bg-brand-green-500/20 text-brand-green-500'
                        : 'border-brand-red-500 bg-brand-red-500/20 text-brand-red-500'
                      : isPicked
                        ? 'border-cyan-500 bg-cyan-500 text-white'
                        : 'border-slate-600 text-transparent'
                  )}
                >
                  {revealed ? (card.isRight ? <Check size={14} /> : <X size={14} />) : <Check size={14} />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        {revealed ? (
          <button
            onClick={handleNext}
            className="rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            下一组
          </button>
        ) : (
          <button
            onClick={handleReveal}
            className="rounded-xl bg-green-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-green-500"
          >
            显示答案
          </button>
        )}
      </div>
    </div>
  );
}
