// 中文某一类的练习页，具体练习形式由 lib/chinese-meta.ts 里的配置决定
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/ui/page-shell';
import ChinesePractice from '@/components/chinese/chinese-practice';
import { CHINESE_META, getChineseMeta } from '@/lib/chinese-meta';

export function generateStaticParams() {
  return CHINESE_META.map(meta => ({ type: meta.type }));
}

export default async function ChineseTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = getChineseMeta(type);
  if (!meta) notFound();

  return (
    <PageShell title={`${meta.emoji} ${meta.title}`} subtitle={meta.description} backHref="/chinese">
      <ChinesePractice meta={meta} />
    </PageShell>
  );
}
