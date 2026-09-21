'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Layers3, Pencil, Plus, Trash2 } from 'lucide-react';
import { scopeItems, stats } from '@/lib/english/learning';
import { requestJson, useWorkspace } from './workspace-provider';
import { Dialog, Empty, ErrorMessage, Field, Heading, LoadGate } from './common';

export default function Collections() {
  const { data, refresh } = useWorkspace();
  const [editing, setEditing] = useState<{ id?: number; name: string } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function save() {
    if (!editing || busy) return;
    setBusy(true); setError('');
    try { await requestJson('/api/english/workspace', { action: editing.id ? 'renameCollection' : 'collection', ...editing }); await refresh(); setEditing(null); }
    catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (!confirm('删除这份词表？其中的词和学习记录会保留。')) return;
    try { await requestJson('/api/english/workspace', { action: 'deleteCollection', id }); await refresh(); }
    catch (cause) { setError((cause as Error).message); }
  }
  const unfiled = data ? scopeItems(data, 'all', 'unfiled') : [];
  return <><Heading eyebrow="WORD LISTS" title="词表" description={data ? `${data.collections.length} 份词表 · ${unfiled.length} 个未归类` : undefined}
    action={<button className="en-button" onClick={() => setEditing({ name: '' })}><Plus size={17} />新建词表</button>} />
    <ErrorMessage message={!editing ? error : ''} />
    <LoadGate>{data && <>
      <div className="en-list-tabs"><Link href="/english/list">查看全部词汇</Link></div>
      {data.words.length === 0 ? <Empty title="还没有词汇。" text="添加第一批词就能开始。" /> : <div className="en-deck-grid">
        {unfiled.length > 0 && <section className="en-panel en-deck"><div className="en-deck-top"><Layers3 size={23} /></div><h2>未归类</h2><p className="en-muted">{unfiled.length} 个词汇</p><div className="en-deck-footer"><Link href="/english/list?collection=unfiled" className="en-button en-primary">整理词汇<ArrowRight size={15} /></Link><Link href="/english/study?collection=unfiled" className="en-button">练习</Link></div></section>}
        {data.collections.map(collection => {
          const summary = stats(scopeItems(data, 'all', String(collection.id)), data.memory);
          return <section className="en-panel en-deck" key={collection.id}><div className="en-deck-top"><Layers3 size={23} /><div><button className="en-icon-button" aria-label={`重命名${collection.name}`} onClick={() => setEditing({ id: collection.id, name: collection.name })}><Pencil size={15} /></button><button className="en-icon-button" aria-label={`删除${collection.name}`} onClick={() => remove(collection.id)}><Trash2 size={15} /></button></div></div><h2>{collection.name}</h2><p className="en-muted">{summary.total} 个词 · {summary.due} 个待复习</p><div className="en-deck-footer"><Link href={`/english/list?collection=${collection.id}`} className="en-button en-primary">管理词汇<ArrowRight size={15} /></Link><Link href={`/english/study?collection=${collection.id}`} className="en-button">练习</Link></div></section>;
        })}
      </div>}
    </>}</LoadGate>
    {editing && <Dialog title={editing.id ? '重命名词表' : '新建词表'} onClose={() => !busy && setEditing(null)}><form onSubmit={event => { event.preventDefault(); save(); }}><Field label="词表名称"><input className="en-input" autoFocus required maxLength={100} placeholder="例如：Reading 1" value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field><ErrorMessage message={error} /><div className="en-actions"><button className="en-button en-primary" disabled={busy}>{busy ? '保存中…' : '保存'}</button></div></form></Dialog>}
  </>;
}
