// 外交知识分类页：列出外交知識题库及其各个子题库
import { PageShell, EmptyState } from '@/components/ui/page-shell';
import { EntryCard } from '@/components/ui/entry-card';
import { db } from '@/lib/db';
import { questionBanks } from '@/lib/schema';
import { isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function DiplomaticPage() {
  const topBanks = await db.query.questionBanks.findMany({
    where: isNull(questionBanks.parentId),
    with: {
      subBanks: { with: { questions: true } },
      questions: true,
    },
  });

  const bank = topBanks[0];

  if (!bank) {
    return (
      <PageShell title="🏛️ 外交知识" subtitle="选择题练习">
        <EmptyState message="题库还没有灌入，运行 npm run db:seed 后再来" />
      </PageShell>
    );
  }

  const subBanks = bank.subBanks ?? [];

  return (
    <PageShell title="🏛️ 外交知识" subtitle={`${bank.name} · 选择题`}>
      <div className="grid gap-3">
        <EntryCard
          href={`/bank/${bank.id}`}
          emoji="🏛️"
          title={`${bank.name}（全部）`}
          description="从头开始练这个题库"
          meta={`${bank.questions?.length ?? 0} 题`}
          accent="violet"
          size="lg"
        />
        {subBanks.map(sub => (
          <EntryCard
            key={sub.id}
            href={`/bank/${sub.id}`}
            emoji="📄"
            title={sub.name}
            meta={`${sub.questions?.length ?? 0} 题`}
            accent="violet"
          />
        ))}
      </div>
    </PageShell>
  );
}
