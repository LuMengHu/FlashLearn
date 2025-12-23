// components/quiz/quiz-client.tsx
'use client';

import React, { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import type { QuestionBank, Question } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Undo2, Volume2, VolumeX } from 'lucide-react';
import SubBankSelector from '@/components/sub-bank-selector';
import { useQuizEngine } from '@/hooks/use-quiz-engine';
import { cn } from '@/lib/utils';

// 骨架加载组件
const SkeletonCard = () => (
  <div className="bg-slate-900/50 border-slate-800 text-white shadow-lg rounded-lg p-6 animate-pulse">
    <div className="h-8 bg-slate-700 rounded w-3/4 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-slate-700 rounded"></div>
      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      <div className="h-4 bg-slate-700 rounded w-4/6"></div>
    </div>
  </div>
);

// 动态导入所有模式组件，带有加载状态
const QA = dynamic(() => import('./qa'), {
  loading: () => <SkeletonCard />
});
const MCQ = dynamic(() => import('./mcq'), {
  loading: () => <SkeletonCard />
});
const PoetryPair = dynamic(() => import('./poetry-pair'), {
  loading: () => <SkeletonCard />
});
const PoetryCompletion = dynamic(() => import('./poetry-completion'), {
  loading: () => <SkeletonCard />
});
const LayeredReveal = dynamic(() => import('./layered-reveal'), {
  loading: () => <SkeletonCard />
});
const InitialHint = dynamic(() => import('./initial-hint'), {
  loading: () => <SkeletonCard />
});
const ContextualCloze = dynamic(() => import('./contextual-cloze'), {
  loading: () => <SkeletonCard />
});
const Pos = dynamic(() => import('./pos'), {
  loading: () => <SkeletonCard />
});
const VerbForms = dynamic(() => import('./verb-forms'), {
  loading: () => <SkeletonCard />
});
const SBS = dynamic(() => import('./sbs'), {
  loading: () => <SkeletonCard />
});

interface Props {
  bank: QuestionBank;
  initialQuestions: Question[];
  siblingBanks: QuestionBank[] | null;
  allBanks: QuestionBank[];
}

