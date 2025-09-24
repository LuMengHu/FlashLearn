// app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import BankCarousel from '@/components/home/BankCarousel';
import BankSelectionSheet from '@/components/home/BankSelectionSheet';
import CategoryTabs from '@/components/home/CategoryTabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { QuestionBank } from '@/lib/schema';
import type { Swiper as SwiperCore } from 'swiper/types';

async function getBanks(): Promise<QuestionBank[]> {
  const res = await fetch('/api/banks');
  if (!res.ok) { throw new Error('Failed to fetch banks'); }
  return res.json();
}

export default function HomePage() {
  const [originalBanks, setOriginalBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [displayBanks, setDisplayBanks] = useState<QuestionBank[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeBank, setActiveBank] = useState<QuestionBank | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const swiperRef = useRef<SwiperCore | null>(null);

  // 【修改】这个 useEffect 现在只负责在分类变化时更新轮播内容
  useEffect(() => {
    if (originalBanks.length > 0 && activeCategory) {
      const filtered = originalBanks.filter(bank => (bank.category || '未分类') === activeCategory);
      setFilteredBanks(filtered);

      if (filtered.length > 0) {
        // 如果有筛选结果，立即更新 activeBank 为第一个
        setActiveBank(filtered[0]);
      }

      if (filtered.length > 2) {
        setDisplayBanks([...filtered, ...filtered, ...filtered]);
      } else {
        setDisplayBanks(filtered);
      }
    }
  }, [originalBanks, activeCategory]);

 useEffect(() => {
    async function loadData() {
      try {
        const fetchedBanks = await getBanks();
        const topLevelBanks = fetchedBanks.filter(bank => !bank.parentId);
        const uniqueCategories = [...new Set(topLevelBanks.map(b => b.category || '未分类'))];
        
        setOriginalBanks(fetchedBanks);
        setCategories(uniqueCategories);

        if (topLevelBanks.length > 0) {
          const initialCategory = topLevelBanks[0].category || '未分类';
          setActiveCategory(initialCategory); // 这将触发上面的 useEffect 来设置初始的 filteredBanks 和 activeBank
        }
      } catch (error) { console.error("数据加载失败:", error); }
    }
    loadData();
  }, []);

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
    // 切换后，自动将轮播重置到第一个
    swiperRef.current?.slideTo(filteredBanks.length > 2 ? filteredBanks.length : 0, 0);
  };
  
  const handleActiveBankChange = (bank: QuestionBank) => {
    // 这个函数现在只在用户手动滑动时起作用
    setActiveBank(bank);
  };

  if (originalBanks.length === 0) {
    return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">加载中...</div>;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      <header className="absolute top-0 left-0 z-20 p-4">
        <BankSelectionSheet banks={originalBanks} />
      </header>
      
      <main className="w-full flex-grow flex flex-col">
        <div 
          className="w-full h-48 md:h-45 bg-cover bg-center relative"
          style={{ backgroundImage: "url('/home/home.png')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/70 to-transparent"></div>
          <div className="absolute bottom-12 left-0 right-0 text-center px-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-white">FlashLearn</h1>
            <p className="text-lg text-gray-300 mt-2">选择一个题库，开始你的学习之旅</p>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-8 relative z-10">
          <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
            <CategoryTabs categories={categories} onSelectCategory={handleSelectCategory} activeCategory={activeCategory} />
          </div>
          
          <div className="mt-8">
            <BankCarousel 
              originalBanks={filteredBanks}
              displayBanks={displayBanks}
              onSwiper={(swiper) => { swiperRef.current = swiper; }}
              onActiveBankChange={handleActiveBankChange}
            />
          </div>
          
          {activeBank && (
            <div className="w-full flex justify-center mt-8">
              <Button asChild size="lg" className="bg-white text-black hover:bg-gray-200 rounded-xl px-8 h-12 text-lg font-bold shadow-2xl">
                <Link href={`/bank/${activeBank.id}`}>开始学习: {activeBank.name}</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
