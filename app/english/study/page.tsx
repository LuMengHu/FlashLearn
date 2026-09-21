import StudyWorkspace from '@/components/english/study-workspace';
import { Suspense } from 'react';
export default function Page() { return <Suspense fallback={<div className="en-loading">Loading...</div>}><StudyWorkspace /></Suspense>; }
