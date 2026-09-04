// 一轮练习结束后的结算卡：正确率 + 再来一轮 / 只练错的
export function RoundSummary({
  total,
  right,
  wrong,
  onRestart,
  onReviewWrong,
  rightLabel = '答对',
  wrongLabel = '答错',
}: {
  total: number;
  right: number;
  wrong: number;
  onRestart: () => void;
  onReviewWrong?: () => void;
  rightLabel?: string;
  wrongLabel?: string;
}) {
  const accuracy = total > 0 ? Math.round((right / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center shadow-xl">
      <div className="mb-2 text-5xl">{accuracy >= 80 ? '🎉' : accuracy >= 50 ? '💪' : '📚'}</div>
      <h2 className="mb-2 text-2xl font-bold">这一轮完成了</h2>
      <p className="mb-1 text-slate-400">
        共 {total} 题 · <span className="text-brand-green-500">{rightLabel} {right}</span> ·{' '}
        <span className="text-brand-red-500">{wrongLabel} {wrong}</span>
      </p>
      <p className="mb-6 text-3xl font-bold tabular-nums text-cyan-400">{accuracy}%</p>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button
          onClick={onRestart}
          className="rounded-xl bg-cyan-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-cyan-500"
        >
          再来一轮
        </button>
        {onReviewWrong && wrong > 0 && (
          <button
            onClick={onReviewWrong}
            className="rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-3 font-semibold text-slate-200 transition-colors hover:bg-slate-700"
          >
            只练错的 ({wrong})
          </button>
        )}
      </div>
    </div>
  );
}
