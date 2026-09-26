import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Heading } from '@/components/english/common';
export default function ConnectPage() {
  return <><Heading eyebrow="WECHAT" title="微信小复习" description="与网站共用同一份进度。" />
    <div className="en-panel max-w-2xl"><MessageCircle size={28} className="text-[#557748] mb-4" />
      <p>向电脑上的 OpenClaw 发送 <strong>/vocab 易混 5</strong> 或 <strong>/vocab 短语 5</strong>，开始一小轮。</p>
      <p className="en-notice">发送 /vocab 答案 揭晓中文；/vocab 1 表示不认识，/vocab 2 表示认识。发送 /vocab 词表 可查看两类词表。</p>
      <Link href="/english" className="en-button en-primary">返回学习首页<ArrowRight size={16} /></Link>
    </div></>;
}