export default function QuizClient({ bank, initialQuestions, siblingBanks, allBanks }: Props) {
  const {
    currentBank, currentQuestion, answered, isAnswerVisible, isMcqAnswered,
    canMarkLayeredReveal, isSbsReadingCompleted, isBatchMode,
    isCompleted, currentTableBatch, currentClozeGroup, currentClozeOptions,
    correctCount, incorrectCount, answeredCount, currentTotal, batchesCompleted, totalBatches,
    handleUndo, handleShowAnswer, handleNextBatch, handleMark, handleMcqOptionSelected,
    handleNextMcq, handleAllLayersRevealed, handleSbsReadingComplete,
    handleSelectSubBank, startQuiz,
  } = useQuizEngine({ bank, initialQuestions });

  const [isAutoPlayOn, setIsAutoPlayOn] = useState(false);
  const toggleAutoPlay = () => setIsAutoPlayOn(prev => !prev);

  const handleReturn = () => {
    const parentId = currentBank.parentId || bank.id;
    const parentBank = allBanks.find(b => b.id === parentId);
    if (parentBank) {
      sessionStorage.setItem('lastParentBankId', String(parentBank.id));
      sessionStorage.setItem('lastParentBankCategory', parentBank.category || '未分类');
    }
    window.location.href = '/';
  };

  if (isCompleted) {
    return (
        <div className="flex-grow flex items-center justify-center">
            <div className="w-full max-w-md text-center p-6 sm:p-10 bg-slate-900/50 border border-slate-800 rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold mb-4 text-slate-100">🎉 恭喜你，完成了一轮！</h2>
                <p className="text-lg text-slate-300 mb-8">总题数: {currentTotal} | <span className="text-brand-green-500">完成: {answeredCount}</span></p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button onClick={() => startQuiz(currentBank.questions || [], currentBank)} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">重新开始本节</Button>
                    {!isBatchMode && incorrectCount > 0 && <Button onClick={() => startQuiz(answered.filter(a => !a.wasCorrect).map(a => a.question), currentBank)} variant="destructive" size="lg">只复习错题</Button>}
                </div>
            </div>
        </div>
    );
  }

  const renderCard = () => {
    if (!currentQuestion && !isBatchMode) return null;

    // 【核心修复】为每个卡片组件添加一个唯一的 `key` 属性。
    // 当 key 改变时，React会销毁旧组件并创建一个新组件，从而避免状态残留。
    switch (currentBank.mode) {
      case 'pos':
        return <Pos key={currentTableBatch[0]?.id || 'pos'} rows={currentTableBatch} isAnswerVisible={isAnswerVisible} />;
      case 'verb_forms':
        return <VerbForms key={currentTableBatch[0]?.id || 'verb_forms'} rows={currentTableBatch} isAnswerVisible={isAnswerVisible} />;
      case 'contextual_cloze':
        return <ContextualCloze key={currentClozeGroup[0]?.id || 'cloze'} questions={currentClozeGroup} options={currentClozeOptions} isAnswerVisible={isAnswerVisible} />;
      case 'sbs':
        return <SBS key={currentQuestion.id} question={currentQuestion} onReadingComplete={handleSbsReadingComplete} />;
      case 'mcq':
        return <MCQ key={currentQuestion.id} question={currentQuestion} onOptionSelected={handleMcqOptionSelected} />;
      case 'poetry_pair':
        return <PoetryPair key={currentQuestion.id} question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'poetry_completion':
        return <PoetryCompletion key={currentQuestion.id} question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'layered_reveal':
        return <LayeredReveal key={currentQuestion.id} question={currentQuestion} onAllLayersRevealed={handleAllLayersRevealed} />;
      case 'initial_hint':
        return <InitialHint key={currentQuestion.id} question={currentQuestion} isAnswerVisible={isAnswerVisible} isAutoPlayOn={isAutoPlayOn} />;
      case 'qa':
      default:
        return <QA key={currentQuestion.id} question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full flex-grow">
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <Button onClick={handleReturn} variant="ghost" size="lg" className="p-2 flex items-center gap-1 text-slate-400 hover:bg-slate-700/50 hover:text-white px-2 py-1 rounded-md transition-colors"><Undo2 className="rotate-180" size={20}/>返回</Button>
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-200 bg-slate-800/70 border border-slate-700 px-6 py-2 rounded-lg truncate">{currentBank.name}</h1>
          <div className="justify-self-end">{siblingBanks && (<SubBankSelector currentBankId={currentBank.id} parentBankId={bank.id} siblingBanks={siblingBanks} onSelectSubBank={handleSelectSubBank} />)}</div>
        </div>
        <div className="w-full">
          <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
            <span>{isBatchMode ? `进度: ${batchesCompleted} / ${totalBatches}` : `进度: ${answeredCount} / ${currentTotal}`}</span>

            <div className="flex items-center gap-4">
              {!isBatchMode && (
                <>
                  <span className="text-brand-green-500">答对: {correctCount}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-brand-red-500">答错: {incorrectCount}</span>
                </>
              )}
              {currentBank.mode === 'initial_hint' && (
                <Button
                  onClick={toggleAutoPlay}
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8 transition-colors", isAutoPlayOn ? 'text-brand-cyan-400 hover:text-brand-cyan-300' : 'text-slate-500 hover:text-slate-300')}
                  title={isAutoPlayOn ? '关闭自动播放' : '开启自动播放'}
                >
                  {isAutoPlayOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </Button>
              )}
              {!isBatchMode && (
                <Button onClick={handleUndo} disabled={answered.length === 0} variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-30">
                  <Undo2 size={18} />
                  <span className="sr-only">撤销上一题</span>
                </Button>
              )}
            </div>
          </div>
          <Progress value={isBatchMode ? (totalBatches > 0 ? (batchesCompleted / totalBatches) * 100 : 0) : (currentTotal > 0 ? (answeredCount / currentTotal) * 100 : 0)} className="w-full h-2 bg-slate-800" />
        </div>
      </div>
      <div className="min-h-[500px] flex flex-col justify-between">
        {renderCard()}
        <div className="mt-8 text-center h-16">
          {isBatchMode ? (
            currentBank.mode === 'sbs'
              ? (isSbsReadingCompleted && <Button onClick={handleNextBatch} size="lg" className="bg-green-600 hover:bg-green-700 text-white">完成阅读</Button>)
              : (isAnswerVisible
                  ? <Button onClick={handleNextBatch} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">下一组</Button>
                  : <Button onClick={handleShowAnswer} size="lg" className="bg-green-600 hover:bg-green-700 text-white">确认答案</Button>)
          ) : currentBank.mode === 'layered_reveal' ? (
            canMarkLayeredReveal && (
              <div className="flex justify-center space-x-4">
                <Button onClick={() => handleMark(true)} className="bg-green-600 hover:bg-green-700 text-white" size="lg">我答对了</Button>
                <Button onClick={() => handleMark(false)} variant="destructive" size="lg">我答错了</Button>
              </div>
            )
          ) : currentBank.mode === 'mcq' ? (
              isMcqAnswered && (
                  <Button onClick={handleNextMcq} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">下一题</Button>
              )
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
