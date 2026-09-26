'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Search, Volume2, Pencil } from 'lucide-react';
import { confusionGroups, visibleNote } from '@/lib/english/learning';
import type { Vocabulary } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { Dialog, ErrorMessage, Field, Heading, LoadGate } from './common';
import ChoiceSelect from './choice-select';
import SpeakableText from './speakable-text';

export default function Confusions() {
  const { data, refresh } = useWorkspace();
  const { speak } = useSpeech();
  const params = useSearchParams();
  const collectionId = params.get('collection') || '';
  const collection = data?.collections.find(item => String(item.id) === collectionId && item.kind === 'confusion');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [addTo, setAddTo] = useState('');
  const [editing, setEditing] = useState<Vocabulary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const groups = useMemo(() => {
    if (!data) return [];
    return confusionGroups(data).filter(group => {
      if (collectionId === 'unfiled' && group.wordIds.every(id => data.collections.some(item => item.kind === 'confusion' && item.wordIds.includes(id)))) return false;
      if (collectionId && collectionId !== 'unfiled' && (!collection || !group.wordIds.some(id => collection.wordIds.includes(id)))) return false;
      return [group.name, group.tip, ...group.entries.map(item => item.meaning)].join(' ').toLowerCase().includes(query.trim().toLowerCase());
    });
  }, [data, collectionId, collection, query]);
  const selectedIds = [...new Set(groups.filter(group => selected.includes(group.key)).flatMap(group => group.wordIds))];
  const matchingCollections = data?.collections.filter(item => item.kind === 'confusion') || [];

  async function act(body: unknown) {
    setBusy(true); setError('');
    try { await requestJson('/api/english/workspace', body); await refresh(); return true; }
    catch (cause) { setError((cause as Error).message); return false; }
    finally { setBusy(false); }
  }
  async function members() {
    const id = Number(addTo);
    if (!id || !selectedIds.length) return;
    if (await act({ action: 'members', id, wordIds: selectedIds })) { setSelected([]); setAddTo(''); }
  }
  async function save() {
    if (!editing) return;
    if (await act({ action: 'save', id: editing.id, kind: 'word', word: editing.word, meaning: editing.meaning,
      notes: editing.notes || '', example: editing.senses?.[0]?.example || '', translation: editing.senses?.[0]?.translation || '' })) setEditing(null);
  }

  return <>
    <Heading eyebrow="CONFUSABLES" title={collection?.name || '易混词'} description={data ? groups.length + ' 组 · 整组判断' : undefined}
      action={<Link className="en-button en-primary" href={'/english/study?mode=confusion' + (collection ? '&collection=' + collection.id : '')}>开始练习<ArrowRight size={16} /></Link>} />
    <LoadGate>{data && <>
      <div className="en-list-tabs"><Link href="/english/confusions" className={!collectionId ? 'active' : ''}>全部</Link>
        {matchingCollections.map(item => <Link key={item.id} href={'/english/confusions?collection=' + item.id} className={collectionId === String(item.id) ? 'active' : ''}>{item.name}</Link>)}</div>
      <div className="en-search en-toolbar"><Search size={17} className="en-search-icon" /><input className="en-input" aria-label="搜索易混词" placeholder="搜索英文或中文" value={query} onChange={event => setQuery(event.target.value)} /></div>
      {!!selected.length && <div className="en-selection"><span>已选 {selected.length} 组</span>
        <Link className="en-button en-button-small en-primary" href={'/english/study?mode=confusion&ids=' + selectedIds.join(',') + '&all=1'}>练这些</Link>
        {!collection && <><ChoiceSelect label="加入词表" value={addTo} options={[{ value: '', label: '加入词表…' }, ...matchingCollections.map(item => ({ value: String(item.id), label: item.name }))]} onChange={setAddTo} /><button className="en-button en-button-small" disabled={!addTo || busy} onClick={members}>加入</button></>}
        <button className="en-inline-link" onClick={() => setSelected([])}>取消</button></div>}
      <ErrorMessage message={error} />
      <div className="en-deck-grid">{groups.map(group => <article className="en-panel en-confusion-library" key={group.key}>
        <div className="en-group-top"><label className="en-confusion-select"><input type="checkbox" checked={selected.includes(group.key)} onChange={() => setSelected(current => current.includes(group.key) ? current.filter(key => key !== group.key) : [...current, group.key])} /><span>选择</span></label><span className="en-muted">{group.entries.length} 词</span></div>
        <table className="en-confusion-preview"><tbody>{group.entries.map(item => <tr key={item.key}>
          <th><button className="en-speak-term" onClick={() => speak(item.term)} title="点击朗读"><Volume2 size={14} />{item.term}</button></th>
          <td>{item.meaning}</td>
          <td className="en-row-edit"><button className="en-icon-button" aria-label={'编辑' + item.term} onClick={() => setEditing(data.words.find(word => word.id === item.wordId) || null)}><Pencil size={15} /></button></td>
        </tr>)}</tbody></table>
        {group.tip && <div className="en-memory-highlight"><strong>辨析提示</strong><p><SpeakableText text={group.tip} /></p></div>}
      </article>)}</div>
      {!groups.length && <div className="en-empty"><h2>{query ? '没有找到匹配的词' : '这份词表暂无内容'}</h2><p>可从全部易混词中选择整组加入。</p></div>}
    </>}</LoadGate>
    {editing && <Dialog title="编辑易混词" onClose={() => !busy && setEditing(null)}><form className="en-form" onSubmit={event => { event.preventDefault(); save(); }}>
      <Field label="英文"><input className="en-input" required value={editing.word} maxLength={120} onChange={event => setEditing({ ...editing, word: event.target.value })} /></Field>
      <Field label="中文"><input className="en-input" required value={editing.meaning} maxLength={1000} onChange={event => setEditing({ ...editing, meaning: event.target.value })} /></Field>
      <Field label="自己的记忆笔记"><textarea className="en-textarea" rows={3} value={visibleNote(editing.notes)} onChange={event => setEditing({ ...editing, notes: event.target.value })} /></Field>
      <ErrorMessage message={error} />
      <div className="en-actions"><button className="en-button en-primary" disabled={busy}>保存</button></div>
    </form></Dialog>}
  </>;
}
