// components/quiz/InitialHintCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

type InitialHintMetadata = {
  chineseMeaning?: string;
};

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function InitialHintCard({ question, isAnswerVisible }: Props) {
  const word = question.content;
  const meaning = question.answer;
  const metadata = question.metadata as InitialHintMetadata | null;
  const chineseMeaning = metadata?.chineseMeaning;

  const initialHint = word ? `${word.charAt(0).toLowerCase()}` : '';

  const handlePronounce = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('您的浏览器不支持语音合成功能。');
    }
  };

  return (
    // 【间距控制点 A】使用 `gap-y-4` 控制单词和释义两大块之间的垂直间距
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[350px] justify-center gap-y-0">
      <CardHeader className="text-center pt-6"> {/* pt-6 确保顶部有足够空间 */}
        <div 
          onClick={() => handlePronounce(word)} 
          className="group inline-flex items-center justify-center cursor-pointer"
          title="点击发音"
        >
          <CardTitle className="text-4xl sm:text-5xl font-bold tracking-widest text-slate-100 h-16 flex items-center justify-center group-hover:text-brand-cyan-400 transition-colors">
            {isAnswerVisible ? (
              <span className="text-brand-green-500">{word}</span>
            ) : (
              <span>
                {initialHint}
                <span className="text-slate-600 tracking-normal">{' ______'}</span>
              </span>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 flex flex-col items-center justify-center text-center mt-[-20px]">
        {/* 英文释义 */}
        <p className="text-xl sm:text-3xl text-slate-300 leading-relaxed">
          {meaning}
        </p>

        {/* 【核心修复】使用 opacity 控制可见性，而不是条件渲染 */}
        <p className={cn(
          "text-xl sm:text-2xl text-blue-400 transition-opacity duration-300",
  
          "mt-4", 
          // 答案可见时，完全不透明；否则，完全透明
          isAnswerVisible && chineseMeaning ? "opacity-100" : "opacity-0"
        )}>
          {/* 使用占位符 `&nbsp;` 或真实内容，确保元素高度 */}
          {chineseMeaning || '\u00A0'}
        </p>
      </CardContent>
    </Card>
  );
}
