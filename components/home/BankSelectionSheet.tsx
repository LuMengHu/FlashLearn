// components/home/BankSelectionSheet.tsx
'use client';

import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import type { QuestionBank } from '@/lib/schema';

interface Props {
  banks: QuestionBank[];
}

export default function BankSelectionSheet({ banks }: Props) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* 【解决问题4】增大图标按钮尺寸和图标大小 */}
        <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800 hover:text-white h-10 w-10 sm:h-12 sm:w-12">
          <Menu className="h-10 w-10 sm:h-7 sm:w-7" />
          <span className="sr-only">选择题库</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-slate-900/95 border-slate-800 text-slate-200">
        <SheetHeader>
          <SheetTitle className="text-2xl text-slate-100">所有题库</SheetTitle>
        </SheetHeader>
        <div className="mt-8 flex flex-col space-y-2">
          {banks.map((bank) => (
            <Button
              key={bank.id}
              asChild
              variant="ghost"
              className="justify-start text-lg h-12"
            >
              <Link href={`/bank/${bank.id}`}>{bank.name}</Link>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
