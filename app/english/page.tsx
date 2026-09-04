// 英文分类页：背单词 + 录入单词两个入口
import { PageShell } from '@/components/ui/page-shell';
import { EntryCard } from '@/components/ui/entry-card';
import { db } from '@/lib/db';
import { words } from '@/lib/schema';
import { sql as raw } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getWordCount(): Promise<number> {
  try {
    const [row] = await db.select({ count: raw<number>`count(*)`.mapWith(Number) }).from(words);
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

export default async function EnglishHomePage() {
  const count = await getWordCount();

  return (
    <PageShell title="🔤 英文" subtitle="用 AI 整理单词，然后把它们背下来">
      <div className="grid gap-3">
        <EntryCard
          href="/vocab/study"
          emoji="📚"
          title="背单词"
          description="看英文回忆中文，揭晓时一并复习词源家族和易混词"
          meta={count > 0 ? `单词库 ${count} 个` : '单词库还是空的，先去录入'}
          accent="cyan"
          size="lg"
        />
        <EntryCard
          href="/vocab/new"
          emoji="✨"
          title="录入单词"
          description="输入一个单词，AI 自动整理含义、词源家族与易混词，确认后入库"
          accent="cyan"
          size="lg"
        />
        <EntryCard
          href="/english/list"
          emoji="📋"
          title="单词总表"
          description="按字母或录入时间浏览全部单词，支持搜索，点开即可就地编辑"
          meta={count > 0 ? `${count} 个单词` : undefined}
          accent="cyan"
          size="lg"
        />
      </div>
    </PageShell>
  );
}
