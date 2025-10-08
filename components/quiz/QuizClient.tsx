// components/quiz/QuizClient.tsx
'use client';

import React, { useState } from 'react';
import type { QuestionBank } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Undo2, Volume2, VolumeX } from 'lucide-react';
import SubBankSelector from '@/components/SubBankSelector';
import { useQuizEngine } from '../hooks/useQuizEngine';
import { cn } from '@/lib/utils';

// 导入所有模式组件
import QA from './QA';
import MCQ from './MCQ';
import PoetryPair from './PoetryPair';
import PoetryCompletion from './PoetryCompletion';
import LayeredReveal from './LayeredReveal';
import InitialHint from './InitialHint';
import ContextualCloze from './ContextualCloze';
import Pos from './Pos';
import VerbForms from './VerbForms';
import SBS from './SBS';

interface Props {
  bank: QuestionBank;
  initialQuestions: any[];
  siblingBanks: QuestionBank[] | null;
  allBanks: QuestionBank[];
}

export default function QuizClient({ bank, initialQuestions, siblingBanks, allBanks }: Props) {
  const {
    currentBank, currentQuestion, answered, isAnswerVisible, isMcqAnswered,
    canMarkLayeredReveal, isSbsReadingCompleted, isBatchMode, isSingleItemBatchMode,
    isCompleted, currentTableBatch, currentClozeGroup, currentClozeOptions,
    correctCount, incorrectCount, answeredCount, currentTotal, batchesCompleted, totalBatches,
    handleUndo, handleShowAnswer, handleNextBatch, handleMark, handleMcqOptionSelected,
    handleNextMcq, handleAllLayersRevealed, handleSbsReadingComplete,
    handleSelectSubBank, startQuiz,
  } = useQuizEngine({ bank, initialQuestions });

  // 【核心修复 1】重新加入自动播放状态和切换函数
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
    if (!currentQuestion) return null;
    switch (currentBank.mode) {
      case 'pos': return <Pos rows={currentTableBatch} isAnswerVisible={isAnswerVisible} />;
      case 'verb_forms': return <VerbForms rows={currentTableBatch} isAnswerVisible={isAnswerVisible} />;
      case 'contextual_cloze': return <ContextualCloze questions={currentClozeGroup} options={currentClozeOptions} isAnswerVisible={isAnswerVisible} />;
      case 'sbs': return <SBS question={currentQuestion} onReadingComplete={handleSbsReadingComplete} />;
      case 'mcq': return <MCQ question={currentQuestion} onOptionSelected={handleMcqOptionSelected} />;
      case 'poetry_pair': return <PoetryPair question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'poetry_completion': return <PoetryCompletion question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
      case 'layered_reveal': return <LayeredReveal question={currentQuestion} onAllLayersRevealed={handleAllLayersRevealed} />;
      // 【核心修复 2】确保在渲染 InitialHint 时传递 isAutoPlayOn prop
      case 'initial_hint': return <InitialHint question={currentQuestion} isAnswerVisible={isAnswerVisible} isAutoPlayOn={isAutoPlayOn} />;
      case 'qa':
      default: return <QA question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
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
            
            {/* 【核心修复 3】重新加入包含自动播放按钮的控制区域 */}
            <div className="flex items-center gap-4">
              {!isBatchMode && (
                <>
                  <span className="text-brand-green-500">答对: {correctCount}</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-brand-red-500">答错: {incorrectCount}</span>
                </>
              )}
              {/* 自动播放开关，只在 initial_hint 模式下显示 */}
              {currentBank.mode === 'initial_hint' && (
                <Button 
                  onClick={toggleAutoPlay}
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "h-8 w-8 transition-colors",
                    isAutoPlayOn ? 'text-brand-cyan-400 hover:text-brand-cyan-300' : 'text-slate-500 hover:text-slate-300'
                  )}
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
