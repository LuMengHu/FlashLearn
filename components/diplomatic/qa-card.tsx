// 问答模式：展示问题，点击"显示答案"后展示答案
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuizCardShell from './quiz-card-shell';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function QACard({ question, isAnswerVisible }: Props) {
  return (
    <QuizCardShell>
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
    </QuizCardShell>
  );
}
