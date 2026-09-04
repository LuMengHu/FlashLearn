// 分段标签栏：把很长的内容切成几段，顶部一排标签直接跳转，不用一路往下滚
'use client';

import { cn } from '@/lib/utils';

export type SectionTab = {
  key: string;
  label: string;
  /** 右上角的小数字，比如条目数量 */
  count?: number;
  /** 该段是否为空，空的会淡显 */
  empty?: boolean;
};

export function SectionTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: SectionTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'scrollbar-hide -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1',
        className
      )}
    >
      {tabs.map(tab => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'border-cyan-600 bg-cyan-950/50 text-cyan-300'
                : tab.empty
                  ? 'border-slate-800 text-slate-600 hover:text-slate-400'
                  : 'border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60'
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs tabular-nums',
                  isActive ? 'bg-cyan-900/70 text-cyan-300' : 'bg-slate-800 text-slate-500'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
