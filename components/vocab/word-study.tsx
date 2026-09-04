// 背单词：先选本轮题量，再看英文回忆中文；揭晓后用分段标签查看各部分笔记
// 手机优先：卡片高度稳定、内容区内部滚动、操作按钮常驻底部，不用长滚
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { StatBar, RoundSummary, EmptyState } from '@/components/ui/page-shell';
import { RoundStarter } from '@/components/ui/round-starter';
import { SectionTabs, type SectionTab } from '@/components/ui/section-tabs';
import { useSpeech } from '@/hooks/use-speech';
import { cn } from '@/lib/utils';
import { fetchProgress, pickForRound, reportResult, summarize, type ProgressMap } from '@/lib/study';
import type { Word } from '@/lib/schema';

export default function WordStudy() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [error, setError] = useState('');

  const [queue, setQueue] = useState<Word[] | null>(null); // null = 停在准备页
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isAutoPlayOn, setIsAutoPlayOn] = useState(false);
  const [section, setSection] = useState('senses');
  const { speak } = useSpeech();

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '读取单词失败');
      setWords(data);
      setProgress(await fetchProgress('word'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取单词失败');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue?.[0];

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
    setProgress(await fetchProgress('word'));
  };

  const handleMark = useCallback(
    (isRight: boolean) => {
      if (!current) return;
      reportResult('word', current.id, isRight);
      if (isRight) setRight(r => r + 1);
      else setWrongWords(prev => [...prev, current]);
      setDone(d => d + 1);
      setQueue(prev => (prev ? prev.slice(1) : prev));
      setIsAnswerVisible(false);
    },
    [current]
  );

  // 键盘快捷键：空格/回车揭晓，← 没记住，→ 记住了
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (!isAnswerVisible) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setIsAnswerVisible(true);
        }
        return;
      }
      if (e.key === 'ArrowRight' || e.key === '2') handleMark(true);
      if (e.key === 'ArrowLeft' || e.key === '1') handleMark(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, isAnswerVisible, handleMark]);

  // 换词时回到默认分段
  useEffect(() => {
    setSection('senses');
  }, [current?.id]);

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

  if (queue === null) {
    return <RoundStarter summary={summary} onStart={startRound} unit="个" />;
  }

  if (!current) {
    return (
      <div className="space-y-4">
        <RoundSummary
          total={done}
          right={right}
          wrong={wrongWords.length}
          onRestart={backToStart}
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

  const tabs: SectionTab[] = [
    { key: 'senses', label: '含义', count: senses.length, empty: senses.length === 0 },
    { key: 'family', label: '家族', count: family.length, empty: family.length === 0 },
    { key: 'confusables', label: '易混', count: confusables.length, empty: confusables.length === 0 },
    { key: 'etymology', label: '词源', empty: !current.etymology },
    { key: 'notes', label: '笔记', empty: !current.notes },
  ];

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

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-xl sm:p-7">
        {/* 正面：单词 */}
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
            <Volume2 size={20} className="text-slate-700 transition-colors group-hover:text-cyan-400" />
          </button>
        </div>

        {!isAnswerVisible ? (
          <div className="flex min-h-[180px] items-center justify-center">
            <p className="text-sm text-slate-600">先在心里回忆它的中文意思</p>
          </div>
        ) : (
          <div className="mt-5 border-t border-slate-800 pt-5">
            {/* 主释义永远可见 */}
            <p className="mb-4 text-center text-xl font-semibold leading-relaxed text-brand-green-500 sm:text-2xl">
              {current.meaning}
            </p>

            <SectionTabs tabs={tabs} active={section} onChange={setSection} className="mb-3" />

            {/* 内容区高度受控，超出时内部滚动，卡片本身不会一直变长 */}
            <div className="max-h-[38vh] overflow-y-auto pr-1 sm:max-h-[42vh]">
              {section === 'senses' &&
                (senses.length > 0 ? (
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
                ) : (
                  <Blank />
                ))}

              {section === 'family' &&
                (family.length > 0 ? (
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
                ) : (
                  <Blank />
                ))}

              {section === 'confusables' &&
                (confusables.length > 0 ? (
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
                ) : (
                  <Blank />
                ))}

              {section === 'etymology' &&
                (current.etymology ? <p className="leading-relaxed text-slate-400">{current.etymology}</p> : <Blank />)}

              {section === 'notes' &&
                (current.notes ? (
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-300">{current.notes}</p>
                ) : (
                  <Blank />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 操作栏：手机上常驻底部，够得着；桌面正常排布 */}
      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-8 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        {isAnswerVisible ? (
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
            onClick={() => setIsAnswerVisible(true)}
            className="w-full rounded-xl bg-cyan-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-cyan-500 sm:mx-auto sm:block sm:w-auto"
          >
            显示答案
          </button>
        )}
        <p className="mt-2 hidden text-center text-xs text-slate-700 sm:block">
          快捷键：空格 显示答案 · ← 没记住 · → 记住了
        </p>
      </div>
    </div>
  );
}

function Blank() {
  return <p className="py-6 text-center text-sm text-slate-700">这一项暂无内容</p>;
}
