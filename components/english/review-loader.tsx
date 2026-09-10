// 英文复习页的客户端外壳：拉取条目与熟练度 → 选题量 → 进入练习
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/layout/empty-state';
import { RoundStarter } from '@/components/study/round-starter';
import ReviewQuiz from './review-quiz';
import { fetchProgress, pickForRound, summarize, type ProgressMap } from '@/lib/study';
import type { EnglishMeta } from '@/lib/english-meta';
import type { EnglishItem } from '@/lib/schema';

export default function ReviewLoader({ meta }: { meta: EnglishMeta }) {
  const [items, setItems] = useState<EnglishItem[] | null>(null);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [error, setError] = useState('');
  const [round, setRound] = useState<EnglishItem[] | null>(null); // null = 停在准备页

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/english?type=${meta.type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '读取失败');
      setItems(data);
      setProgress(await fetchProgress('english'));
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
    setProgress(await fetchProgress('english'));
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
    return <EmptyState message="这个类别还没有内容，先运行 npm run db:seed:english" actionHref="/english" actionLabel="返回英文" />;
  }

  if (round === null) {
    return <RoundStarter summary={summary} onStart={startRound} unit={meta.unit} />;
  }

  return <ReviewQuiz items={round} meta={meta} progress={progress} onFinish={backToStart} />;
}
