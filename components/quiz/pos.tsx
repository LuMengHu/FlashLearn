// components/quiz/Pos.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Question } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface Props {
  rows: Question[];
  isAnswerVisible: boolean;
  /**
   * 可选回调：当切换到上/下一题时触发。
   * 父组件可借此重置 isAnswerVisible（例如换题时自动收起答案）。
   */
  onIndexChange?: (index: number) => void;
}

export default function PosTable({ rows, isAnswerVisible, onIndexChange }: Props) {
  const headers = ['N.', 'V.', 'ADJ.', 'ADV.'];

  // 只保留有 pos_forms 数据的行
  const validRows = useMemo(
    () => rows.filter((row) => (row.metadata as any)?.pos_forms),
    [rows]
  );

  // 【需求1】每次只显示 1 行（1 道题），用 currentIndex 控制当前显示哪一行
  const [currentIndex, setCurrentIndex] = useState(0);

  // 题目数据变化时（换了一批题），回到第一题
  useEffect(() => {
    setCurrentIndex(0);
  }, [validRows]);

  // 为每一行随机选定一个"要展示的格子"，其余有词的格子作为待猜答案隐藏
  const hiddenCells = useMemo(() => {
    const newHidden = new Map<number, Set<string>>();

    validRows.forEach((row) => {
      const data = (row.metadata as any)?.pos_forms;
      const validKeys = Object.keys(data).filter((key) => data[key]?.word);

      if (validKeys.length > 0) {
        const keyToShow = validKeys[Math.floor(Math.random() * validKeys.length)];
        newHidden.set(row.id, new Set(validKeys.filter((key) => key !== keyToShow)));
      }
    });

    return newHidden;
  }, [validRows]);

  if (validRows.length === 0) return null;

  // 防止 index 越界
  const safeIndex = Math.min(currentIndex, validRows.length - 1);
  const row = validRows[safeIndex];
  const data = (row.metadata as any)?.pos_forms;

  const goTo = (index: number) => {
    const next = Math.max(0, Math.min(validRows.length - 1, index));
    setCurrentIndex(next);
    onIndexChange?.(next);
  };

  return (
    <div className="space-y-3">
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-lg overflow-x-auto">
        <table className="w-full text-center text-slate-300">
          <thead>
            <tr className="bg-slate-900/70 border-b-2 border-slate-600">
              {headers.map((header) => (
                <th
                  key={header}
                  className="p-2 sm:p-4 text-sm sm:text-base font-semibold text-slate-200 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 【需求1】只渲染当前这一行 */}
            <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
              {headers.map((header) => {
                const isHidden = hiddenCells.get(row.id)?.has(header);
                const content = data[header]?.word;
                const meaning = data[header]?.meaning;
                const hasWord = Boolean(content);

                return (
                  <td key={`${row.id}-${header}`} className="p-2 sm:p-4 text-base sm:text-lg">
                    <div
                      className={cn(
                        'transition-opacity duration-500',
                        isHidden && !isAnswerVisible && 'opacity-0'
                      )}
                    >
                      <span
                        className={cn(
                          'block',
                          // 答案揭晓时，给被隐藏的单词加上高亮
                          isAnswerVisible && isHidden && 'text-brand-green-500 font-bold'
                        )}
                      >
                        {/* 【需求2】没有词语的格子：揭晓答案前不显示 "—"，用 nbsp 占位保持高度 */}
                        {hasWord ? content : isAnswerVisible ? '—' : '\u00A0'}
                      </span>

                      {hasWord && meaning && (
                        <p
                          className={cn(
                            'text-xs sm:text-sm text-slate-400 mt-1 transition-opacity duration-300',
                            // 答案揭晓前，含义始终隐藏
                            !isAnswerVisible && 'opacity-0'
                          )}
                        >
                          {meaning}
                        </p>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* 行导航：仅在多于一题时显示 */}
      {validRows.length > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(safeIndex - 1)}
            disabled={safeIndex === 0}
            className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            上一题
          </button>

          <span className="text-sm text-slate-400 tabular-nums">
            {safeIndex + 1} / {validRows.length}
          </span>

          <button
            type="button"
            onClick={() => goTo(safeIndex + 1)}
            disabled={safeIndex === validRows.length - 1}
            className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一题
          </button>
        </div>
      )}
    </div>
  );
}
