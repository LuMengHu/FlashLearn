// 全站统一的页面外壳：深色底 + 顶部返回/标题栏 + 居中内容区
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageShell({
  title,
  subtitle,
  backHref = '/',
  action,
  width = 'md',
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: React.ReactNode;
  width?: 'md' | 'lg';
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 顶部氛围光 */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(34,211,238,0.10),transparent)]" />

      <div className={cn('relative mx-auto px-4 py-6 sm:py-8', width === 'lg' ? 'max-w-5xl' : 'max-w-3xl')}>
        <header className="mb-8 flex items-center gap-4">
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-100"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>

        {children}
      </div>
    </main>
  );
}

/** 统计条：进度 + 计分 */
export function StatBar({
  done,
  total,
  right,
  wrong,
  rightLabel = '答对',
  wrongLabel = '答错',
  extra,
}: {
  done: number;
  total: number;
  right: number;
  wrong: number;
  rightLabel?: string;
  wrongLabel?: string;
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

/** 一轮练习结束后的结算卡 */
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
        共 {total} 题 ·{' '}
        <span className="text-brand-green-500">{rightLabel} {right}</span> ·{' '}
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

/** 空状态 */
export function EmptyState({ message, actionHref, actionLabel }: { message: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center">
      <p className="mb-4 text-slate-400">{message}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="inline-block rounded-xl bg-cyan-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-cyan-500">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
