// components/PoetryCard.tsx

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function PoetryCard({ question, isAnswerVisible }: Props) {
  const metadata = question.metadata as { title?: string; poet?: string } | null;

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[300px]">
      {/* 使用 flex-grow 将内容推向中间 */}
      <CardContent className="p-6 flex-grow flex flex-col items-center justify-center">
        {/* 将两句诗放在一个容器内，统一居中 */}
        <div className="text-center">
          {/* 【修复】对诗句应用悬挂缩进样式 */}
          <p className="text-2xl sm:text-3xl font-serif leading-loose text-slate-200 indent-[-2.8em] pl-[2em]">
            {question.content},
          </p>
          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose text-brand-green-500 transition-opacity duration-500 indent-[-2em] pl-[2em]",
            isAnswerVisible ? "opacity-100" : "opacity-0"
          )}>
            {isAnswerVisible ? question.answer : "　"} 
          </p>
        </div>
      </CardContent>

      <CardFooter className={cn(
        "flex justify-end transition-opacity duration-500",
        isAnswerVisible ? "opacity-100" : "opacity-0"
      )}>
        <p className="text-slate-400 font-serif">
          —— {metadata?.poet || '佚名'}《{metadata?.title || '无题'}》
        </p>
      </CardFooter>
    </Card>
  );
}
