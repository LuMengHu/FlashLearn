// 背单词：先选本轮题量，再看英文回忆中文；揭晓时显示释义与全部笔记
// 出题顺序按熟练度：没背过的排最前，越生疏越常出现（不设复习间隔，随时可再来一轮）
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { StatBar, RoundSummary, EmptyState } from '@/components/ui/page-shell';
import { RoundStarter } from '@/components/ui/round-starter';
import { useSpeech } from '@/hooks/use-speech';
import { cn } from '@/lib/utils';
import { fetchProgress, pickForRound, reportResult, summarize, type ProgressMap } from '@/lib/study';
import type { Word } from '@/lib/schema';

export default function WordStudy() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [error, setError] = useState('');

  const [queue, setQueue] = useState<Word[] | null>(null); // null = 还没开始，停在准备页
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isAutoPlayOn, setIsAutoPlayOn] = useState(false);
  const { speak } = useSpeech();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '读取单词失败');
      const [p] = await Promise.all([fetchProgress('word')]);
      setWords(data);
      setProgress(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取单词失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue?.[0];

  // 开了自动发音时，每换一个词就念一遍
  useEffect(() => {
    if (isAutoPlayOn && current) speak(current.word, { rate: 0.9 });
  }, [isAutoPlayOn, current, speak]);

  const summary = useMemo(() => summarize(words ?? [], progress), [words, progress]);

  const startRound = (count: number) => {
    if (!words) return;
    const picked = pickForRound(words, progress, count);
    setQueue(picked);
    setTotal(picked.length);
    setDone(0);
    setRight(0);
    setWrongWords([]);
    setIsAnswerVisible(false);
  };

  /** 只重练指定的一批（结算页的「只背没记住的」） */
  const restartWith = (list: Word[]) => {
    setQueue(list);
    setTotal(list.length);
    setDone(0);
    setRight(0);
    setWrongWords([]);
    setIsAnswerVisible(false);
  };

  const backToStart = async () => {
    setQueue(null);
    setProgress(await fetchProgress('word')); // 回准备页时刷新掌握情况
  };

  const handleMark = (isRight: boolean) => {
    if (!current) return;
    reportResult('word', current.id, isRight);
    if (isRight) setRight(r => r + 1);
    else setWrongWords(prev => [...prev, current]);
    setDone(d => d + 1);
    setQueue(prev => (prev ? prev.slice(1) : prev));
    setIsAnswerVisible(false);
  };

  if (error) return <p className="text-center text-brand-red-500">{error}</p>;

  if (!words) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        正在加载单词库…
      </div>
    );
  }

  if (words.length === 0) {
    return <EmptyState message="单词库还是空的" actionHref="/vocab/new" actionLabel="去录入第一个单词" />;
  }

  // 准备页：选题量
  if (queue === null) {
    return <RoundStarter summary={summary} onStart={startRound} unit="个" />;
  }

  // 一轮结束
  if (!current) {
    return (
      <div className="space-y-4">
        <RoundSummary
          total={done}
          right={right}
          wrong={wrongWords.length}
          onRestart={() => backToStart()}
          onReviewWrong={wrongWords.length > 0 ? () => restartWith(wrongWords) : undefined}
          rightLabel="记住"
          wrongLabel="没记住"
        />
        <p className="text-center text-sm text-slate-600">「再来一轮」会回到题量选择</p>
      </div>
    );
  }

  const senses = current.senses ?? [];
  const family = current.family ?? [];
  const confusables = current.confusables ?? [];

  return (
    <div>
      <StatBar
        done={done}
        total={total}
        right={right}
        wrong={wrongWords.length}
        rightLabel="记住"
        wrongLabel="没记住"
        extra={
          <button
            onClick={() => setIsAutoPlayOn(v => !v)}
            title={isAutoPlayOn ? '关闭自动发音' : '开启自动发音'}
            className={cn(
              'ml-1 flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
              isAutoPlayOn
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400'
                : 'border-slate-700 text-slate-600 hover:text-slate-300'
            )}
          >
            {isAutoPlayOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        }
      />

      <div className="flex min-h-[400px] flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl sm:p-8">
        <div className="text-center">
          <button
            type="button"
            onClick={() => speak(current.word, { rate: 0.9 })}
            className="group inline-flex items-center gap-3"
            title="点击发音"
          >
            <span className="text-4xl font-bold tracking-wide text-slate-100 transition-colors group-hover:text-cyan-400 sm:text-5xl">
              {current.word}
            </span>
            <Volume2 size={22} className="text-slate-700 transition-colors group-hover:text-cyan-400" />
          </button>
        </div>

        {!isAnswerVisible ? (
          <p className="mt-10 text-center text-sm text-slate-600">先在心里回忆它的中文意思</p>
        ) : (
          <div className="mt-8 flex-grow space-y-4 border-t border-slate-800 pt-6">
            <p className="text-center text-2xl font-semibold text-brand-green-500 sm:text-3xl">{current.meaning}</p>

            {senses.length > 0 && (
              <Block title="含义">
                <ul className="space-y-3">
                  {senses.map((sense, i) => (
                    <li key={i}>
                      <p className="text-slate-200">
                        {sense.pos && <span className="mr-2 font-mono text-sm text-cyan-500">{sense.pos}</span>}
                        {sense.meaning}
                      </p>
                      {sense.example && (
                        <p className="mt-1 border-l-2 border-slate-700 pl-3 text-sm text-slate-400">
                          {sense.example}
                          {sense.translation && <span className="mt-0.5 block text-slate-500">{sense.translation}</span>}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {family.length > 0 && (
              <Block title="词源家族">
                <ul className="space-y-1.5">
                  {family.map((item, i) => (
                    <li key={i} className="text-slate-300">
                      <button
                        type="button"
                        onClick={() => speak(item.word, { rate: 0.9 })}
                        className="font-medium text-slate-100 hover:text-cyan-400"
                        title="点击发音"
                      >
                        {item.word}
                      </button>
                      {item.pos && <span className="mx-2 font-mono text-sm text-slate-500">{item.pos}</span>}
                      <span className="text-slate-400">{item.meaning}</span>
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {confusables.length > 0 && (
              <Block title="容易弄混">
                <ul className="space-y-2">
                  {confusables.map((item, i) => (
                    <li key={i}>
                      <p className="text-slate-300">
                        <button
                          type="button"
                          onClick={() => speak(item.word, { rate: 0.9 })}
                          className="font-medium text-brand-red-500 hover:underline"
                          title="点击发音"
                        >
                          {item.word}
                        </button>
                        <span className="ml-2 text-slate-400">{item.meaning}</span>
                      </p>
                      {item.tip && <p className="mt-0.5 pl-4 text-sm text-slate-500">{item.tip}</p>}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {current.etymology && (
              <Block title="词源">
                <p className="leading-relaxed text-slate-400">{current.etymology}</p>
              </Block>
            )}

            {current.notes && (
              <Block title="我的笔记">
                <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{current.notes}</p>
              </Block>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        {isAnswerVisible ? (
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
            onClick={() => setIsAnswerVisible(true)}
            className="rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            显示答案
          </button>
        )}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="mb-2 text-xs uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </section>
  );
}
