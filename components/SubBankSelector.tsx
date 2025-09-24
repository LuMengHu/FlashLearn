// components/SubBankSelector.tsx
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ListCollapse } from 'lucide-react';
import type { QuestionBank, Question } from "@/lib/schema";

interface Props {
  currentBankId: number;
  siblingBanks: (QuestionBank & { questions: Question[] })[];
  onSelectSubBank: (questions: Question[]) => void;
}

export default function SubBankSelector({ currentBankId, siblingBanks, onSelectSubBank }: Props) {
  // 如果没有其他子题库，则不显示按钮
  if (!siblingBanks || siblingBanks.length <= 1) {
    return null;
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* 增大按钮和图标尺寸 */}
        <Button variant="ghost" size="lg">
          <ListCollapse className="h-6 w-6" />
          <span className="sr-only">切换题库</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {siblingBanks.map((bank) => (
          <DropdownMenuItem
            key={bank.id}
            // 点击时调用回调函数
            onSelect={() => onSelectSubBank(bank.questions || [])}
            disabled={bank.id === currentBankId}
            // 增大文字尺寸
            className="text-lg"
          >
            {bank.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
