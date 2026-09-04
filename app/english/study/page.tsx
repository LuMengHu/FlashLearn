// 背单词页：看英文回忆中文，揭晓答案时一并显示含义、词源家族、易混词和自己的笔记
import { PageShell } from '@/components/layout/page-shell';
import WordStudy from '@/components/english/word-study';

export default function StudyWordsPage() {
  return (
    <PageShell title="📚 背单词" subtitle="看英文回忆中文" backHref="/english">
      <WordStudy />
    </PageShell>
  );
}
