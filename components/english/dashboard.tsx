'use client';
import Link from 'next/link';
import { ArrowRight, Layers3, Play, Repeat2, Puzzle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { scopeItems, stats } from '@/lib/english/learning';
import { useWorkspace } from './workspace-provider';
import { Heading, LoadGate } from './common';

export default function Dashboard() {
  const { data } = useWorkspace();
  const [resume, setResume] = useState<{ mode: string; collection?: string } | null>(null);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem('flashlearn.english.session.v3') || 'null'); setResume(saved?.queue?.length ? { mode: saved.mode === 'phrase' ? 'phrase' : 'confusion', collection: saved.collection || '' } : null); }
    catch {}
  }, []);
  const kinds = [
    { mode: 'confusion' as const, title: '易混词', icon: Repeat2, manage: '/english/confusions' },
    { mode: 'phrase' as const, title: '短语', icon: Puzzle, manage: '/english/phrases' },
  ];
  return <>
    <Heading eyebrow="ENGLISH" title="英语词汇" description="看英文，想中文；按到期时间复习。" />
    <LoadGate>{data && <>
      {resume && <Link className="en-button en-resume" href={'/english/study?mode=' + resume.mode + (resume.collection ? '&collection=' + resume.collection : '') + '&resume=1'}><Play size={16} />继续上次练习<ArrowRight size={16} /></Link>}
      <div className="en-home-grid">{kinds.map(({ mode, title, icon: Icon, manage }) => {
        const summary = stats(scopeItems(data, mode), data.memory);
        return <section className="en-home-card" key={mode}>
          <div className="en-home-card-head"><Icon size={22} /><Link href={manage}>查看全部 <ArrowRight size={15} /></Link></div>
          <h2>{title}</h2>
          <div className="en-home-numbers"><div><strong>{summary.due}</strong><span>待复习</span></div><div><strong>{summary.fresh}</strong><span>没学过</span></div></div>
          <div className="en-home-actions">
            <Link className="en-button en-primary" href={'/english/study?mode=' + mode + '&focus=review&autostart=1'}>复习到期</Link>
            <Link className="en-button" href={'/english/study?mode=' + mode + '&focus=learn&autostart=1'}>学习新词</Link>
          </div>
        </section>;
      })}</div>
      <div className="en-section-head"><h2>词表</h2><Link href="/english/collections">管理词表 <ArrowRight size={15} /></Link></div>
      <div className="en-panel en-home-lists">{data.collections.filter(item => item.kind !== 'word').map(collection => {
        const summary = stats(scopeItems(data, collection.kind, String(collection.id)), data.memory);
        const href = collection.kind === 'phrase' ? '/english/phrases?collection=' + collection.id : '/english/confusions?collection=' + collection.id;
        return <div className="en-list-row" key={collection.id}><Layers3 size={18} /><Link href={href} className="en-grow"><h3>{collection.name}</h3><p>{summary.total} 项 · {summary.due} 项到期</p></Link>
          <Link className="en-button en-button-small" href={'/english/study?mode=' + collection.kind + '&collection=' + collection.id}>练习</Link></div>;
      })}</div>
    </>}</LoadGate>
  </>;
}
