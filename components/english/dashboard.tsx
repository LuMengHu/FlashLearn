'use client';
import Link from 'next/link';
import { ArrowRight, BookOpen, Layers3, Play, Puzzle, Repeat2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { scopeItems, stats } from '@/lib/english/learning';
import type { CollectionKind } from '@/lib/english/types';
import { useWorkspace } from './workspace-provider';
import { Heading, labelForKind, LoadGate } from './common';

export default function Dashboard() {
  const { data } = useWorkspace();
  const [resume, setResume] = useState(false);
  useEffect(() => {
    try {
      const session = JSON.parse(localStorage.getItem('flashlearn.english.session.v1') || 'null');
      setResume(!!session?.queue?.length);
    } catch {}
  }, []);

  const modes = data ? [
    { kind: 'word' as const, href: '/english/study?mode=word', icon: BookOpen, title: '单词', items: scopeItems(data, 'word') },
    { kind: 'confusion' as const, href: '/english/study?mode=confusion', icon: Repeat2, title: '易混词', items: scopeItems(data, 'confusion') },
    { kind: 'phrase' as const, href: '/english/study?mode=phrase', icon: Puzzle, title: '短语', items: scopeItems(data, 'phrase') },
  ] : [];
  const summaries = data ? modes.map(mode => stats(mode.items, data.memory)) : [];
  const due = summaries.reduce((total, summary) => total + summary.due, 0);
  const fresh = summaries.reduce((total, summary) => total + summary.fresh, 0);

  const manageHref = (kind: CollectionKind, id: number) => kind === 'confusion'
    ? `/english/confusions?collection=${id}`
    : `/english/list?collection=${id}`;

  return <>
    <Heading eyebrow="ENGLISH" title="英语学习" description={data ? `${due} 项到期复习 · ${fresh} 项没学过` : undefined} />
    <LoadGate>{data && <>
      <div className="en-toolbar"><Link href="/english/study?mode=word" className="en-button en-primary"><Play size={16} fill="currentColor" />开始复习</Link>{resume && <Link href="/english/study?resume=1" className="en-button">继续上次</Link>}<Link href="/english/new" className="en-button">添加词汇</Link></div>
      <div className="en-mode-grid">{modes.map(({ href, icon: Icon, title, items }) => <Link href={href} className="en-mode-card" key={title}><span className="en-mode-icon"><Icon size={21} /></span><h3>{title}</h3><footer><span>{items.length} 项</span><ArrowRight size={16} /></footer></Link>)}</div>
      <div className="en-section-head"><h2>词表</h2><Link href="/english/collections">管理全部 →</Link></div>
      <div className="en-panel !p-2">{data.collections.slice(0, 6).map(collection => <div className="en-list-row" key={collection.id}><Layers3 size={19} /><Link href={manageHref(collection.kind, collection.id)} className="en-grow"><h3>{collection.name}</h3><p>{labelForKind[collection.kind]} · {collection.wordIds.length} 项</p></Link><Link href={`/english/study?mode=${collection.kind}&collection=${collection.id}`} className="en-button en-button-small">练习</Link></div>)}{!data.collections.length && <div className="en-empty"><p>还没有词表。</p><Link href="/english/collections" className="en-button en-primary">建立词表</Link></div>}</div>
    </>}</LoadGate>
  </>;
}