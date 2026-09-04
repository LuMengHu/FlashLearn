// 中文分类页：六个入口
import { PageShell } from '@/components/layout/page-shell';
import { EntryCard } from '@/components/layout/entry-card';
import { CHINESE_META } from '@/lib/chinese-meta';
import { db } from '@/lib/db';
import { chineseItems } from '@/lib/schema';
import { sql as raw } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getCounts(): Promise<Record<string, number>> {
  try {
    const rows = await db
      .select({ type: chineseItems.type, count: raw<number>`count(*)`.mapWith(Number) })
      .from(chineseItems)
      .groupBy(chineseItems.type);
    return Object.fromEntries(rows.map(r => [r.type, r.count]));
  } catch {
    return {};
  }
}

export default async function ChineseHomePage() {
  const counts = await getCounts();

  return (
    <PageShell title="🀄 中文" subtitle="字词、常识与文言的日常积累">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHINESE_META.map(meta => (
          <EntryCard
            key={meta.type}
            href={`/chinese/${meta.type}`}
            emoji={meta.emoji}
            title={meta.title}
            description={meta.description}
            meta={counts[meta.type] ? `${counts[meta.type]} 条` : '暂无内容'}
            accent="amber"
          />
        ))}
      </div>
    </PageShell>
  );
}
