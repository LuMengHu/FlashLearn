// 单词录入页：输入英文单词，由 AI 生成解析草稿，审阅编辑后存入单词库
import { PageShell } from '@/components/ui/page-shell';
import WordEditor from '@/components/vocab/word-editor';

export default function NewWordPage() {
  return (
    <PageShell title="✨ 录入单词" subtitle="AI 整理，你审阅后入库" backHref="/english">
      <WordEditor />
    </PageShell>
  );
}
