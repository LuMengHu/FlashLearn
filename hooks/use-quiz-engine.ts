// 背题会话的核心状态机：管理当前题目/批次/进度状态，并向 QuizClient 暴露交互回调
'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';
import type { QuestionBank, Question } from '@/lib/schema';
import { useQuizState } from './use-quiz-state';
import { useBatchProcessor, TABLE_BATCH_SIZE } from './use-batch-processor';
import { useMediaQuery } from './use-media-query';

interface UseQuizEngineProps {
  bank: QuestionBank;
  initialQuestions: Question[];
}

export function useQuizEngine({ bank, initialQuestions }: UseQuizEngineProps) {
  const {
    currentBank, unanswered, answered, currentTotal, isAnswerVisible, totalBatches,
    batchesCompleted, currentClozeGroup, currentClozeOptions, currentTableBatch,
    isMcqAnswered, canMarkLayeredReveal, isSbsReadingCompleted,
    setCurrentBank, setUnanswered, setAnswered, setCurrentTotal, setIsAnswerVisible,
    setTotalBatches, setBatchesCompleted, setCurrentClozeGroup, setCurrentClozeOptions,
    setCurrentTableBatch, setIsMcqAnswered, setCanMarkLayeredReveal, setIsSbsReadingCompleted,
  } = useQuizState(bank);

  const { prepareBatch } = useBatchProcessor({
    setCurrentTableBatch, setCurrentClozeGroup, setCurrentClozeOptions,
  });

  const isDesktop = useMediaQuery('(min-width: 768px)');

  const isBatchMode = useMemo(
    () => ['contextual_cloze', 'pos', 'verb_forms', 'sbs'].includes(currentBank.mode),
    [currentBank.mode]
  );

  const startQuiz = useCallback((questionSet: Question[], bankForQuiz: QuestionBank) => {
    setCurrentBank(bankForQuiz);
    // 【核心修改】不再打乱题目顺序，仅做浅拷贝，保持题库中的原始顺序
    const orderedQuestions = [...questionSet];
    setCurrentTotal(orderedQuestions.length);
    setUnanswered(orderedQuestions);
    setAnswered([]);
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
    setIsSbsReadingCompleted(false);

    const currentIsBatchMode = ['contextual_cloze', 'pos', 'verb_forms', 'sbs'].includes(bankForQuiz.mode);
    if (currentIsBatchMode) {
      let batchSize = TABLE_BATCH_SIZE; // pos / verb_forms 默认每批 1 题，与 use-batch-processor.ts 保持一致
      if (bankForQuiz.mode === 'contextual_cloze') batchSize = isDesktop ? 5 : 2;
      if (bankForQuiz.mode === 'sbs') batchSize = 1;
      setTotalBatches(Math.ceil(orderedQuestions.length / batchSize));
      setBatchesCompleted(0);
      prepareBatch(bankForQuiz.mode, orderedQuestions);
    }
  }, [prepareBatch, setCurrentBank, setCurrentTotal, setUnanswered, setAnswered, setIsAnswerVisible, setIsMcqAnswered, setCanMarkLayeredReveal, setIsSbsReadingCompleted, setTotalBatches, setBatchesCompleted, isDesktop]);

  // 【核心修改】使用 ref 记录已初始化的题库，防止窗口尺寸变化（isDesktop 改变）
  // 导致 startQuiz 重新创建时，重复初始化并重置答题进度
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

  const handleNextBatch = () => {
    let currentBatch: Question[] = [];
    if (currentBank.mode === 'pos' || currentBank.mode === 'verb_forms') currentBatch = currentTableBatch;
    else if (currentBank.mode === 'contextual_cloze') currentBatch = currentClozeGroup;
    else if (currentBank.mode === 'sbs' && currentQuestion) currentBatch = [currentQuestion];

    const nextUnanswered = unanswered.filter(q => !currentBatch.some(cb => cb.id === q.id));
    setUnanswered(nextUnanswered);
    setAnswered(prev => [...prev, ...currentBatch.map(q => ({ question: q, wasCorrect: true }))]);
    setBatchesCompleted(prev => prev + 1);
    prepareBatch(currentBank.mode, nextUnanswered);
    setIsSbsReadingCompleted(false);
    setIsAnswerVisible(false); // 确保在进入下一批时隐藏答案
  };

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
  const handleAllLayersRevealed = () => setCanMarkLayeredReveal(true);
  const handleSbsReadingComplete = () => setIsSbsReadingCompleted(true);
  const handleShowAnswer = () => setIsAnswerVisible(true);

  const handleUndo = () => {
    if (answered.length === 0 || isBatchMode) return;
    const lastAnswered = answered[answered.length - 1];
    setUnanswered(prev => [lastAnswered.question, ...prev]);
    setAnswered(prev => prev.slice(0, -1));
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
  };

  const getCurrentBatch = () => {
    if (currentBank.mode === 'contextual_cloze') return currentClozeGroup;
    if (currentBank.mode === 'pos' || currentBank.mode === 'verb_forms') return currentTableBatch;
    if (currentBank.mode === 'sbs' && currentQuestion) return [currentQuestion];
    return [];
  };

  const isCompleted = isBatchMode ? getCurrentBatch().length === 0 && answered.length > 0 : !currentQuestion && answered.length > 0;

  const handleSelectSubBank = (selectedBank: QuestionBank) => startQuiz(selectedBank.questions || [], selectedBank);

  return {
    currentBank, currentQuestion, answered, isAnswerVisible, isMcqAnswered, canMarkLayeredReveal,
    isSbsReadingCompleted, isBatchMode, isCompleted, currentTableBatch,
    currentClozeGroup, currentClozeOptions, correctCount, incorrectCount, answeredCount,
    currentTotal, batchesCompleted, totalBatches, startQuiz, handleMark, handleNextBatch,
    handleMcqOptionSelected, handleNextMcq, handleAllLayersRevealed, handleSbsReadingComplete,
    handleShowAnswer, handleSelectSubBank, handleUndo
  };
}