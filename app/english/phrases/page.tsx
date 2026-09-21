import Library from '@/components/english/library';
import { Suspense } from 'react';
export default function Page() { return <Suspense fallback={<div className="en-loading">Loading...</div>}><Library phrases /></Suspense>; }
