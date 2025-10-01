// components/quiz/VerbForms.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Question } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface Props {
  rows: Question[];
  isAnswerVisible: boolean;
}

export default function VerbFormsTable({ rows, isAnswerVisible }: Props) {
  const [hiddenCells, setHiddenCells] = useState<Map<number, Set<string>>>(new Map());

  useEffect(() => {
    const newHidden = new Map<number, Set<string>>();
    rows.forEach(row => {
      const data = (row.metadata as any)?.verb_forms;
      if (!data) return;

      // 【优化 3】实现“只显现一个”逻辑
      // 1. 找出所有有效的 keys (即有内容的形态)
      const validKeys = Object.keys(data).filter(key => data[key]);

      if (validKeys.length > 0) {
        // 2. 随机挑选一个 key 来显示
        const keyToShow = validKeys[Math.floor(Math.random() * validKeys.length)];
        
        // 3. 将所有不是 keyToShow 的有效 key 都加入隐藏集合
        const keysToHide = new Set(validKeys.filter(key => key !== keyToShow));
        newHidden.set(row.id, keysToHide);
      }
    });
    setHiddenCells(newHidden);
  }, [rows]);

  const headers = ['Present simple', 'Present participle', 'Past simple', 'Past participle', 'Chinese meaning'];

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full text-center text-slate-300">
        <thead>
          <tr className="bg-slate-900/70 border-b-2 border-slate-600">
            {headers.map(header => (
              <th 
                key={header} 
                // 【优化 1】移动端样式调整
                className="p-2 sm:p-4 text-xs sm:text-base font-semibold text-slate-200 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {rows.map((row) => {
            const data = (row.metadata as any)?.verb_forms;
            if (!data) return null;

            return (
              <tr key={row.id} className="hover:bg-slate-800/50 transition-colors">
                {headers.map(header => {
                  const isHidden = hiddenCells.get(row.id)?.has(header);
                  const content = data[header];
                  
                  return (
                    <td 
                      key={`${row.id}-${header}`} 
                      // 【优化 1】移动端样式调整
                      className="p-2 sm:p-4 text-sm sm:text-lg"
                    >
                      <div className={cn(
                        "transition-opacity duration-500",
                        isHidden && !isAnswerVisible && "opacity-0"
                      )}>
                        <span className={cn(isAnswerVisible && isHidden && "text-brand-green-500 font-bold")}>
                          {content || '—'}
                        </span>
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
