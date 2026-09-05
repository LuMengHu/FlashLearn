// 外交知识分类页：列出所有顶层题库，每个题库下再列出它的子题库
import { PageShell } from '@/components/layout/page-shell';
import { EmptyState } from '@/components/layout/empty-state';
import { EntryCard } from '@/components/layout/entry-card';
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

  if (topBanks.length === 0) {
    return (
      <PageShell title="🏛️ 外交知识" subtitle="选择题练习">
        <EmptyState message="题库还没有灌入，运行 npm run db:seed:banks 后再来" />
      </PageShell>
    );
  }

  const totalQuestions = topBanks.reduce((sum, bank) => sum + (bank.questions?.length ?? 0), 0);

  return (
    <PageShell title="🏛️ 外交知识" subtitle={`${topBanks.length} 个题库 · 共 ${totalQuestions} 题`}>
      <div className="grid gap-8">
        {topBanks.map(bank => {
          const subBanks = bank.subBanks ?? [];

          return (
            <section key={bank.id} className="grid gap-3">
              <EntryCard
                href={`/diplomatic/${bank.id}`}
                emoji="🏛️"
                title={`${bank.name}（全部）`}
                description={bank.description || '从头开始练这个题库'}
                meta={`${bank.questions?.length ?? 0} 题`}
                accent="violet"
                size="lg"
              />
              {subBanks.map(sub => (
                <EntryCard
                  key={sub.id}
                  href={`/diplomatic/${sub.id}`}
                  emoji="📄"
                  title={sub.name}
                  description={sub.description || undefined}
                  meta={`${sub.questions?.length ?? 0} 题`}
                  accent="violet"
                />
              ))}
            </section>
          );
        })}
      </div>
    </PageShell>
  );
}
