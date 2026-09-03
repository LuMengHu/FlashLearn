// 动词变形表格模式：随机隐藏每行的一个动词形态格子，答案揭晓后高亮显示
'use client';

import { useState, useEffect } from 'react';
import type { Question } from '@/lib/schema';
import { cn, pickHiddenKeys } from '@/lib/utils';

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
      newHidden.set(row.id, pickHiddenKeys(data, (value) => Boolean(value)));
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
