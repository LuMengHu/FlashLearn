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

const HomePageLoader = () => {
  const loadingMessages = [ "正在连接神经元网络...", "编译知识矩阵...", "解密数据流...", "启动学习协议...", "校准记忆回路...", "正在从知识库中提取数据..." ];
  const [message, setMessage] = useState('');
  const [dots, setDots] = useState('');
  useEffect(() => { setMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]); }, []);
  useEffect(() => { const interval = setInterval(() => { setDots(prev => (prev.length >= 3 ? '' : prev + '.')); }, 400); return () => clearInterval(interval); }, []);
  return (
    <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">
      <div className="text-center font-mono">
        <p className="text-xl md:text-2xl text-cyan-300 animate-pulse">{message}{dots}</p>
      </div>
    </div>
  );
};

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
  const [isLoading, setIsLoading] = useState(true);
  const swiperRef = useRef<SwiperCore | null>(null);
  const initialSlideIndex = useRef<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const fetchedBanks = await getBanks();
        const topLevelBanks = fetchedBanks.filter(bank => !bank.parentId);
        const uniqueCategories = [...new Set(topLevelBanks.map(b => b.category || '未分类'))];
        
        setOriginalBanks(fetchedBanks);
        setCategories(uniqueCategories);
        
        const lastBankId = sessionStorage.getItem('lastParentBankId');
        const lastBankCategory = sessionStorage.getItem('lastParentBankCategory');
        
        let targetCategory = uniqueCategories[0] || null;

        if (lastBankCategory && uniqueCategories.includes(lastBankCategory)) {
          targetCategory = lastBankCategory;
        }
        
        if (lastBankId && targetCategory) {
            const banksInTargetCategory = topLevelBanks.filter(b => (b.category || '未分类') === targetCategory);
            const targetIndex = banksInTargetCategory.findIndex(b => b.id === parseInt(lastBankId, 10));
            if (targetIndex !== -1) {
                initialSlideIndex.current = targetIndex;
            }
        }
        
        setActiveCategory(targetCategory);
      } catch (error) { 
        console.error("数据加载失败:", error); 
      } finally {
        setIsLoading(false);
        sessionStorage.removeItem('lastParentBankId');
        sessionStorage.removeItem('lastParentBankCategory');
      }
    }
    loadData();
  }, []);
  
  useEffect(() => {
    if (activeCategory && originalBanks.length > 0) {
      const filtered = originalBanks.filter(bank => !bank.parentId && (bank.category || '未分类') === activeCategory);
      setFilteredBanks(filtered);
      
      const activeIndex = initialSlideIndex.current < filtered.length ? initialSlideIndex.current : 0;
      setActiveBank(filtered[activeIndex] || null);

      if (filtered.length > 2) {
        setDisplayBanks([...filtered, ...filtered, ...filtered]);
      } else {
        setDisplayBanks(filtered);
      }
      
      const targetSlide = filtered.length > 2 ? filtered.length + activeIndex : activeIndex;
      swiperRef.current?.slideTo(targetSlide, 0);
    }
  }, [activeCategory, originalBanks]);

  const handleSelectCategory = (category: string) => {
    initialSlideIndex.current = 0;
    setActiveCategory(category);
  };
  
  const handleActiveBankChange = (bank: QuestionBank) => {
    setActiveBank(bank);
  };
  
  if (isLoading) {
    return <HomePageLoader />;
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
              key={activeCategory}
              originalBanks={filteredBanks}
              displayBanks={displayBanks}
              onSwiper={(swiper) => { swiperRef.current = swiper; }}
              onActiveBankChange={handleActiveBankChange}
              initialSlideIndex={initialSlideIndex.current}
            />
          </div>
          
          {activeBank && activeBank.id && (
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
