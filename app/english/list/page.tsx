// 单词总表页：批量查询全部单词，点开任意一个直接编辑
import { PageShell } from '@/components/ui/page-shell';
import WordTable from '@/components/vocab/word-table';

export default function WordListPage() {
  return (
    <PageShell title="📋 单词总表" subtitle="搜索、浏览、就地编辑" backHref="/english" width="lg">
      <WordTable />
    </PageShell>
  );
}
