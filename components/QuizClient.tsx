// components/QuizClient.tsx

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { QuestionBank, Question } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import QACard from './QACard';
import MCQCard from './MCQCard';
import PoetryCard from './PoetryCard';
import { Undo2 } from 'lucide-react';

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
}

type AnsweredQuestion = {
  question: Question;
  wasCorrect: boolean;
};

export default function QuizClient({ bank, initialQuestions }: Props) {
  const [unanswered, setUnanswered] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  // 【新】用一个 state 来追踪当前这一轮的总题数
  const [currentTotal, setCurrentTotal] = useState(0);
  
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isMcqAnswered, setIsMcqAnswered] = useState(false);

  const startQuiz = useCallback((questionSet: Question[]) => {
    // 【修改】每次开始新一轮时，都更新当前的总题数
    setCurrentTotal(questionSet.length);
    setUnanswered(shuffle(questionSet));
    setAnswered([]);
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
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
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
  };
  
  const handleShowAnswer = () => setIsAnswerVisible(true);

  const handleMark = (isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
    setUnanswered(prev => prev.slice(1));
    setIsAnswerVisible(false);
  };
  
  const handleMcqOptionSelected = (isCorrect: boolean) => {
    if(!currentQuestion) return;
    setIsAnswerVisible(true);
    setIsMcqAnswered(true);
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
  };
  
  const handleNextMcq = () => {
    setUnanswered(prev => prev.slice(1));
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
  };

  if (!currentQuestion && answeredCount > 0) {
    return (
      <div className="text-center p-6 sm:p-10 bg-slate-900/50 border border-slate-800 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold mb-4 text-slate-100">🎉 恭喜你，完成了一轮！</h2>
        <p className="text-lg text-slate-300 mb-8">
          {/* 【修改】使用 currentTotal */}
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

  const renderCard = () => {
    switch (bank.mode) {
      case 'mcq':
        return <MCQCard question={currentQuestion} isAnswerVisible={isAnswerVisible} onOptionSelected={handleMcqOptionSelected} />;
      case 'poetry':
        return <PoetryCard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'qa':
      default:
        return <QACard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
          {/* 【修改】使用 currentTotal */}
          <span>进度: {answeredCount} / {currentTotal}</span>
          <div className="flex items-center gap-4">
            <span className="text-brand-green-500">答对: {correctCount}</span>
            <span className="text-slate-600">|</span>
            <span className="text-brand-red-500">答错: {incorrectCount}</span>
            <Button 
              onClick={handleUndo} 
              disabled={answeredCount === 0} 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 disabled:opacity-30"
            >
              <Undo2 size={18} />
              <span className="sr-only">撤销上一题</span>
            </Button>
          </div>
        </div>
        {/* 【修改】使用 currentTotal */}
        <Progress value={(answeredCount / currentTotal) * 100} className="w-full h-2 bg-slate-800" />
      </div>

      <div className="min-h-[350px] flex flex-col justify-between">
        {renderCard()}
        
        <div className="mt-8 text-center h-12">
          {bank.mode === 'mcq' ? (
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
