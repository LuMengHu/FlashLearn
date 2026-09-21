import Confusions from '@/components/english/confusions';
import { Suspense } from 'react';
export default function Page() { return <Suspense fallback={<div className="en-loading">Loading...</div>}><Confusions /></Suspense>; }
