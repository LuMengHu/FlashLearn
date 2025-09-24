// components/MCQCard.tsx

import { useState, useMemo, useEffect } from 'react'; // 导入 useEffect
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  onOptionSelected: (isCorrect: boolean) => void;
}

// 辅助函数：洗牌算法
function shuffleOptions(options: string[], correctIndex: number): { shuffledOptions: string[], newCorrectIndex: number } {
  const indices = Array.from({ length: options.length }, (_, i) => i);
  
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledOptions = indices.map(i => options[i]);
  const newCorrectIndex = indices.indexOf(correctIndex);

  return { shuffledOptions, newCorrectIndex };
}

export default function MCQCard({ question, onOptionSelected }: Props) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // 【核心修改】当题目变化时，对选项进行一次性的随机排序
  const { shuffledOptions, newCorrectIndex } = useMemo(() => {
    if (!question.options || !Array.isArray(question.options) || question.correctOptionIndex === null) {
      return { shuffledOptions: [], newCorrectIndex: -1 };
    }
    const options = question.options as string[];
    const correctIndex = question.correctOptionIndex as number;
    return shuffleOptions(options, correctIndex);
  }, [question]);

  // 【核心修复】当 question prop 变化时，重置组件内部状态
  useEffect(() => {
    setSelectedOption(null);
    setIsRevealed(false);
  }, [question]);

  if (shuffledOptions.length === 0) {
    return (
      <Card className="bg-slate-900/50 border-red-500 text-white shadow-lg">
        <CardHeader><CardTitle className="text-red-400">错误：题目数据不完整</CardTitle></CardHeader>
        <CardContent><p>这道选择题缺少 "options" 字段或正确答案索引。</p></CardContent>
      </Card>
    );
  }

  const handleSelect = (index: number) => {
    if (isRevealed) return;
    
    setSelectedOption(index);
    setIsRevealed(true);
    onOptionSelected(index === newCorrectIndex);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl leading-relaxed text-slate-200">{question.content}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mt-4 space-y-3">
          {shuffledOptions.map((option, index) => (
            <Button
              key={index}
              variant="outline"
              className={cn(
                "w-full justify-start text-left h-auto whitespace-normal py-3 px-4 transition-all duration-300",
                isRevealed && "pointer-events-none",
                "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500 hover:text-white",
                isRevealed && index === newCorrectIndex && 
                  "bg-brand-green-800 border-brand-green-500 text-slate-100 hover:bg-brand-green-800",
                isRevealed && selectedOption === index && index !== newCorrectIndex && 
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
