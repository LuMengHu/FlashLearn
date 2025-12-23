// components/quiz/Pos.tsx
'use client';

import { useMemo } from 'react'; // 【核心修复】导入 useMemo，不再需要 useState 和 useEffect
import type { Question } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface Props {
  rows: Question[];
  isAnswerVisible: boolean;
}

export default function PosTable({ rows, isAnswerVisible }: Props) {
  
  // 【核心修复】使用 useMemo 在渲染期间同步计算，而不是在渲染后用 useEffect
  const { hiddenCells, shownCells } = useMemo(() => {
    const newHidden = new Map<number, Set<string>>();
    const newShown = new Map<number, string>();

    rows.forEach(row => {
      const data = (row.metadata as any)?.pos_forms;
      if (!data) return;

      const validKeys = Object.keys(data).filter(key => data[key]?.word);

      if (validKeys.length > 0) {
        // 随机选择一个要显示的单元格
        const keyToShow = validKeys[Math.floor(Math.random() * validKeys.length)];
        const keysToHide = new Set(validKeys.filter(key => key !== keyToShow));
        
        newHidden.set(row.id, keysToHide);
        newShown.set(row.id, keyToShow);
      }
    });

    return { hiddenCells: newHidden, shownCells: newShown };
  }, [rows]); // 依赖项是 rows，当题目切换时会重新计算

  const headers = ['N.', 'V.', 'ADJ.', 'ADV.'];

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full text-center text-slate-300">
        <thead>
          <tr className="bg-slate-900/70 border-b-2 border-slate-600">
            {headers.map(header => (
              <th key={header} className="p-2 sm:p-4 text-sm sm:text-base font-semibold text-slate-200 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rows.map((row) => {
            const data = (row.metadata as any)?.pos_forms;
            if (!data) return null;

            return (
              <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                {headers.map(header => {
                  const isHidden = hiddenCells.get(row.id)?.has(header);
                  const content = data[header]?.word;
                  const meaning = data[header]?.meaning;
                  
                  return (
                    <td key={`${row.id}-${header}`} className="p-2 sm:p-4 text-base sm:text-lg">
                      {/* 【核心修复】现在，该隐藏的单元格在初始渲染时就会有 opacity-0 */}
                      <div className={cn(
                        "transition-opacity duration-500",
                        isHidden && !isAnswerVisible && "opacity-0"
                      )}>
                        <span className={cn(
                          "block",
                          // 当答案显示时，给被隐藏的单词加上高亮
                          isAnswerVisible && isHidden && "text-brand-green-500 font-bold"
                        )}>
                          {content || '—'}
                        </span>
                        {meaning && (
                          <p className={cn(
                            "text-xs sm:text-sm text-slate-400 mt-1 transition-opacity duration-300",
                            // 无论如何，在答案显示前，含义都是隐藏的
                            !isAnswerVisible && "opacity-0"
                          )}>
                            {meaning || '\u00A0'}
                          </p>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
