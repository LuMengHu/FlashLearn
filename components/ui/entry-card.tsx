// 入口卡片：分类页和首页共用的可点击大卡片
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EntryCard({
  href,
  emoji,
  title,
  description,
  meta,
  accent = 'cyan',
  size = 'md',
}: {
  href: string;
  emoji: string;
  title: string;
  description?: string;
  meta?: string;
  accent?: 'cyan' | 'amber' | 'violet';
  size?: 'md' | 'lg';
}) {
  const accentRing = {
    cyan: 'group-hover:border-cyan-600/70 group-hover:shadow-cyan-950/40',
    amber: 'group-hover:border-amber-600/70 group-hover:shadow-amber-950/40',
    violet: 'group-hover:border-violet-600/70 group-hover:shadow-violet-950/40',
  }[accent];

  const accentGlow = {
    cyan: 'from-cyan-500/10',
    amber: 'from-amber-500/10',
    violet: 'from-violet-500/10',
  }[accent];

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-900/80 hover:shadow-xl',
        accentRing,
        size === 'lg' ? 'p-6 sm:p-7' : 'p-5'
      )}
    >
      {/* 悬停时的渐变高光 */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          accentGlow
        )}
      />

      <div
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/60',
          size === 'lg' ? 'h-16 w-16 text-3xl' : 'h-12 w-12 text-2xl'
        )}
      >
        {emoji}
      </div>

      <div className="relative min-w-0 flex-1">
        <h3 className={cn('font-bold text-slate-100', size === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg')}>{title}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>}
        {meta && <p className="mt-2 text-xs text-slate-600">{meta}</p>}
      </div>

      <ChevronRight
        size={20}
        className="relative shrink-0 text-slate-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-slate-300"
      />
    </Link>
  );
}
