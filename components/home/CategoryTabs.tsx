// components/home/CategoryTabs.tsx
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string | null;
  onSelectCategory: (category: string) => void;
}

export default function CategoryTabs({ categories, activeCategory, onSelectCategory }: CategoryTabsProps) {
  return (
    // 这个 div 确保所有按钮在同一行内，并且之间有间距。
    // 父组件的 `overflow-x-auto` 会处理滚动。
    <div className="flex items-center space-x-2 md:space-x-3">
      {categories.map((category) => (
        <Button
          key={category}
          onClick={() => onSelectCategory(category)}
          variant="ghost" // 使用 "ghost" 样式，这样我们可以完全自定义背景和颜色
          className={cn(
            // --- 通用样式 ---
            'rounded-full px-5 py-2 text-sm md:text-base font-semibold transition-all duration-300 ease-in-out',
            'whitespace-nowrap',  // 防止按钮内的文字换行
            'flex-shrink-0',      // 【核心修复】防止按钮在 flex 容器中被压缩
            'border-2 border-transparent', // 添加透明边框，以防止激活时发生布局偏移

            // --- 根据是否激活来切换样式 ---
            activeCategory === category
              // 激活状态的样式
              ? 'bg-white text-slate-900 shadow-lg hover:bg-white'
              // 非激活状态的样式
              : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/80 hover:text-white'
          )}
        >
          {category}
        </Button>
      ))}
    </div>
  );
}
