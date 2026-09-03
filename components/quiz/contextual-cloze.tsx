// 语境完形填空模式：展示一组共用同一词族选项的句子，逐句挖空作答
'use client';

import { CardContent } from '@/components/ui/card';
import QuizCardShell from './quiz-card-shell';
import type { Question } from '@/lib/schema';

interface Props {
  questions: Question[];
  options: string[];
  isAnswerVisible: boolean;
}

export default function ContextualClozeCard({ questions, options, isAnswerVisible }: Props) {
  return (
    <QuizCardShell className="flex flex-col min-h-[450px]">
      {/* 选项区域 */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/70">
        <h3 className="text-sm text-slate-400 mb-3 text-center">请从下列词中选择合适的形态填空：</h3>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {options.map((option, index) => (
            <span key={index} className="px-3 py-1 bg-slate-800 border border-slate-600 rounded-md text-slate-200 font-mono text-lg">
              {option}
            </span>
          ))}
        </div>
      </div>
      
      {/* 问题区域 */}
      <CardContent className="p-6 flex-grow">
        <ul className="space-y-6">
          {questions.map((q, index) => {
            // 【核心修改】将句子按占位符分割
            const parts = q.content.split('(___)');
            return (
              <li key={q.id} className="flex items-start text-xl leading-relaxed">
                <span className="font-bold mr-3 text-slate-400">{index + 1}.</span>
                <p>
                  {parts[0]}
                  {isAnswerVisible ? (
                    // 显示答案时：插入绿色高亮的答案
                    <span className="font-bold text-brand-green-500 mx-1">{q.answer}</span>
                  ) : (
                    // 未显示答案时：保留占位符
                    <span className="text-slate-500">(___)</span>
                  )}
                  {parts[1]}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </QuizCardShell>
  );
}
