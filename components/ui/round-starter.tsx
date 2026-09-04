// 开始一轮练习前的准备页：显示掌握情况 + 自己填本轮题量
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StudySummary = { fresh: number; learning: number; mastered: number; total: number };

export function RoundStarter({
  summary,
  onStart,
  unit = '题',
}: {
  summary: StudySummary;
  onStart: (count: number) => void;
  unit?: string;
}) {
  const suggested = Math.min(20, summary.total);
  const [value, setValue] = useState(String(suggested));

  const parsed = Number(value);
  const count = Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), summary.total) : 0;

  const start = () => {
    if (count > 0) onStart(count);
  };

  return (
    <div className="space-y-5">
      {/* 掌握情况 */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="未学" value={summary.fresh} tone="cyan" />
        <StatBlock label="生疏" value={summary.learning} tone="amber" />
        <StatBlock label="已掌握" value={summary.mastered} tone="green" />
      </div>

      {/* 进度总览条 */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-800">
        {summary.mastered > 0 && (
          <div className="bg-brand-green-500" style={{ width: `${(summary.mastered / summary.total) * 100}%` }} />
        )}
        {summary.learning > 0 && (
          <div className="bg-amber-500" style={{ width: `${(summary.learning / summary.total) * 100}%` }} />
        )}
      </div>

      {/* 题量 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg">
        <label className="mb-2 block text-sm text-slate-400">这一轮练多少{unit}？</label>
        <div className="flex gap-3">
          <Input
            type="number"
            min={1}
            max={summary.total}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') start();
            }}
            className="h-12 border-slate-700 bg-slate-950/60 text-lg text-slate-100 focus-visible:ring-cyan-600"
            autoFocus
          />
          <button
            onClick={start}
            disabled={count <= 0}
            className="flex h-12 shrink-0 items-center gap-2 rounded-xl bg-cyan-600 px-7 font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-40"
          >
            <Play size={18} />
            开始
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-600">快捷：</span>
          {[10, 20, 30, 50].filter(n => n <= summary.total).map(n => (
            <button
              key={n}
              onClick={() => setValue(String(n))}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs transition-colors',
                Number(value) === n
                  ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
              )}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setValue(String(summary.total))}
            className={cn(
              'rounded-lg border px-2.5 py-1 text-xs transition-colors',
              Number(value) === summary.total
                ? 'border-cyan-600 bg-cyan-950/50 text-cyan-400'
                : 'border-slate-700 text-slate-500 hover:text-slate-300'
            )}
          >
            全部 {summary.total}
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          没练过的会排在最前面，越生疏的越常出现；答对升一级，答错掉回最低级。
          不设复习间隔，随时都能再来一轮。
        </p>
      </div>
    </div>
  );
}

function StatBlock({ label, value, tone }: { label: string; value: number; tone: 'cyan' | 'amber' | 'green' }) {
  const toneClass = {
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    green: 'text-brand-green-500',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-center">
      <p className={cn('text-2xl font-bold tabular-nums', toneClass)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}
