// 中文练习页的客户端外壳：拉取条目与熟练度 → 选题量 → 按 chinese-meta 配置的练习方式出题
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/layout/empty-state';
import { RoundStarter } from '@/components/study/round-starter';
import JudgmentQuiz from './judgment-quiz';
import ChoiceQuiz from './choice-quiz';
import RecallQuiz from './recall-quiz';
import { fetchProgress, pickForRound, summarize, type ProgressMap } from '@/lib/study';
import type { ChineseMeta } from '@/lib/chinese-meta';
import type { ChineseItem } from '@/lib/schema';

export default function ChinesePractice({ meta }: { meta: ChineseMeta }) {
  const [items, setItems] = useState<ChineseItem[] | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [error, setError] = useState('');
  const [round, setRound] = useState<ChineseItem[] | null>(null); // null = 停在准备页

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/chinese?type=${meta.type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '读取失败');
      setItems(data);
      setProgress(await fetchProgress('chinese'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取失败');
    }
  }, [meta.type]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => summarize(items ?? [], progress), [items, progress]);

  const startRound = (count: number) => {
    if (!items) return;
    setRound(pickForRound(items, progress, count));
  };

  /** 一轮结束后回到准备页，并刷新掌握情况 */
  const backToStart = useCallback(async () => {
    setRound(null);
    setProgress(await fetchProgress('chinese'));
  }, []);

  if (error) return <p className="text-center text-brand-red-500">{error}</p>;

  if (!items) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        加载中…
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState message="这个类别还没有内容" actionHref="/chinese" actionLabel="返回中文" />;
  }

  if (round === null) {
    return <RoundStarter summary={summary} onStart={startRound} unit={meta.kind === 'judgment' ? '条' : '题'} />;
  }

  // progress 传给子组件，是为了回退时能把熟练度恢复成作答前的等级
  if (meta.kind === 'judgment') {
    return (
      <JudgmentQuiz
        items={round}
        batchSize={meta.batchSize ?? 6}
        variant={meta.type === 'pinyin' ? 'pair' : 'single'}
        progress={progress}
        onFinish={backToStart}
      />
    );
  }

  if (meta.kind === 'choice') {
    return <ChoiceQuiz items={round} choices={meta.choices ?? []} progress={progress} onFinish={backToStart} />;
  }

  return (
    <RecallQuiz items={round} type={meta.type} hint={meta.recallHint} progress={progress} onFinish={backToStart} />
  );
}
