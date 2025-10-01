// components/hooks/useQuizEngine.ts
'use client';

import { useEffect, useMemo, useCallback } from 'react';
import type { QuestionBank, Question } from '@/lib/schema';
import { shuffle } from '@/lib/utils';
import { useQuizState } from './useQuizState';
import { useBatchProcessor } from './useBatchProcessor';
import { useMediaQuery } from './useMediaQuery'; // 确保导入 useMediaQuery

const BATCH_SIZE = 5;

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
  
  // 我们需要在主 Hook 中获取 isDesktop
  const isDesktop = useMediaQuery('(min-width: 768px)'); 

  const isBatchMode = useMemo(() => ['contextual_cloze', 'pos', 'verb_forms', 'sbs'].includes(currentBank.mode), [currentBank.mode]);
  const isSingleItemBatchMode = useMemo(() => currentBank.mode === 'sbs', [currentBank.mode]);

  const startQuiz = useCallback((questionSet: Question[], bankForQuiz: QuestionBank) => {
    setCurrentBank(bankForQuiz);
    const shuffledQuestions = shuffle(questionSet);
    setCurrentTotal(shuffledQuestions.length);
    setUnanswered(shuffledQuestions);
    setAnswered([]);
    setIsAnswerVisible(false);
    setIsMcqAnswered(false);
    setCanMarkLayeredReveal(false);
    setIsSbsReadingCompleted(false);

    const currentIsBatchMode = ['contextual_cloze', 'pos', 'verb_forms', 'sbs'].includes(bankForQuiz.mode);
    if (currentIsBatchMode) {
      let batchSize = BATCH_SIZE;
      // 【核心修复】现在可以安全地访问 metadata
      if (bankForQuiz.mode === 'contextual_cloze') batchSize = isDesktop ? 5 : 2; 
      if (bankForQuiz.mode === 'sbs') batchSize = 1;
      setTotalBatches(Math.ceil(shuffledQuestions.length / batchSize));
      setBatchesCompleted(0);
      prepareBatch(bankForQuiz.mode, shuffledQuestions);
    }
  }, [prepareBatch, setCurrentBank, setCurrentTotal, setUnanswered, setAnswered, setIsAnswerVisible, setIsMcqAnswered, setCanMarkLayeredReveal, setIsSbsReadingCompleted, setTotalBatches, setBatchesCompleted, isDesktop]); // 添加 isDesktop 依赖

  useEffect(() => { startQuiz(initialQuestions, bank); }, [initialQuestions, bank, startQuiz]);
  
  const currentQuestion = unanswered[0];
  const { correctCount, incorrectCount } = useMemo(() => answered.reduce((acc, a) => { a.wasCorrect ? acc.correctCount++ : acc.incorrectCount++; return acc; }, { correctCount: 0, incorrectCount: 0 }), [answered]);
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
  
  const handleMcqOptionSelected = (isCorrect: boolean) => { if (currentQuestion) { setIsMcqAnswered(true); setAnswered(prev => [...prev, { question: currentQuestion, wasCorrect: isCorrect }]); } };
  const handleNextMcq = () => { if (currentQuestion) { setUnanswered(prev => prev.slice(1)); setIsMcqAnswered(false); } };
  const handleAllLayersRevealed = () => setCanMarkLayeredReveal(true);
  const handleSbsReadingComplete = () => setIsSbsReadingCompleted(true);
  const handleShowAnswer = () => setIsAnswerVisible(true);
  const handleReturn = () => { const parentId = currentBank.parentId || bank.id; sessionStorage.setItem('lastParentBankId', String(parentId)); window.location.href = '/'; };

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
    isSbsReadingCompleted, isBatchMode, isSingleItemBatchMode, isCompleted, currentTableBatch,
    currentClozeGroup, currentClozeOptions, correctCount, incorrectCount, answeredCount,
    currentTotal, batchesCompleted, totalBatches, startQuiz, handleMark, handleNextBatch,
    handleMcqOptionSelected, handleNextMcq, handleAllLayersRevealed, handleSbsReadingComplete,
    handleShowAnswer, handleSelectSubBank, handleReturn, handleUndo
  };
}
