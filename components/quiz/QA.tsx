// components/qa.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Question } from '@/lib/schema';

// 这是正确的 QACard 的 Props 定义，它不需要 onOptionSelected
interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function QACard({ question, isAnswerVisible }: Props) {
  // 这是正确的 QACard 的渲染逻辑，它只显示问题和答案
  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl leading-relaxed text-slate-200">{question.content}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[6rem]">
        {isAnswerVisible && (
          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="text-green-400 text-lg leading-relaxed">{question.answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
