'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { useWorkspace } from './workspace-provider';
import { Empty, Heading, LoadGate } from './common';

export default function Confusions() {
  const { data } = useWorkspace();
  const [query, setQuery] = useState('');
  const pairs = (data?.confusions || []).filter(pair => {
    const original = data?.words.find(word => word.id === pair.wordId);
    return `${original?.word || ''} ${pair.otherWord} ${original?.meaning || ''} ${pair.otherMeaning}`
      .toLowerCase().includes(query.trim().toLowerCase());
  });
  return <><Heading eyebrow="CONFUSABLE WORDS" title="易混词" description={data ? `词库已有 ${data.confusions.length} 组辨析，直接学习。` : ''}
    action={data?.confusions.length ? <Link href="/english/study?mode=confusion" className="en-button en-primary">开始练习<ArrowRight size={16} /></Link> : undefined} />
    <LoadGate>{data && <>
      <div className="en-search en-toolbar"><Search size={17} className="en-search-icon" /><input className="en-input" aria-label="搜索易混词" placeholder="搜索易混词" value={query} onChange={event => setQuery(event.target.value)} /></div>
      {pairs.length ? <div className="en-deck-grid">{pairs.map(pair => {
        const original = data.words.find(word => word.id === pair.wordId);
        return <article className="en-panel" key={pair.id}>
          <div className="en-pair-terms"><span>{original?.word}</span><span className="text-[#9bab98] text-base">/</span><span>{pair.otherWord}</span></div>
          <p><strong>{original?.word}</strong>：{original?.meaning}</p>
          <p><strong>{pair.otherWord}</strong>：{pair.otherMeaning}</p>
          {pair.tip && <p className="en-notice">{pair.tip}</p>}
        </article>;
      })}</div> : <Empty title={query ? '没有匹配的词。' : '暂无易混资料。'} text={query ? '试试另一种拼写。' : '后台词库提供易混词后，会自动出现在这里。'} href="/english/collections" label="查看词表" />}
    </>}</LoadGate>
  </>;
}
