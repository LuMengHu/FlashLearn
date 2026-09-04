// 首页：三个分类入口（中文 / 英文 / 外交知识）+ 总体统计
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { chineseItems, words, questions } from '@/lib/schema';
import { sql as raw } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

type Category = {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  entries: string[];
  count: number;
  unit: string;
  gradient: string;
  glow: string;
};

async function countRows(table: any): Promise<number> {
  try {
    const [row] = await db.select({ count: raw<number>`count(*)`.mapWith(Number) }).from(table);
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  const [chineseCount, wordCount, questionCount] = await Promise.all([
    countRows(chineseItems),
    countRows(words),
    countRows(questions),
  ]);

  const categories: Category[] = [
    {
      href: '/chinese',
      emoji: '🀄',
      title: '中文',
      subtitle: '字词、常识与文言',
      entries: ['易错字辨析', '拼音', '六书', '文化常识', '作者常识', '文言常识'],
      count: chineseCount,
      unit: '条',
      gradient: 'from-amber-500/20 via-orange-500/5',
      glow: 'group-hover:border-amber-600/60',
    },
    {
      href: '/english',
      emoji: '🔤',
      title: '英文',
      subtitle: 'AI 整理 + 背单词',
      entries: ['背单词', '录入单词'],
      count: wordCount,
      unit: '个单词',
      gradient: 'from-cyan-500/20 via-teal-500/5',
      glow: 'group-hover:border-cyan-600/60',
    },
    {
      href: '/diplomatic',
      emoji: '🏛️',
      title: '外交知识',
      subtitle: '选择题题库',
      entries: ['1-100', '101-200', '201-300', '50'],
      count: questionCount,
      unit: '题',
      gradient: 'from-violet-500/20 via-purple-500/5',
      glow: 'group-hover:border-violet-600/60',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* 背景氛围 */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,rgba(34,211,238,0.13),transparent)]" />

      <div className="relative mx-auto max-w-4xl px-4 py-14 sm:py-20">
        {/* 标题区 */}
        <header className="mb-12 text-center sm:mb-16">
          <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-7xl">
            FlashLearn
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">科学高效地记住该记住的东西</p>

          <div className="mt-6 flex justify-center gap-6 text-sm text-slate-500">
            <span>
              <span className="font-semibold tabular-nums text-slate-300">{chineseCount}</span> 条中文
            </span>
            <span className="text-slate-700">·</span>
            <span>
              <span className="font-semibold tabular-nums text-slate-300">{wordCount}</span> 个单词
            </span>
            <span className="text-slate-700">·</span>
            <span>
              <span className="font-semibold tabular-nums text-slate-300">{questionCount}</span> 道题
            </span>
          </div>
        </header>

        {/* 三个分类 */}
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map(cat => (
            <Link
              key={cat.href}
              href={cat.href}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-slate-900/80 hover:shadow-2xl ${cat.glow}`}
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cat.gradient} to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-100`}
              />

              <div className="relative">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/70 text-3xl">
                  {cat.emoji}
                </div>

                <h2 className="text-2xl font-bold">{cat.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{cat.subtitle}</p>

                <ul className="mt-4 space-y-1.5">
                  {cat.entries.map(entry => (
                    <li key={entry} className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="h-1 w-1 rounded-full bg-slate-600" />
                      {entry}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="text-xs text-slate-600">
                    <span className="font-semibold tabular-nums text-slate-400">{cat.count}</span> {cat.unit}
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-slate-600 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-slate-300"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
