// components/quiz/QuizClient.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { QuestionBank, Question } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import QACard from './QACard';
import MCQCard from './MCQCard';
import PoetryPairCard from './PoetryPairCard'; 
import PoetryCompletionCard from './PoetryCompletionCard';
import LayeredRevealCard from './LayeredRevealCard';
import { Undo2 } from 'lucide-react';
import SubBankSelector from '@/components/SubBankSelector';
import Link from 'next/link';

// ... (shuffle function is fine)
function shuffle<T>(array: T[]): T[] {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}


interface Props {
  bank: QuestionBank;
  initialQuestions: Question[];
  siblingBanks: (QuestionBank & { questions: Question[] })[] | null;
}

type AnsweredQuestion = {
  question: Question;
  wasCorrect: boolean;
};

export default function QuizClient({ bank, initialQuestions, siblingBanks }: Props) {
  // ... (state management) ...
  const [unanswered, setUnanswered] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isMcqAnswered, setIsMcqAnswered] = useState(false);
  const [canMarkLayeredReveal, setCanMarkLayeredReveal] = useState(false);

  // ... (logic functions) ...
  const startQuiz = useCallback((questionSet: Question[]) => {
    setCurrentTotal(questionSet.length);
    setUnanswered(shuffle(questionSet));
    setAnswered([]);
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
  }, []);

  useEffect(() => {
    startQuiz(initialQuestions);
  }, [initialQuestions, startQuiz]);

  const currentQuestion = useMemo(() => unanswered[0], [unanswered]);
  const correctCount = useMemo(() => answered.filter(a => a.wasCorrect).length, [answered]);
  const incorrectCount = useMemo(() => answered.filter(a => !a.wasCorrect).length, [answered]);
  const answeredCount = answered.length;
  
  const handleUndo = () => {
    if (answered.length === 0) return;
    const lastAnswered = answered[answered.length - 1];
    setUnanswered(prev => [lastAnswered.question, ...prev]);
    setAnswered(prev => prev.slice(0, -1));
    // 【修复】撤销时确保所有相关状态都被重置
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
  };
  
  const handleShowAnswer = () => setIsAnswerVisible(true);

  const handleMark = (isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
    setUnanswered(prev => prev.slice(1));
    // 【修复】进入下一题时，重置所有相关UI状态
    setIsAnswerVisible(false);
    setCanMarkLayeredReveal(false);
    setIsMcqAnswered(false);
  };
  
  // 【重构】简化MCQ处理逻辑
  const handleMcqOptionSelected = (isCorrect: boolean) => {
    if(!currentQuestion) return;
    // 标记为已回答，这会立即让 "下一题" 按钮出现 [7]
    setIsMcqAnswered(true); 
    // 记录答案
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
  };
  
  const handleNextMcq = () => {
    // 从未答题列表中移除当前题目
    setUnanswered(prev => prev.slice(1));
    // 重置MCQ状态，为下一题做准备 [5]
    setIsMcqAnswered(false);
  };
  
  const handleAllLayersRevealed = () => {
    setCanMarkLayeredReveal(true);
  };

  const handleSelectSubBank = (questions: Question[]) => {
    startQuiz(questions);
  };
  
  // ... (completion UI is fine) ...
  if (!currentQuestion && answeredCount > 0) {
    return (
      <div className="text-center p-6 sm:p-10 bg-slate-900/50 border border-slate-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold mb-4 text-slate-100">🎉 恭喜你，完成了一轮！</h2>
        <p className="text-lg text-slate-300 mb-8">
          总题数: {currentTotal} | <span className="text-brand-green-500">答对: {correctCount}</span> | <span className="text-brand-red-500">答错: {incorrectCount}</span>
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={() => startQuiz(initialQuestions)} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">全部重新开始</Button>
          {incorrectCount > 0 && <Button onClick={() => startQuiz(answered.filter(a => !a.wasCorrect).map(a => a.question))} variant="destructive" size="lg">只复习错题</Button>}
          {correctCount > 0 && <Button onClick={() => startQuiz(answered.filter(a => a.wasCorrect).map(a => a.question))} variant="secondary" size="lg">回顾已答对的题</Button>}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  // ... (renderCard function is fine) ...
  const renderCard = () => {
    switch (bank.mode) {
      case 'mcq':
        return <MCQCard question={currentQuestion} onOptionSelected={handleMcqOptionSelected} />;
      case 'P_pair':
        return <PoetryPairCard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'P_completion':
        return <PoetryCompletionCard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'lr':
        return <LayeredRevealCard question={currentQuestion} onAllLayersRevealed={handleAllLayersRevealed} />;
      case 'qa':
      default:
        return <QACard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
    }
  };

  return (
    <div>
      {/* 头部区域 */}
      <div className="mb-8 space-y-4">
        {/* ... (第一行: 返回、标题、子题库) ... */}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <Button asChild variant="ghost" size="lg" className="p-2">
            <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              返回
            </Link>
          </Button>
          
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-200 bg-slate-800/70 border border-slate-700 px-6 py-2 rounded-lg truncate">
            {bank.name}
          </h1>

          <div className="justify-self-end">
            {siblingBanks && (
              <SubBankSelector
                currentBankId={bank.id}
                siblingBanks={siblingBanks}
                onSelectSubBank={handleSelectSubBank}
              />
            )}
          </div>
        </div>
        {/* ... (第二行: 进度条和统计) ... */}
        <div className="w-full">
          <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
            <span>进度: {answeredCount} / {currentTotal}</span>
            <div className="flex items-center gap-4">
              <span className="text-brand-green-500">答对: {correctCount}</span>
              <span className="text-slate-600">|</span>
              <span className="text-brand-red-500">答错: {incorrectCount}</span>
              <Button onClick={handleUndo} disabled={answeredCount === 0} variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-30">
                <Undo2 size={18} />
                <span className="sr-only">撤销上一题</span>
              </Button>
            </div>
          </div>
          <Progress value={currentTotal > 0 ? (answeredCount / currentTotal) * 100 : 0} className="w-full h-2 bg-slate-800" />
        </div>
      </div>

      {/* 答题卡片和控制按钮区域 */}
      <div className="min-h-[500px] flex flex-col justify-between">
        {renderCard()}
        <div className="mt-8 text-center h-12">
          {bank.mode === 'lr' ? (
            canMarkLayeredReveal && (
              <div className="flex justify-center space-x-4">
                <Button onClick={() => handleMark(true)} className="bg-green-600 hover:bg-green-700 text-white" size="lg">我答对了</Button>
                <Button onClick={() => handleMark(false)} variant="destructive" size="lg">我答错了</Button>
              </div>
            )
          ) : bank.mode === 'mcq' ? (
            isMcqAnswered && <Button onClick={handleNextMcq} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">下一题</Button>
          ) : (
            isAnswerVisible ? (
              <div className="flex justify-center space-x-4">
                <Button onClick={() => handleMark(true)} className="bg-green-600 hover:bg-green-700 text-white" size="lg">我答对了</Button>
                <Button onClick={() => handleMark(false)} variant="destructive" size="lg">我答错了</Button>
              </div>
            ) : (
              <Button onClick={handleShowAnswer} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">显示答案</Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
