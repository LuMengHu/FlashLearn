// 背题会话的原始 state 集合：只负责状态存取，业务逻辑在 use-quiz-engine.ts 中组装
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
  const [isMcqAnswered, setIsMcqAnswered] = useState(false);

  return {
    // State values
    currentBank, unanswered, answered, currentTotal, isAnswerVisible, isMcqAnswered,
    // State setters
    setCurrentBank, setUnanswered, setAnswered, setCurrentTotal, setIsAnswerVisible,
    setIsMcqAnswered,
  };
}
