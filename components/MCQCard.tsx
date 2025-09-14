// components/MCQCard.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  // 【修复】移除 isAnswerVisible
  onOptionSelected: (isCorrect: boolean) => void;
}

export default function MCQCard({ question, onOptionSelected }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  // 【新】添加一个内部状态来控制答案是否可见
  const [isRevealed, setIsRevealed] = useState(false);

  if (!question.options || !Array.isArray(question.options)) {
    return (
      <Card className="bg-slate-900/50 border-red-500 text-white shadow-lg">
        <CardHeader><CardTitle className="text-red-400">错误：题目数据不完整</CardTitle></CardHeader>
        <CardContent><p>这道选择题缺少 "options" 字段。</p></CardContent>
      </Card>
    );
  }
  
  const options = question.options as string[];
  const correctIndex = question.correctOptionIndex;

  const handleSelect = (index: number) => {
    // 答案揭示后不再响应点击
    if (isRevealed) return;
    
    setSelectedOption(index);
    setIsRevealed(true); // 【新】点击选项后，立即揭示答案
    onOptionSelected(index === correctIndex);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg">
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
                // 【修复】使用内部状态 isRevealed
                isRevealed && "pointer-events-none",
                "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white",
                // 【修复】使用内部状态 isRevealed
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
    </Card>
  );
}
