// components/home/BankCarousel.tsx
'use client';

import { useState, useEffect } from 'react'; // 【修复】添加 useEffect
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow } from 'swiper/modules';
import type { Swiper as SwiperCore, SwiperOptions } from 'swiper/types';
import type { QuestionBank } from '@/lib/schema';
import BankCard from '@/components/home/BankCard';
import { cn } from '@/lib/utils';

import 'swiper/css';
import 'swiper/css/effect-coverflow';

interface Props {
  originalBanks: QuestionBank[];
  displayBanks: QuestionBank[];
  onSwiper: (swiper: SwiperCore) => void;
  onActiveBankChange: (bank: QuestionBank) => void;
  initialSlideIndex: number;
}

const baseCoverflowEffect: SwiperOptions['coverflowEffect'] = {
  rotate: 0,
  stretch: 0,
  depth: 150,
  modifier: 1,
  slideShadows: false,
};

const swiperBreakpoints: SwiperOptions['breakpoints'] = {
  320: { coverflowEffect: { ...baseCoverflowEffect, stretch: -20 } },
  768: { coverflowEffect: { ...baseCoverflowEffect, stretch: -100 } },
};

export default function BankCarousel({ 
  originalBanks, 
  displayBanks, 
  onSwiper, 
  onActiveBankChange,
  initialSlideIndex
}: Props) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperCore | null>(null);
  const originalLength = originalBanks.length;
  const isLoopingEnabled = originalLength > 2;
  
  // 【修复】将 activeRealIndex 的初始值与 initialSlideIndex 同步
  const [activeRealIndex, setActiveRealIndex] = useState(initialSlideIndex);
  
  const initialSlide = isLoopingEnabled 
    ? originalLength + initialSlideIndex 
    : initialSlideIndex;

  const handleSwiper = (swiper: SwiperCore) => {
    setSwiperInstance(swiper);
    onSwiper(swiper);
  };

  const handleSlideChangeEnd = (swiper: SwiperCore) => {
    if (!isLoopingEnabled) return;
    const firstSetEnd = originalLength - 1;
    const thirdSetStart = originalLength * 2;
    if (swiper.activeIndex >= thirdSetStart) {
      swiper.slideTo(swiper.activeIndex - originalLength, 0);
    } else if (swiper.activeIndex <= firstSetEnd) {
      swiper.slideTo(swiper.activeIndex + originalLength, 0);
    }
  };

  const handleSlideChange = (swiper: SwiperCore) => {
    const currentRealIndex = swiper.realIndex % originalLength;
    setActiveRealIndex(currentRealIndex);
    if (originalBanks[currentRealIndex]) {
      onActiveBankChange(originalBanks[currentRealIndex]);
    }
  };

  // 【修复】当 initialSlideIndex 改变时（例如从 session storage 加载），确保 swiper 能跳转
  useEffect(() => {
    if (swiperInstance) {
      const targetSlide = isLoopingEnabled ? originalLength + initialSlideIndex : initialSlideIndex;
      swiperInstance.slideTo(targetSlide, 0); // 0 表示无动画跳转
    }
  }, [initialSlideIndex, swiperInstance, isLoopingEnabled, originalLength]);

  return (
    <div className="relative w-full">
      <Swiper
        onSwiper={handleSwiper}
        onSlideChange={handleSlideChange}
        onSlideChangeTransitionEnd={handleSlideChangeEnd}
        effect={'coverflow'}
        coverflowEffect={baseCoverflowEffect}
        breakpoints={swiperBreakpoints}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        initialSlide={initialSlide}
        modules={[EffectCoverflow]}
        className="!pt-0 !pb-8"
      >
        {displayBanks.map((bank, index) => (
          <SwiperSlide key={`${bank.id}-${index}`} className="!w-64 !h-96 md:!w-80 md:!h-[365px]">
            <BankCard bank={bank} />
            <style jsx global>{`
              .swiper-slide { transition: transform 0.4s ease-in-out, opacity 0.4s ease-in-out; transform: scale(0.85); opacity: 0.4; }
              .swiper-slide-active { transform: scale(1); opacity: 1; }
              .swiper-slide-active .cover-image { opacity: 1 !important; }
            `}</style>
          </SwiperSlide>
        ))}
      </Swiper>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-2 h-8">
        {originalBanks.map((_, index) => (
          <button
            key={index}
            onClick={() => swiperInstance?.slideTo(isLoopingEnabled ? originalLength + index : index)}
            onMouseEnter={() => swiperInstance?.slideTo(isLoopingEnabled ? originalLength + index : index)}
            className={cn("rounded-full transition-all duration-300 md:hidden", activeRealIndex === index ? 'w-5 h-[6px] bg-white' : 'w-[6px] h-[6px] bg-slate-500 hover:bg-slate-300')}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
        <div className="hidden md:flex items-center justify-center space-x-1 bg-slate-800/50 p-1 rounded-full">
           {originalBanks.map((_, index) => (
             <button
               key={index}
               onClick={() => swiperInstance?.slideTo(isLoopingEnabled ? originalLength + index : index)}
               onMouseEnter={() => swiperInstance?.slideTo(isLoopingEnabled ? originalLength + index : index)}
               className={cn("h-6 transition-all duration-200 rounded-full", activeRealIndex === index ? 'w-10 bg-white' : 'w-6 bg-slate-600/70 hover:bg-slate-500')}
               aria-label={`Go to slide ${index + 1}`}
             />
           ))}
        </div>
      </div>
    </div>
  );
}
