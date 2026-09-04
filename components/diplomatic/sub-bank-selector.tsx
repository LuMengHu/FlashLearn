// 题库详情页顶部的子题库切换下拉菜单，多于 1 个可选题库时才显示
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ListFilter } from 'lucide-react';
import type { QuestionBank } from '@/lib/schema';

interface Props {
  currentBankId: number;
  parentBankId: number | null; 
  siblingBanks: QuestionBank[]; 
  onSelectSubBank: (bank: QuestionBank) => void; 
}

export default function SubBankSelector({ currentBankId, parentBankId, siblingBanks, onSelectSubBank }: Props) {
  // 可选题库总数小于等于 1 时没有切换的必要，不显示按钮
  if (!siblingBanks || siblingBanks.length <= 1) {
    return null;
  }

  // 下拉菜单里不展示父题库本身，只展示子题库
  const subBanksOnly = parentBankId
    ? siblingBanks.filter(b => b.id !== parentBankId)
    : siblingBanks;

  // 如果过滤后，菜单项为空（例如只有一个父题库，没有子题库），也不显示按钮
  if (subBanksOnly.length === 0) {
      return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
          <ListFilter size={20} />
          <span className="sr-only">选择子题库</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700 text-slate-200">
        {subBanksOnly.map((bank) => (
          <DropdownMenuItem
            key={bank.id}
            disabled={bank.id === currentBankId}
            onSelect={() => onSelectSubBank(bank)}
            className="focus:bg-slate-700 focus:text-white disabled:opacity-50"
          >
            {bank.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
