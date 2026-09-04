// 中文练习页的客户端外壳：拉取该类条目，按 meta 里配置的练习方式渲染对应组件
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/page-shell';
import JudgmentQuiz from './judgment-quiz';
import ChoiceQuiz from './choice-quiz';
import RecallQuiz from './recall-quiz';
import type { ChineseMeta } from '@/lib/chinese-meta';
import type { ChineseItem } from '@/lib/schema';

export default function ChinesePractice({ meta }: { meta: ChineseMeta }) {
  const [items, setItems] = useState<ChineseItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chinese?type=${meta.type}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || '读取失败');
        if (!cancelled) setItems(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '读取失败');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [meta.type]);

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

  if (meta.kind === 'judgment') {
    return (
      <JudgmentQuiz
        items={items}
        batchSize={meta.batchSize ?? 6}
        variant={meta.type === 'pinyin' ? 'pair' : 'single'}
      />
    );
  }

  if (meta.kind === 'choice') {
    return <ChoiceQuiz items={items} choices={meta.choices ?? []} />;
  }

  return <RecallQuiz items={items} type={meta.type} hint={meta.recallHint} />;
}
