// 背题会话的核心状态机：管理当前题目与进度状态，并向 QuizClient 暴露交互回调
'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';
import type { QuestionBank, Question } from '@/lib/schema';
import { useQuizState } from './use-quiz-state';

interface UseQuizEngineProps {
  bank: QuestionBank;
  initialQuestions: Question[];
}

export function useQuizEngine({ bank, initialQuestions }: UseQuizEngineProps) {
  const {
    currentBank, unanswered, answered, currentTotal, isAnswerVisible, isMcqAnswered,
    setCurrentBank, setUnanswered, setAnswered, setCurrentTotal, setIsAnswerVisible,
    setIsMcqAnswered,
  } = useQuizState(bank);

  const startQuiz = useCallback((questionSet: Question[], bankForQuiz: QuestionBank) => {
    setCurrentBank(bankForQuiz);
    // 不打乱题目顺序，仅做浅拷贝，保持题库中的原始顺序
    const orderedQuestions = [...questionSet];
    setCurrentTotal(orderedQuestions.length);
    setUnanswered(orderedQuestions);
    setAnswered([]);
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
  }, [setCurrentBank, setCurrentTotal, setUnanswered, setAnswered, setIsAnswerVisible, setIsMcqAnswered]);

  // 用 ref 记录已初始化的题库，避免 startQuiz 重新创建时重复初始化并重置答题进度
  const initializedBankId = useRef<number | null>(null);

  useEffect(() => {
    if (initializedBankId.current === bank.id) return; // 该题库已初始化过，跳过
    initializedBankId.current = bank.id;
    startQuiz(initialQuestions, bank);
  }, [initialQuestions, bank, startQuiz]);

  const currentQuestion = unanswered[0];
  const { correctCount, incorrectCount } = useMemo(() => {
    return answered.reduce(
      (acc, a) => {
        a.wasCorrect ? acc.correctCount++ : acc.incorrectCount++;
        return acc;
      },
      { correctCount: 0, incorrectCount: 0 }
    );
  }, [answered]);
  const answeredCount = answered.length;

  const handleMark = (isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
    setUnanswered(prev => prev.slice(1));
    setIsAnswerVisible(false);
  };

  const handleMcqOptionSelected = (isCorrect: boolean) => {
    if (!currentQuestion) return;
    setIsMcqAnswered(true);
    setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]);
  };
  const handleNextMcq = () => {
    if (!currentQuestion) return;
    setUnanswered(prev => prev.slice(1));
    setIsMcqAnswered(false);
  };
  const handleShowAnswer = () => setIsAnswerVisible(true);

  const handleUndo = () => {
    if (answered.length === 0) return;
    const lastAnswered = answered[answered.length - 1];
    setUnanswered(prev => [lastAnswered.question, ...prev]);
    setAnswered(prev => prev.slice(0, -1));
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
  };

  const isCompleted = !currentQuestion && answered.length > 0;

  const handleSelectSubBank = (selectedBank: QuestionBank) => startQuiz(selectedBank.questions || [], selectedBank);

  return {
    currentBank, currentQuestion, answered, isAnswerVisible, isMcqAnswered, isCompleted,
    correctCount, incorrectCount, answeredCount, currentTotal,
    startQuiz, handleMark, handleMcqOptionSelected, handleNextMcq,
    handleShowAnswer, handleSelectSubBank, handleUndo,
  };
}
