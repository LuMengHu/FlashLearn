// 背单词：正面只显示英文，回忆中文后揭晓答案，同时展示含义/词源家族/易混词/自己的笔记
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Undo2, Volume2, Loader2, Plus } from 'lucide-react';
import { useSpeech } from '@/hooks/use-speech';
import { shuffle } from '@/lib/utils';
import type { Word } from '@/lib/schema';

export default function WordStudy() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<Word[]>([]);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const { speak } = useSpeech();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/words');
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '读取单词失败');
        if (cancelled) return;
        setWords(data);
        setQueue(shuffle(data));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '读取单词失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue[0];
  const total = words?.length ?? 0;

  const startRound = (list: Word[]) => {
    setQueue(shuffle(list));
    setAnsweredCount(0);
    setCorrectCount(0);
    setWrongWords([]);
    setIsAnswerVisible(false);
  };

  const handleMark = (isCorrect: boolean) => {
    if (!current) return;
    if (isCorrect) setCorrectCount(c => c + 1);
    else setWrongWords(prev => [...prev, current]);
    setAnsweredCount(c => c + 1);
    setQueue(prev => prev.slice(1));
    setIsAnswerVisible(false);
  };

  const progressValue = useMemo(
    () => (total > 0 ? (answeredCount / total) * 100 : 0),
    [answeredCount, total]
  );

  // ---------- 各种状态 ----------
  if (error) {
    return (
      <Shell>
        <p className="text-brand-red-500 text-center">{error}</p>
      </Shell>
    );
  }

  if (!words) {
    return (
      <Shell>
        <div className="flex items-center justify-center gap-2 text-slate-400 py-20">
          <Loader2 className="animate-spin" size={20} />
          正在加载单词库…
        </div>
      </Shell>
    );
  }

  if (words.length === 0) {
    return (
      <Shell>
        <div className="text-center py-16 space-y-4">
          <p className="text-slate-300 text-lg">单词库还是空的</p>
          <Button asChild size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">
            <Link href="/vocab/new">
              <Plus size={18} className="mr-1" />
              去录入第一个单词
            </Link>
          </Button>
        </div>
      </Shell>
    );
  }

  if (!current) {
    return (
      <Shell>
        <div className="text-center py-16 space-y-6">
          <h2 className="text-3xl font-bold text-slate-100">🎉 这一轮背完了！</h2>
          <p className="text-lg text-slate-300">
            共 {answeredCount} 个 ｜ <span className="text-brand-green-500">记住 {correctCount}</span> ｜{' '}
            <span className="text-brand-red-500">没记住 {wrongWords.length}</span>
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button onClick={() => startRound(words)} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">
              再背一轮
            </Button>
            {wrongWords.length > 0 && (
              <Button onClick={() => startRound(wrongWords)} variant="destructive" size="lg">
                只背没记住的 ({wrongWords.length})
              </Button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  const senses = current.senses ?? [];
  const family = current.family ?? [];
  const confusables = current.confusables ?? [];

  return (
    <Shell>
      {/* 进度 */}
      <div className="w-full mb-6">
        <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
          <span>进度: {answeredCount} / {total}</span>
          <div className="flex items-center gap-4">
            <span className="text-brand-green-500">记住: {correctCount}</span>
            <span className="text-slate-600">|</span>
            <span className="text-brand-red-500">没记住: {wrongWords.length}</span>
          </div>
        </div>
        <Progress value={progressValue} className="w-full h-2 bg-slate-800" />
      </div>

      {/* 卡片 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 shadow-lg p-6 sm:p-8 min-h-[420px] flex flex-col">
        <div className="text-center">
          <button
            type="button"
            onClick={() => speak(current.word, { rate: 0.9 })}
            className="group inline-flex items-center gap-3 cursor-pointer"
            title="点击发音"
          >
            <span className="text-4xl sm:text-5xl font-bold tracking-wide text-slate-100 group-hover:text-brand-cyan-400 transition-colors">
              {current.word}
            </span>
            <Volume2 size={22} className="text-slate-600 group-hover:text-brand-cyan-400 transition-colors" />
          </button>
          {current.phonetic && <p className="text-slate-500 mt-2 font-mono">{current.phonetic}</p>}
        </div>

        {!isAnswerVisible ? (
          <p className="text-slate-600 text-center mt-10">先在心里回忆它的中文意思</p>
        ) : (
          <div className="mt-8 space-y-6 flex-grow">
            <p className="text-2xl sm:text-3xl text-brand-green-500 font-semibold text-center">{current.meaning}</p>

            {senses.length > 0 && (
              <Block title="含义">
                <ul className="space-y-3">
                  {senses.map((sense, i) => (
                    <li key={i}>
                      <p className="text-slate-200">
                        {sense.pos && <span className="text-brand-cyan-500 mr-2 font-mono text-sm">{sense.pos}</span>}
                        {sense.meaning}
                      </p>
                      {sense.example && (
                        <p className="text-slate-400 text-sm mt-1 pl-4 border-l-2 border-slate-700">
                          {sense.example}
                          {sense.translation && <span className="block text-slate-500 mt-0.5">{sense.translation}</span>}
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
                      <span className="text-slate-100 font-medium">{item.word}</span>
                      {item.pos && <span className="text-slate-500 mx-2 font-mono text-sm">{item.pos}</span>}
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
                        <span className="text-brand-red-500 font-medium">{item.word}</span>
                        <span className="text-slate-400 ml-2">{item.meaning}</span>
                      </p>
                      {item.tip && <p className="text-slate-500 text-sm mt-0.5 pl-4">{item.tip}</p>}
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {current.etymology && (
              <Block title="词源">
                <p className="text-slate-400 leading-relaxed">{current.etymology}</p>
              </Block>
            )}

            {current.notes && (
              <Block title="我的笔记">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{current.notes}</p>
              </Block>
            )}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="mt-8 text-center h-16">
        {isAnswerVisible ? (
          <div className="flex justify-center space-x-4">
            <Button onClick={() => handleMark(true)} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              记住了
            </Button>
            <Button onClick={() => handleMark(false)} variant="destructive" size="lg">
              没记住
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsAnswerVisible(true)} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">
            显示答案
          </Button>
        )}
      </div>
    </Shell>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
          <Link href="/">
            <Undo2 className="rotate-180 mr-1" size={18} />
            返回
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">背单词</h1>
        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
          <Link href="/vocab/new">录入</Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
