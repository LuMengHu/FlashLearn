'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Layers3, Pencil, Plus, Trash2 } from 'lucide-react';
import { scopeItems, stats } from '@/lib/english/learning';
import type { CollectionKind } from '@/lib/english/types';
import { requestJson, useWorkspace } from './workspace-provider';
import { Dialog, Empty, ErrorMessage, Field, Heading, labelForKind, LoadGate } from './common';

const KINDS: { value: CollectionKind; label: string }[] = [
  { value: 'confusion', label: '易混词词表' },
  { value: 'phrase', label: '短语词表' },
];

export default function Collections() {
  const { data, refresh } = useWorkspace();
  const params = useSearchParams();
  const rawKind = params.get('kind');
  const kind = (['confusion', 'phrase'].includes(rawKind || '') ? rawKind : 'confusion') as CollectionKind;
  const [editing, setEditing] = useState<{ id?: number; name: string; kind: CollectionKind } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!editing || busy) return;
    setBusy(true);
    setError('');
    try {
      await requestJson('/api/english/workspace', { action: editing.id ? 'renameCollection' : 'collection', ...editing });
      await refresh();
      setEditing(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('删除这份词表？其中的词和学习记录会保留。')) return;
    try {
      await requestJson('/api/english/workspace', { action: 'deleteCollection', id });
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  const collections = data?.collections.filter(item => item.kind === kind) ?? [];
  const unfiled = data ? scopeItems(data, kind, 'unfiled') : [];
  const manageHref = (id: number | 'unfiled') => kind === 'confusion'
    ? `/english/confusions?collection=${id}`
    : `/english/phrases?collection=${id}`;

  return <>
    <Heading
      eyebrow="WORD LISTS"
      title="词表"
      description={data ? `${collections.length} 份${labelForKind[kind]}词表 · ${unfiled.length} 项未归类` : undefined}
      action={<button className="en-button" onClick={() => setEditing({ name: '', kind })}><Plus size={17} />新建{labelForKind[kind]}词表</button>}
    />
    <div className="en-list-tabs" aria-label="词表类别">
      {KINDS.map(option => <Link key={option.value} href={`/english/collections?kind=${option.value}`} className={kind === option.value ? 'active' : ''}>{option.label}</Link>)}
    </div>
    <ErrorMessage message={!editing ? error : ''} />
    <LoadGate>{data && <>
      {(unfiled.length > 0 || collections.length > 0) ? <div className="en-deck-grid">
        {unfiled.length > 0 && <section className="en-panel en-deck">
          <div className="en-deck-top"><Layers3 size={23} /></div>
          <h2>未归类{labelForKind[kind]}</h2>
          <p className="en-muted">{unfiled.length} 项</p>
          <div className="en-deck-footer">
            <Link href={manageHref('unfiled')} className="en-button en-primary">查看内容<ArrowRight size={15} /></Link>
            <Link href={`/english/study?mode=${kind}&collection=unfiled`} className="en-button">练习</Link>
          </div>
        </section>}
        {collections.map(collection => {
          const summary = stats(scopeItems(data, kind, String(collection.id)), data.memory);
          return <section className="en-panel en-deck" key={collection.id}>
            <div className="en-deck-top"><Layers3 size={23} /><div><button className="en-icon-button" aria-label={`重命名${collection.name}`} onClick={() => setEditing({ id: collection.id, name: collection.name, kind: collection.kind })}><Pencil size={15} /></button><button className="en-icon-button" aria-label={`删除${collection.name}`} onClick={() => remove(collection.id)}><Trash2 size={15} /></button></div></div>
            <span className="en-tag">{labelForKind[collection.kind]}</span>
            <h2>{collection.name}</h2>
            <p className="en-muted">{summary.total} 项 · {summary.due} 项到期复习</p>
            <div className="en-deck-footer">
              <Link href={manageHref(collection.id)} className="en-button en-primary">查看内容<ArrowRight size={15} /></Link>
              <Link href={`/english/study?mode=${collection.kind}&collection=${collection.id}`} className="en-button">练习</Link>
            </div>
          </section>;
        })}
      </div> : <Empty title={`还没有${labelForKind[kind]}词表。`} text="可以新建词表，或从已有内容选择一批来练习。" href={kind === 'confusion' ? '/english/confusions' : '/english/new'} label={kind === 'confusion' ? '查看易混词' : '添加内容'} />}
    </>}</LoadGate>
    {editing && <Dialog title={editing.id ? '重命名词表' : `新建${labelForKind[editing.kind]}词表`} onClose={() => !busy && setEditing(null)}>
      <form onSubmit={event => { event.preventDefault(); save(); }}>
        <p className="en-notice">类别：{labelForKind[editing.kind]}。练习时只会出现在对应入口。</p>
        <Field label="词表名称"><input className="en-input" autoFocus required maxLength={100} placeholder="例如：Reading 1" value={editing.name} onChange={event => setEditing({ ...editing, name: event.target.value })} /></Field>
        <ErrorMessage message={error} />
        <div className="en-actions"><button className="en-button en-primary" disabled={busy}>{busy ? '保存中…' : '保存'}</button></div>
      </form>
    </Dialog>}
  </>;
}
