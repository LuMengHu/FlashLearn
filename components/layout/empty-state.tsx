// 空状态：某个题库/单词库还没有内容时显示，可选带一个引导按钮
import Link from 'next/link';

export function EmptyState({
  message,
  actionHref,
  actionLabel,
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center">
      <p className="mb-4 text-slate-400">{message}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-block rounded-xl bg-cyan-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-cyan-500"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
