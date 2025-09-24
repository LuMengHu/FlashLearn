// components/home/BankCarousel.tsx
'use client';

import { useState } from 'react';
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
}

// 基础Coverflow效果配置
const baseCoverflowEffect: SwiperOptions['coverflowEffect'] = {
  rotate: 0,
  stretch: 0, // 【修改】基础stretch设为0，让卡片默认不重叠
  depth: 150,
  modifier: 1,
  slideShadows: false,
};

// Swiper响应式断点配置
const swiperBreakpoints: SwiperOptions['breakpoints'] = {
  // 基础（移动端）设置
  320: {
    coverflowEffect: {
      ...baseCoverflowEffect,
      stretch: -20, // 移动端保持轻微重叠
    },
  },
  // 当屏幕宽度大于等于768px (桌面端)
  768: {
    coverflowEffect: {
      ...baseCoverflowEffect,
      // 【解决问题2】大幅增加 stretch 值，强制拉开卡片间距
      stretch: -100, 
    },
  },
};

export default function BankCarousel({ originalBanks, displayBanks, onSwiper, onActiveBankChange }: Props) {
  const [swiperInstance, setSwiperInstance] = useState<SwiperCore | null>(null);
  const originalLength = originalBanks.length;
  const isLoopingEnabled = originalLength > 2;
  const [activeRealIndex, setActiveRealIndex] = useState(0);

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
        initialSlide={isLoopingEnabled ? originalLength : 0}
        modules={[EffectCoverflow]}
        className="!pt-0 !pb-8"
      >
        {displayBanks.map((bank, index) => (
          <SwiperSlide key={`${bank.id}-${index}`} className="!w-64 !h-96 md:!w-80 md:!h-[365px]">
            <BankCard bank={bank} />
            {/* 【解决问题1】CSS规则对移动端和桌面端同时生效 */}
            <style jsx global>{`
              .swiper-slide {
                transition: transform 0.4s ease-in-out, opacity 0.4s ease-in-out;
                transform: scale(0.85);
                opacity: 0.4;
              }
              .swiper-slide-active {
                transform: scale(1);
                opacity: 1;
              }
              .swiper-slide-active .cover-image {
                opacity: 1 !important;
              }
            `}</style>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 分页器 */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-2 h-8">
        {originalBanks.map((_, index) => (
          <button
            key={index}
            onClick={() => swiperInstance?.slideTo(originalLength + index)}
            onMouseEnter={() => swiperInstance?.slideTo(originalLength + index)}
            className={cn(
              "rounded-full transition-all duration-300 md:hidden",
              activeRealIndex === index ? 'w-5 h-[6px] bg-white' : 'w-[6px] h-[6px] bg-slate-500 hover:bg-slate-300'
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
        <div className="hidden md:flex items-center justify-center space-x-1 bg-slate-800/50 p-1 rounded-full">
           {originalBanks.map((_, index) => (
             <button
               key={index}
               onClick={() => swiperInstance?.slideTo(originalLength + index)}
               onMouseEnter={() => swiperInstance?.slideTo(originalLength + index)}
               className={cn(
                 "h-6 transition-all duration-200 rounded-full",
                 activeRealIndex === index ? 'w-10 bg-white' : 'w-6 bg-slate-600/70 hover:bg-slate-500'
               )}
               aria-label={`Go to slide ${index + 1}`}
             />
           ))}
        </div>
      </div>
    </div>
  );
}
