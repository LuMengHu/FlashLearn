// 单词录入页：输入英文单词，由 AI 生成解析草稿，审阅编辑后存入单词库
import WordEditor from '@/components/vocab/word-editor';

export default function NewWordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-4 sm:p-8">
      <WordEditor />
    </main>
  );
}
