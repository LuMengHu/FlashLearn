// 全站统一的页面外壳：深色底 + 顶部返回/标题栏 + 居中内容区
// 除首页外的所有页面都套这一层，保证返回按钮、标题、宽度一致。
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
