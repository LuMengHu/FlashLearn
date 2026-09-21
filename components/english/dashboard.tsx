'use client';
import Link from 'next/link';
import { ArrowRight, BookOpen, Layers3, Play, Puzzle, Repeat2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { scopeItems, stats } from '@/lib/english/learning';
import { useWorkspace } from './workspace-provider';
import { Heading, LoadGate } from './common';

export default function Dashboard() {
  const { data } = useWorkspace();
  const [resume, setResume] = useState(false);
  useEffect(() => { try { const session = JSON.parse(localStorage.getItem('flashlearn.english.session.v1') || 'null'); setResume(!!session?.queue?.length); } catch {} }, []);
  const summary = data ? stats(scopeItems(data), data.memory) : null;
  const unfiled = data ? scopeItems(data, 'all', 'unfiled').length : 0;
  return <><Heading eyebrow="ENGLISH" title="英语学习" description={summary ? `${summary.due} 个待复习 · ${summary.fresh} 个未学` : undefined} />
    <LoadGate>{data && summary && <>
      <div className="en-toolbar"><Link href="/english/study" className="en-button en-primary"><Play size={16} fill="currentColor" />开始复习</Link>{resume && <Link href="/english/study?resume=1" className="en-button">继续上次</Link>}<Link href="/english/new" className="en-button">添加词汇</Link></div>
      <div className="en-mode-grid">{[
        { href: '/english/study?mode=word', icon: BookOpen, title: '单词', count: data.words.filter(word => word.kind === 'word').length },
        { href: '/english/study?mode=phrase', icon: Puzzle, title: '短语', count: data.words.filter(word => word.kind === 'phrase').length },
        { href: '/english/study?mode=confusion', icon: Repeat2, title: '易混词', count: data.confusions.length },
      ].map(({ href, icon: Icon, title, count }) => <Link href={href} className="en-mode-card" key={title}><span className="en-mode-icon"><Icon size={21} /></span><h3>{title}</h3><footer><span>{count} 个</span><ArrowRight size={16} /></footer></Link>)}</div>
      <div className="en-section-head"><h2>词表</h2><Link href="/english/collections">管理全部 →</Link></div>
      <div className="en-panel !p-2">{unfiled > 0 && <div className="en-list-row"><Layers3 size={19} /><Link href="/english/list?collection=unfiled" className="en-grow"><h3>未归类</h3><p>{unfiled} 个词</p></Link><Link href="/english/study?collection=unfiled" className="en-button en-button-small">练习</Link></div>}{data.collections.slice(0, 4).map(collection => <div className="en-list-row" key={collection.id}><Layers3 size={19} /><Link href={`/english/list?collection=${collection.id}`} className="en-grow"><h3>{collection.name}</h3><p>{collection.wordIds.length} 个词</p></Link><Link href={`/english/study?collection=${collection.id}`} className="en-button en-button-small">练习</Link></div>)}{!unfiled && !data.collections.length && <div className="en-empty"><p>还没有词汇。</p><Link href="/english/new" className="en-button en-primary">添加词汇</Link></div>}</div>
    </>}</LoadGate>
  </>;
}
