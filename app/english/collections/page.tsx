import Collections from '@/components/english/collections';
import { Suspense } from 'react';

export default function Page() {
  return <Suspense fallback={<div className="en-loading">正在打开词表…</div>}><Collections /></Suspense>;
}