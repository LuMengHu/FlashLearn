// 英文复习某一类的练习页（作文句型 / 词汇升级）
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/layout/page-shell';
import ReviewLoader from '@/components/english/review-loader';
import { ENGLISH_META, getEnglishMeta } from '@/lib/english-meta';

export function generateStaticParams() {
  return ENGLISH_META.map(meta => ({ type: meta.type }));
}

export default async function EnglishReviewPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = getEnglishMeta(type);
  if (!meta) notFound();

  return (
    <PageShell title={`${meta.emoji} ${meta.title}`} subtitle={meta.description} backHref="/english">
      <ReviewLoader meta={meta} />
    </PageShell>
  );
}
