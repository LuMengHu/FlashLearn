// components/home/bank-card.tsx
'use client';

import Image from 'next/image';
import type { QuestionBank } from '@/lib/schema';

interface Props {
  bank: QuestionBank;
}

export default function BankCard({ bank }: Props) {
  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl transition-transform duration-500 ease-in-out">
      <Image
        src={bank.cover_image_url || '/covers/default.png'}
        alt={bank.name}
        fill
        sizes="(max-width: 768px) 100vw, 500vw"
        style={{ objectFit: 'cover' }}
        // 【修改】添加 cover-image 类名，并调整默认透明度
        className="cover-image opacity-60 transition-opacity duration-400"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-6 flex flex-col justify-end text-white">
        <h3 className="text-2xl font-bold">{bank.name}</h3>
        <p className="text-sm text-gray-300 mt-1">{bank.description}</p>
      </div>
    </div>
  );
}

