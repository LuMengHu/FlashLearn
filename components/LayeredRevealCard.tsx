// components/LayeredRevealCard.tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Question } from '@/lib/schema';

type MeaningExamplePair = {
  meaning: string;
  example: string;
};

interface Props {
  question: Question;
  onAllLayersRevealed: () => void;
}

export default function LayeredRevealCard({ question, onAllLayersRevealed }: Props) {
  const meanings = useMemo(() => {
    try {
      const parsed = JSON.parse(question.answer);
      return Array.isArray(parsed) ? (parsed as MeaningExamplePair[]) : [];
    } catch (e) {
      return [];
    }
  }, [question]);

  // 【修复】revealedIndex 现在是这个组件的唯一核心状态
  const [revealedIndex, setRevealedIndex] = useState(0);

  // 当题目切换时，重置显示状态
  useEffect(() => {
    setRevealedIndex(0);
  }, [question]);
  
  // 当揭示的层数变化时，检查是否已全部揭示完毕
  useEffect(() => {
    if (revealedIndex > 0 && revealedIndex === meanings.length) {
      onAllLayersRevealed();
    }
  }, [revealedIndex, meanings, onAllLayersRevealed]);

  // 【修复】这是现在唯一的点击处理函数
  const handleRevealNext = () => {
    if (revealedIndex < meanings.length) {
      setRevealedIndex(prev => prev + 1);
    }
  };
  
  const allRevealed = revealedIndex === meanings.length;

  return (
    // 【修复】将按钮也包含在 Card 内部，实现完全自洽
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[450px]">
      <CardHeader className="text-center flex-shrink-0">
        <CardTitle className="text-4xl sm:text-5xl font-bold tracking-wider text-slate-100">
          {question.content}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col p-4 overflow-hidden">
        <ScrollArea className="h-full w-full rounded-md border border-slate-700 bg-slate-900/50 p-4">
          {revealedIndex === 0 && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">共有 {meanings.length} 组释义。请回忆含义。</p>
            </div>
          )}
          {meanings.slice(0, revealedIndex).map((item, index) => (
            <div key={index} className="mb-4 last:mb-0">
              <p className="text-base font-semibold text-brand-cyan-500">
                【{index + 1}】{item.meaning}
              </p>
              <p className="text-base text-slate-300 pl-4 border-l-2 border-slate-600 mt-1">
                {item.example}
              </p>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      
      {/* 【修复】按钮现在是组件的一部分 */}
      <div className="flex-shrink-0 text-center py-4">
        {!allRevealed && (
          <Button onClick={handleRevealNext} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">
            {revealedIndex === 0 ? '显示答案' : `显示下一条 (${revealedIndex}/${meanings.length})`}
          </Button>
        )}
      </div>
    </Card>
  );
}
