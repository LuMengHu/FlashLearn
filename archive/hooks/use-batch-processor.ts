// 批次准备逻辑：为 pos/verb_forms（每次 1 题）和 contextual_cloze（按屏幕尺寸分组）准备下一批题目
'use client';

import { useCallback } from 'react';
import type { Question } from '@/lib/schema';
import { shuffle } from '@/lib/utils';
import { useMediaQuery } from './use-media-query';

// pos/verb_forms 每批固定只取 1 题；同时导出给 use-quiz-engine.ts 计算 totalBatches，避免两处批大小定义不一致
export const TABLE_BATCH_SIZE = 1;

interface BatchProcessorProps {
  setCurrentTableBatch: (batch: Question[]) => void;
  setCurrentClozeGroup: (group: Question[]) => void;
  setCurrentClozeOptions: (options: string[]) => void;
}

export function useBatchProcessor({
  setCurrentTableBatch,
  setCurrentClozeGroup,
  setCurrentClozeOptions,
}: BatchProcessorProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const prepareNewTableBatch = useCallback((questionsPool: Question[]) => {
    if (questionsPool.length === 0) { setCurrentTableBatch([]); return; }
    const batch = shuffle(questionsPool).slice(0, TABLE_BATCH_SIZE);
    setCurrentTableBatch(batch);
  }, [setCurrentTableBatch]);

  const prepareNewClozeQuiz = useCallback((questionsPool: Question[]) => {
    if (questionsPool.length === 0) { setCurrentClozeGroup([]); return; }
    const families = new Map<string, Question[]>();
    questionsPool.forEach(q => {
      const key = (q.metadata as any)?.familyKey;
      if (key) {
        if (!families.has(key)) families.set(key, []);
        families.get(key)!.push(q);
      }
    });
    const groupSize = isDesktop ? 5 : 2;
    const familyKeys = Array.from(families.keys());
    const familiesToDraw = Math.min(familyKeys.length, groupSize);
    const chosenFamilyKeys = shuffle(familyKeys).slice(0, familiesToDraw);
    const quizGroup: Question[] = [];
    chosenFamilyKeys.forEach(key => {
      const questionsInFamily = families.get(key)!;
      quizGroup.push(questionsInFamily[Math.floor(Math.random() * questionsInFamily.length)]);
    });
    const options: string[] = [];
    quizGroup.forEach(q => {
      const forms = (q.metadata as any)?.forms;
      if (forms && Array.isArray(forms) && forms.length > 0) { options.push(forms[Math.floor(Math.random() * forms.length)]); } else { options.push(q.answer); }
    });
    const distractorPool = familyKeys.filter(key => !chosenFamilyKeys.includes(key));
    if (distractorPool.length > 0) {
      const distractorKey = distractorPool[Math.floor(Math.random() * distractorPool.length)];
      const distractorFamilyQuestions = families.get(distractorKey);
      if (distractorFamilyQuestions && distractorFamilyQuestions.length > 0) {
        const distractorForms = (distractorFamilyQuestions[0].metadata as any)?.forms;
        if (distractorForms && Array.isArray(distractorForms) && distractorForms.length > 0) { options.push(distractorForms[Math.floor(Math.random() * distractorForms.length)]); }
      }
    }
    setCurrentClozeGroup(quizGroup);
    setCurrentClozeOptions(shuffle(Array.from(new Set(options))));
  }, [isDesktop, setCurrentClozeGroup, setCurrentClozeOptions]);

  const prepareBatch = useCallback((mode: string, questionsPool: Question[]) => {
    if (mode === 'pos' || mode === 'verb_forms') {
      prepareNewTableBatch(questionsPool);
    } else if (mode === 'contextual_cloze') {
      prepareNewClozeQuiz(questionsPool);
    }
  }, [prepareNewTableBatch, prepareNewClozeQuiz]);

  return { prepareBatch };
}
