// components/PoetryCard.tsx

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Question } from '@/lib/schema';

interface Props {
  question: Question;
  isAnswerVisible: boolean;
}

export default function PoetryCard({ question, isAnswerVisible }: Props) {
  // 定义更具体的 metadata 类型
  const metadata = question.metadata as { 
    title?: string; 
    poet?: string;
    direction?: 'down-to-up' 
  } | null;

  const isDownToUp = metadata?.direction === 'down-to-up';

  // 根据方向决定哪句是上句，哪句是下句
  const upperSentence = isDownToUp ? question.answer : question.content;
  const lowerSentence = isDownToUp ? question.content : question.answer;

  return (
    <Card className="bg-slate-900/50 border-slate-800 text-white shadow-lg flex flex-col min-h-[300px]">
      <CardContent className="p-6 flex-grow flex flex-col items-center justify-center">
        <div className="text-center">
          {/* 【修复】根据方向动态渲染诗句 */}
          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose text-slate-200 indent-[-2.8em] pl-[2.8em]",
            // 如果是“给出下句”，则上句（答案）默认不可见
            isDownToUp && (isAnswerVisible ? "opacity-100" : "opacity-0"),
            "transition-opacity duration-500"
          )}>
            {isDownToUp && !isAnswerVisible ? "　" : `${upperSentence}，`}
          </p>

          <p className={cn(
            "text-2xl sm:text-3xl font-serif leading-loose indent-[-2.8em] pl-[2.8em]",
            // 根据不同模式设置不同颜色和可见性
            isDownToUp 
              ? "text-slate-200" // “给出下句”模式，下句是题目，所以是亮色
              : cn("text-brand-green-500 transition-opacity duration-500", isAnswerVisible ? "opacity-100" : "opacity-0"), // “给出上句”模式，下句是答案，所以是绿色
          )}>
            {isDownToUp ? `${lowerSentence}。` : (isAnswerVisible ? `${lowerSentence}。` : "　")}
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
