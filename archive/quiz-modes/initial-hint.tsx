// 首字提示模式：只显示单词的首字母提示，点击可发音，支持自动播放
'use client';

import { useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuizCardShell from './quiz-card-shell';
import { cn } from '@/lib/utils';
import { useSpeech } from '@/hooks/use-speech';
import type { Question } from '@/lib/schema';
import React from 'react';

type InitialHintMetadata = {
  chineseMeaning?: string;
};

interface Props {
  question: Question;
  isAnswerVisible: boolean;
  isAutoPlayOn: boolean;
}

// 【新功能】处理换行符的组件
const MultilineText = ({ text }: { text?: string }) => {
  if (!text) return null;
  return (
    <>
      {text.split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};

export default function InitialHintCard({ question, isAnswerVisible, isAutoPlayOn }: Props) {
  const word = question.content;
  const meaning = question.answer;
  const metadata = question.metadata as InitialHintMetadata | null;
  const chineseMeaning = metadata?.chineseMeaning;

  // 【功能 1 优化】处理多单词首字母提示
  const initialHint = word
    .split(' ')
    .map(part => part.charAt(0).toLowerCase() + '______')
    .join(' ');

  const { speak } = useSpeech();
  const handlePronounce = (text: string) => speak(text, { rate: 0.9 });

  // 【功能 3 实现】自动播放逻辑
  useEffect(() => {
    if (isAnswerVisible && isAutoPlayOn) {
      handlePronounce(word);
    }
  }, [isAnswerVisible, isAutoPlayOn, word]); // 依赖项确保在这些值变化时正确触发

  return (
    <QuizCardShell className="flex flex-col min-h-[350px] justify-center gap-y-0">
      <CardHeader className="text-center pt-6">
        <div 
          onClick={() => handlePronounce(word)} 
          className="group inline-flex items-center justify-center cursor-pointer"
          title="点击发音"
        >
          <CardTitle className="text-4xl sm:text-5xl font-bold tracking-widest text-slate-100 h-16 flex items-center justify-center group-hover:text-brand-cyan-400 transition-colors">
            {isAnswerVisible ? (
              <span className="text-brand-green-500">{word}</span>
            ) : (
              <span className="tracking-normal">{initialHint}</span> // 移除多余的 slate-600 span
            )}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 flex flex-col items-center justify-center text-center mt-[-20px]">
        <p className="text-xl sm:text-3xl text-slate-300 leading-relaxed">
          {meaning}
        </p>
        <div className={cn(
          "text-xl sm:text-2xl text-blue-400 transition-opacity duration-300",
          "mt-4", 
          isAnswerVisible && chineseMeaning ? "opacity-100" : "opacity-0"
        )}>
          {/* 【功能 2 实现】使用新组件渲染中文含义 */}
          <MultilineText text={chineseMeaning} />
          {!chineseMeaning && '\u00A0'} {/* 占位符 */}
        </div>
      </CardContent>
    </QuizCardShell>
  );
}
