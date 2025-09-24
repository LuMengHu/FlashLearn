// components/home/CategoryTabs.tsx
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  categories: string[];
  onSelectCategory: (category: string) => void;
  // 【新】接收当前激活的分类
  activeCategory: string | null;
}

export default function CategoryTabs({ categories, onSelectCategory, activeCategory }: Props) {
  return (
    // 【修改】调整背景和圆角，使其更精致
    <div className="flex justify-center space-x-1 p-1 bg-slate-800/60 rounded-xl my-0">
      {categories.map((category) => (
        <Button
          key={category}
          onClick={() => onSelectCategory(category)}
          variant="ghost"
          // 【修改】使用 cn 函数动态添加激活状态的样式
          className={cn(
            "rounded-lg px-6 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-all duration-200",
            activeCategory === category 
              ? "bg-slate-700/90 text-cyan-400" // 激活时背景更深，文字为蓝色
              : ""
          )}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
