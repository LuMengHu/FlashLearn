// components/LayeredRevealCard.tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import type { Question } from '@/lib/schema';

// 【新】更新类型定义，加入翻译和可见性状态
type MeaningExamplePair = {
  meaning: string;
  example: string;
  translation?: string; // 翻译是可选的
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

  const [revealedIndex, setRevealedIndex] = useState(0);
  // 【新】用一个Map来追踪每个例句的翻译是否显示
  const [translationVisibility, setTranslationVisibility] = useState<Map<number, boolean>>(new Map());

  useEffect(() => {
    setRevealedIndex(0);
    setTranslationVisibility(new Map()); // 题目切换时重置翻译可见性
  }, [question]);

  useEffect(() => {
    if (revealedIndex > 0 && revealedIndex === meanings.length) {
      onAllLayersRevealed();
    }
  }, [revealedIndex, meanings, onAllLayersRevealed]);

  const handleRevealNext = () => {
    if (revealedIndex < meanings.length) {
      setRevealedIndex(prev => prev + 1);
    }
  };
  
  const handlePronounce = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8; 
      window.speechSynthesis.speak(utterance);
    } else {
      alert('你的浏览器不支持语音合成功能。');
    }
  };

  // 【新】处理例句点击事件的函数
  const handleExampleClick = (index: number, exampleText: string) => {
    const isVisible = translationVisibility.get(index) || false;
    
    if (isVisible) {
      // 如果翻译已显示，则朗读例句
      handlePronounce(exampleText);
    } else {
      // 如果翻译未显示，则显示翻译
      setTranslationVisibility(new Map(translationVisibility.set(index, true)));
    }
  };

  const allRevealed = revealedIndex === meanings.length;
  const hasMultipleMeanings = meanings.length > 1;

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[450px]">
      <CardHeader className="text-center flex-shrink-0">
        <div 
          onClick={() => handlePronounce(question.content)} 
          className="group inline-flex items-center justify-center cursor-pointer"
          title="点击发音"
        >
          <CardTitle className="text-4xl sm:text-5xl font-bold tracking-wider text-slate-100 group-hover:text-brand-cyan-400 transition-colors">
            {question.content}
          </CardTitle>
          {/* 【修复】去除音量图标 */}
        </div>
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
                {hasMultipleMeanings && `【${index + 1}】`}{item.meaning}
              </p>
              {/* 【修改】将例句变为可点击 */}
              <div 
                className="text-base text-slate-300 pl-4 border-l-2 border-slate-600 mt-1 cursor-pointer hover:bg-slate-800/50 p-2 rounded-r-md"
                onClick={() => handleExampleClick(index, item.example)}
              >
                <p>{item.example}</p>
                {/* 【新】条件渲染翻译 */}
                {item.translation && translationVisibility.get(index) && (
                  <p className="mt-2 text-brand-cyan-400/80 text-sm">{item.translation}</p>
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
      
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
