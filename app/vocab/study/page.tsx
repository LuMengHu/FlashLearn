// 背单词页：看英文回忆中文，揭晓答案时一并显示含义、词源家族、易混词和自己的笔记
import WordStudy from '@/components/vocab/word-study';

export default function StudyWordsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-4 sm:p-8">
      <WordStudy />
    </main>
  );
}
