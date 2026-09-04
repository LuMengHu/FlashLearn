// 选择题/问答卡片共用的深色外壳样式，避免两个卡片组件重复同一串 className
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export default function QuizCardShell({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn('bg-slate-900/50 border-slate-800 text-white shadow-lg', className)}
      {...props}
    />
  );
}
