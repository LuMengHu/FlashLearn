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

// 辅助函数：洗牌算法
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

// 定义组件的 Props 类型
interface Props {
  bank: QuestionBank;
  initialQuestions: Question[];
}

// 定义已回答问题的类型
type AnsweredQuestion = {
  question: Question;
  wasCorrect: boolean;
};

export default function QuizClient({ bank, initialQuestions }: Props) {
  // --- 状态管理 ---
  const [unanswered, setUnanswered] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false); // 仅用于 qa, poetry 模式
  const [isMcqAnswered, setIsMcqAnswered] = useState(false);
  const [canMarkLayeredReveal, setCanMarkLayeredReveal] = useState(false);

  // --- 核心逻辑函数 ---
  const startQuiz = useCallback((questionSet: Question[]) => {
    setCurrentTotal(questionSet.length);
    setUnanswered(shuffle(questionSet));
    setAnswered([]);
    setIsAnswerVisible(false); // 重置
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
  }, []);

  useEffect(() => {
    startQuiz(initialQuestions);
  }, [initialQuestions, startQuiz]);

  // --- 派生状态 ---
  const currentQuestion = useMemo(() => unanswered[0], [unanswered]);
  const correctCount = useMemo(() => answered.filter(a => a.wasCorrect).length, [answered]);
  const incorrectCount = useMemo(() => answered.filter(a => !a.wasCorrect).length, [answered]);
  const answeredCount = answered.length;
  
  // --- 事件处理函数 ---
  const handleUndo = () => {
    if (answered.length === 0) return;
    const lastAnswered = answered[answered.length - 1];
    setUnanswered(prev => [lastAnswered.question, ...prev]);
    setAnswered(prev => prev.slice(0, -1));
    setIsAnswerVisible(false); // 重置
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
  };
  
  const handleShowAnswer = () => setIsAnswerVisible(true);

  const handleMark = (isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
    setUnanswered(prev => prev.slice(1));
    setIsAnswerVisible(false); // 重置
    setCanMarkLayeredReveal(false);
  };
  
  const handleMcqOptionSelected = (isCorrect: boolean) => {
    if(!currentQuestion) return;
    setIsMcqAnswered(true);
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
  };
  
  const handleNextMcq = () => {
    setUnanswered(prev => prev.slice(1));
    setIsMcqAnswered(false);
  };
  
  const handleAllLayersRevealed = () => {
    setCanMarkLayeredReveal(true);
  };

  // --- 完成界面渲染 ---
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

  // --- 卡片渲染调度 ---
  const renderCard = () => {
    switch (bank.mode) {
      case 'mcq':
        // 【修复】isAnswerVisible 在 MCQ 模式下不再需要，由其内部状态管理
        return <MCQCard question={currentQuestion} onOptionSelected={handleMcqOptionSelected} />;
      case 'P_pair':
        return <PoetryPairCard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'P_completion':
        return <PoetryCompletionCard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'lr':
        // 【修复】不再传递 isAnswerVisible
        return <LayeredRevealCard question={currentQuestion} onAllLayersRevealed={handleAllLayersRevealed} />;
      case 'qa':
      default:
        return <QACard question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
    }
  };

  // --- 主界面渲染 ---
  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
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
        <Progress value={currentTotal > 0 ? (answeredCount / currentTotal) * 100 : 0} className="w-full h-2 bg-slate-800" />
      </div>

      {/* 【修复】增加高度，以适应 LayeredRevealCard 内部的按钮 */}
      <div className="min-h-[500px] flex flex-col justify-between">
        {renderCard()}
        
        {/* 【修复】将按钮区域移动到 Card 外部，并简化渲染逻辑 */}
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

