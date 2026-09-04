// 背题页的客户端外壳：接入 useQuizEngine，按当前题库的 mode 渲染对应卡片，并展示进度/操作按钮
'use client';

import dynamic from 'next/dynamic';
import type { QuestionBank, Question } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Undo2 } from 'lucide-react';
import SubBankSelector from '@/components/diplomatic/sub-bank-selector';
import { useQuizEngine } from '@/hooks/use-quiz-engine';

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

// 动态导入模式组件，带有加载状态
const QA = dynamic(() => import('./qa-card'), {
  loading: () => <SkeletonCard />
});
const MCQ = dynamic(() => import('./mcq-card'), {
  loading: () => <SkeletonCard />
});

interface Props {
  bank: QuestionBank;
  initialQuestions: Question[];
  siblingBanks: QuestionBank[] | null;
  allBanks: QuestionBank[];
}

export default function QuizClient({ bank, initialQuestions, siblingBanks, allBanks }: Props) {
  // 外交知识不做题量拆分与熟练度排序，进来就是整套题库按原顺序练
  const {
    currentBank, currentQuestion, answered, isAnswerVisible, isMcqAnswered, isCompleted,
    correctCount, incorrectCount, answeredCount, currentTotal, attempt,
    handleUndo, handleShowAnswer, handleMark, handleMcqOptionSelected,
    handleNextMcq, handleSelectSubBank, startQuiz,
  } = useQuizEngine({ bank, initialQuestions });

  const handleReturn = () => {
    window.location.href = '/diplomatic';
  };

  if (isCompleted) {
    return (
        <div className="flex-grow flex items-center justify-center">
            <div className="w-full max-w-md text-center p-6 sm:p-10 bg-slate-900/50 border border-slate-800 rounded-lg shadow-xl">
                <h2 className="text-3xl font-bold mb-4 text-slate-100">🎉 恭喜你，完成了一轮！</h2>
                <p className="text-lg text-slate-300 mb-8">总题数: {currentTotal} | <span className="text-brand-green-500">完成: {answeredCount}</span></p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Button onClick={() => startQuiz(currentBank.questions || [], currentBank)} size="lg" className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white">重新开始本节</Button>
                    {incorrectCount > 0 && <Button onClick={() => startQuiz(answered.filter(a => !a.wasCorrect).map(a => a.question), currentBank)} variant="destructive" size="lg">只复习错题</Button>}
                </div>
            </div>
        </div>
    );
  }

  const renderCard = () => {
    if (!currentQuestion) return null;

    // key 里带上 attempt，撤销回同一道题时也能强制重建组件，避免上一次的揭晓状态残留
    const cardKey = `${currentQuestion.id}-${attempt}`;

    switch (currentBank.mode) {
      case 'mcq':
        return <MCQ key={cardKey} question={currentQuestion} onOptionSelected={handleMcqOptionSelected} />;
      case 'qa':
      default:
        return <QA key={cardKey} question={currentQuestion} isAnswerVisible={isAnswerVisible} />;
    }
  };

  return (
    <div className="flex flex-col w-full h-full flex-grow">
      <div className="mb-8 space-y-4">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <Button
            onClick={handleReturn}
            variant="ghost"
            size="lg"
            className="p-2 flex items-center gap-1 text-slate-400 hover:bg-slate-700/50 hover:text-white px-2 py-1 rounded-md transition-colors"
          >
            <Undo2 className="rotate-180" size={20} />
            返回
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-200 bg-slate-800/70 border border-slate-700 px-6 py-2 rounded-lg truncate">
            {currentBank.name}
          </h1>
          <div className="justify-self-end">
            {siblingBanks && (
              <SubBankSelector
                currentBankId={currentBank.id}
                parentBankId={bank.id}
                siblingBanks={siblingBanks}
                onSelectSubBank={handleSelectSubBank}
              />
            )}
          </div>
        </div>
        <div className="w-full">
          <div className="flex justify-between items-center text-sm text-slate-400 mb-2">
            <span>{`进度: ${answeredCount} / ${currentTotal}`}</span>

            <div className="flex items-center gap-4">
              <span className="text-brand-green-500">答对: {correctCount}</span>
              <span className="text-slate-600">|</span>
              <span className="text-brand-red-500">答错: {incorrectCount}</span>
              <Button onClick={handleUndo} disabled={answered.length === 0} variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-30">
                <Undo2 size={18} />
                <span className="sr-only">撤销上一题</span>
              </Button>
            </div>
          </div>
          <Progress value={currentTotal > 0 ? (answeredCount / currentTotal) * 100 : 0} className="w-full h-2 bg-slate-800" />
        </div>
      </div>
      <div className="min-h-[500px] flex flex-col justify-between">
        {renderCard()}
        <div className="mt-8 text-center h-16">
          {currentBank.mode === 'mcq' ? (
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
