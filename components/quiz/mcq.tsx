// 选择题模式：单选，选中后立即高亮正确/错误选项
import { useState, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QuizCardShell from './quiz-card-shell';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  onOptionSelected: (isCorrect: boolean) => void;
}

export default function MCQCard({ question, onOptionSelected }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // 【核心修复】当 question prop 变化时，重置组件内部状态
  useEffect(() => {
    setSelectedOption(null);
    setIsRevealed(false);
  }, [question]);

  // 数据校验
  if (
    !question.options ||
    !Array.isArray(question.options) ||
    question.correctOptionIndex === null ||
    question.correctOptionIndex === undefined
  ) {
    return (
      <QuizCardShell className="border-red-500">
        <CardHeader><CardTitle className="text-red-400">错误：题目数据不完整</CardTitle></CardHeader>
        <CardContent><p>这道选择题缺少 "options" 字段或正确答案索引。</p></CardContent>
      </QuizCardShell>
    );
  }

  const options = question.options as string[];
  const correctIndex = question.correctOptionIndex as number;

  const handleSelect = (index: number) => {
    if (isRevealed) return;

    setSelectedOption(index);
    setIsRevealed(true);
    onOptionSelected(index === correctIndex);
  };

  return (
    <QuizCardShell>
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl leading-relaxed text-slate-200">{question.content}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mt-4 space-y-3">
          {options.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className={cn(
                "w-full justify-start text-left h-auto whitespace-normal py-3 px-4 transition-all duration-300",
                isRevealed && "pointer-events-none",
                "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white",
                isRevealed && index === correctIndex &&
                  "bg-brand-green-800 border-brand-green-500 text-slate-100 hover:bg-brand-green-800",
                isRevealed && selectedOption === index && index !== correctIndex &&
                  "bg-brand-red-800 border-brand-red-500 text-slate-100 hover:bg-brand-red-800"
              )}
              onClick={() => handleSelect(index)}
            >
              {option}
            </Button>
          ))}
        </div>
      </CardContent>
    </QuizCardShell>
  );
}
