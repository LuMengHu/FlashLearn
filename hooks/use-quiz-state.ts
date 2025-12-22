// components/hooks/useQuizState.ts
'use client';

import { useState } from 'react';
import type { QuestionBank, Question } from '@/lib/schema';

type AnsweredQuestion = {
  question: Question;
  wasCorrect: boolean;
};

export function useQuizState(initialBank: QuestionBank) {
  const [currentBank, setCurrentBank] = useState<QuestionBank>(initialBank);
  const [unanswered, setUnanswered] = useState<Question[]>([]);
  const [answered, setAnswered] = useState<AnsweredQuestion[]>([]);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [totalBatches, setTotalBatches] = useState(0);
  const [batchesCompleted, setBatchesCompleted] = useState(0);
  const [currentClozeGroup, setCurrentClozeGroup] = useState<Question[]>([]);
  const [currentClozeOptions, setCurrentClozeOptions] = useState<string[]>([]);
  const [currentTableBatch, setCurrentTableBatch] = useState<Question[]>([]);
  const [isMcqAnswered, setIsMcqAnswered] = useState(false);
  const [canMarkLayeredReveal, setCanMarkLayeredReveal] = useState(false);
  const [isSbsReadingCompleted, setIsSbsReadingCompleted] = useState(false);

  return {
    // State values
    currentBank, unanswered, answered, currentTotal, isAnswerVisible, totalBatches,
    batchesCompleted, currentClozeGroup, currentClozeOptions, currentTableBatch,
    isMcqAnswered, canMarkLayeredReveal, isSbsReadingCompleted,
    // State setters
    setCurrentBank, setUnanswered, setAnswered, setCurrentTotal, setIsAnswerVisible,
    setTotalBatches, setBatchesCompleted, setCurrentClozeGroup, setCurrentClozeOptions,
    setCurrentTableBatch, setIsMcqAnswered, setCanMarkLayeredReveal, setIsSbsReadingCompleted,
  };
}
