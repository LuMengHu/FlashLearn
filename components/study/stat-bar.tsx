// 练习中的顶部统计条：本轮进度 + 对错计数 + 回退上一题 + 可选的额外控件（如自动发音开关）
import { Undo2 } from 'lucide-react';

export function StatBar({
  done,
  total,
  right,
  wrong,
  rightLabel = '答对',
  wrongLabel = '答错',
  onUndo,
  canUndo = false,
  extra,
}: {
  done: number;
  total: number;
  right: number;
  wrong: number;
  rightLabel?: string;
  wrongLabel?: string;
  /** 传了就显示「回退上一题」按钮 */
  onUndo?: () => void;
  canUndo?: boolean;
  extra?: React.ReactNode;
}) {
  const percent = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-500">
          进度 <span className="font-medium tabular-nums text-slate-300">{done}</span>
          <span className="text-slate-600"> / {total}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="text-brand-green-500 tabular-nums">{rightLabel} {right}</span>
          <span className="text-slate-700">·</span>
          <span className="text-brand-red-500 tabular-nums">{wrongLabel} {wrong}</span>
          {onUndo && (
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="回退上一题"
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-slate-700 text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-200 disabled:opacity-30 disabled:hover:border-slate-700 disabled:hover:text-slate-500"
            >
              <Undo2 size={14} />
              <span className="sr-only">回退上一题</span>
            </button>
          )}
          {extra}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
