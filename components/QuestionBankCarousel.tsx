// components/QuestionBankCarousel.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination } from 'swiper/modules';
import type { Swiper as SwiperCore } from 'swiper';
import type { QuestionBank } from '@/lib/schema';

import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

interface Props {
  originalBanks: QuestionBank[];
  displayBanks: QuestionBank[];
}

export default function QuestionBankCarousel({ originalBanks, displayBanks }: Props) {
  const originalLength = originalBanks.length;
  const swiperRef = React.useRef<SwiperCore | null>(null);

  const isLooping = originalLength > 1;

  const handleSlideChange = (swiper: SwiperCore) => {
    if (!isLooping) return;
    const secondSetStart = originalLength;
    const thirdSetStart = originalLength * 2;

    if (swiper.realIndex >= thirdSetStart) {
      swiper.slideTo(swiper.realIndex - originalLength, 0);
    } 
    else if (swiper.realIndex < secondSetStart) {
      swiper.slideTo(swiper.realIndex + originalLength, 0);
    }
  };

  return (
    <div className="w-full">
      <Swiper
        onSwiper={(swiper) => { swiperRef.current = swiper; }}
        onSlideChangeTransitionEnd={handleSlideChange}
        effect={'coverflow'}
        grabCursor={true}
        centeredSlides={true}
        slidesPerView={'auto'}
        initialSlide={isLooping ? originalLength : 0}
        coverflowEffect={{
          rotate: 50,
          stretch: 0,
          depth: 100,
          modifier: 1,
          slideShadows: false,
        }}
        pagination={{ clickable: true, dynamicBullets: true, }}
        modules={[EffectCoverflow, Pagination]}
        className="w-full pt-12 pb-12"
      >
        {displayBanks.map((bank, index) => (
          <SwiperSlide key={`${bank.id}-${index}`} className="!w-96 !h-96">
            <Link href={`/bank/${bank.id}`} className="block w-full h-full group">
              <div className="relative w-full h-full bg-gray-800 rounded-xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-105">
                <Image
                  src={bank.cover_image_url || '/covers/default.png'}
                  alt={bank.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="opacity-30 group-hover:opacity-50 transition-opacity"
                  priority={index >= originalLength && index < originalLength * 2}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white text-center z-10">
                  <h3 className="text-3xl font-bold mb-4">{bank.name}</h3>
                  <p className="text-gray-200">{bank.description}</p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
      
      {/* 【关键】确保这部分代码存在，这就是我们的箭头按钮 */}
      {isLooping && (
        <>
          <button onClick={() => swiperRef.current?.slidePrev()} className="swiper-button-prev"></button>
          <button onClick={() => swiperRef.current?.slideNext()} className="swiper-button-next"></button>
        </>
      )}
    </div>
  );
}
