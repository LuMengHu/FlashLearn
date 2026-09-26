'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Plus, Search, Volume2 } from 'lucide-react';
import { visibleNote } from '@/lib/english/learning';
import type { Vocabulary, VocabularyKind } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { Dialog, Empty, ErrorMessage, Field, Heading, LoadGate } from './common';
import ChoiceSelect from './choice-select';
import SpeakableText from './speakable-text';

export default function Library({ phrases = false }: { phrases?: boolean }) {
  const { data, refresh } = useWorkspace();
  const { speak } = useSpeech();
  const router = useRouter();
  const params = useSearchParams();
  const collectionId = params.get('collection') || '';
  const collection = data?.collections.find(item => String(item.id) === collectionId);
  const requestedKind = params.get('kind');
  const activeKind: VocabularyKind = collection?.kind === 'phrase' || phrases || requestedKind === 'phrase' ? 'phrase' : 'word';
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<number[]>([]);
  const [editing, setEditing] = useState<Vocabulary | null>(null);
  const [listName, setListName] = useState<string | null>(null);
  const [addTo, setAddTo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (data?.words || []).filter(word => {
    if (word.kind !== activeKind || word.excluded) return false;
    if (collectionId === 'unfiled' && data?.collections.some(item => item.kind === word.kind && item.wordIds.includes(word.id))) return false;
    if (collectionId && collectionId !== 'unfiled' && (!collection || collection.kind === 'confusion' || !collection.wordIds.includes(word.id))) return false;
    return [word.word, word.meaning, visibleNote(word.notes), ...(word.family || []).map(item => item.word), ...(word.confusables || []).map(item => item.word)]
      .join(' ').toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a, b) => sort === 'alpha' ? a.word.localeCompare(b.word) : (b.createdAt || '').localeCompare(a.createdAt || '')), [data, activeKind, collectionId, collection, query, sort]);

  const matchingCollections = data?.collections.filter(item => item.kind === activeKind) ?? [];

  async function act(body: unknown) {
    setBusy(true);
    setError('');
    try {
      const result = await requestJson<{ id: number }>('/api/english/workspace', body);
      await refresh();
      return result;
    } catch (cause) {
      setError((cause as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: number) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function practice() {
    router.push(`/english/study?mode=${activeKind}&ids=${selected.join(',')}&all=1`);
  }

  async function saveWord() {
    if (!editing) return;
    const result = await act({ action: 'save', ...editing, example: editing.senses?.[0]?.example || '', translation: editing.senses?.[0]?.translation || '' });
    if (result) setEditing(null);
  }

  return <>
    <Heading eyebrow={activeKind === 'phrase' ? 'PHRASES' : 'VOCABULARY'} title={collection?.name || (collectionId === 'unfiled' ? `未归类${activeKind === 'phrase' ? '短语' : '单词'}` : activeKind === 'phrase' ? '短语' : '单词')} action={<Link className="en-button" href="/english/new"><Plus size={16} />添加内容</Link>} />
    <LoadGate>{data && <>
      <div className="en-list-tabs">
        <Link href={activeKind === 'phrase' ? '/english/phrases' : '/english/list'} className={!collectionId ? 'active' : ''}>全部{activeKind === 'phrase' ? '短语' : '单词'}</Link>
        <Link href={`/english/phrases?collection=unfiled&kind=${activeKind}`} className={collectionId === 'unfiled' ? 'active' : ''}>未归类</Link>
        {matchingCollections.map(item => <Link key={item.id} href={`/english/phrases?collection=${item.id}`} className={collectionId === String(item.id) ? 'active' : ''}>{item.name}</Link>)}
      </div>
      {filtered.length > 0 && <div className="en-toolbar"><Link className="en-button en-primary" href={`/english/study?mode=${activeKind}${collection ? `&collection=${collection.id}` : ''}`}>开始{activeKind === 'phrase' ? '短语' : '单词'}练习<ArrowRight size={16} /></Link></div>}
      <div className="en-toolbar">
        <div className="en-search"><Search size={17} className="en-search-icon" /><input className="en-input" aria-label="搜索词表" placeholder="搜索英文或中文" value={query} onChange={event => setQuery(event.target.value)} /></div>
        <ChoiceSelect label="排序" value={sort} options={[{ value: 'recent', label: '最近加入' }, { value: 'alpha', label: '字母顺序' }]} onChange={setSort} />
      </div>
      {selected.length > 0 && <div className="en-selection">
        <span>已选 {selected.length} 个</span>
        <button className="en-button en-primary en-button-small" onClick={practice}>练这些</button>
        <button className="en-button en-button-small" onClick={() => setListName('')}>存成{activeKind === 'phrase' ? '短语' : '单词'}词表</button>
        {matchingCollections.length > 0 && <><ChoiceSelect label="加入词表" value={addTo} options={[{ value: '', label: '加入词表…' }, ...matchingCollections.map(item => ({ value: String(item.id), label: item.name }))]} onChange={setAddTo} /><button className="en-button en-button-small" disabled={!addTo || busy} onClick={async () => { if (await act({ action: 'members', id: addTo, wordIds: selected })) setSelected([]); }}>加入</button></>}
        <button className="en-inline-link" onClick={() => setSelected([])}>取消选择</button>
      </div>}
      <ErrorMessage message={!editing && listName === null ? error : ''} />
      {!filtered.length ? <Empty title={query ? '没有找到这个内容。' : `这里还没有${activeKind === 'phrase' ? '短语' : '单词'}。`} text={query ? '试试另一种拼写或中文释义。' : '添加一批内容后即可建立词表。'} /> : <div className="en-panel !p-2">
        <table className="en-table">
          <thead><tr><th className="w-10"><input type="checkbox" aria-label="选择当前结果" checked={filtered.length > 0 && filtered.every(word => selected.includes(word.id))} onChange={event => setSelected(event.target.checked ? [...new Set([...selected, ...filtered.map(word => word.id)])] : selected.filter(id => !filtered.some(word => word.id === id)))} /></th><th>{activeKind === 'phrase' ? '短语' : '单词'} · {filtered.length}</th><th>核心释义</th><th className="en-hide-mobile">记忆状态</th><th className="w-10" /></tr></thead>
          <tbody>{filtered.map(word => {
            const memory = data.memory[`word:${word.id}`];
            return <tr key={word.id}>
              <td><input type="checkbox" aria-label={`选择${word.word}`} checked={selected.includes(word.id)} onChange={() => toggle(word.id)} /></td>
              <td><button className="en-term" onClick={() => speak(word.word)} title="点击朗读">{word.word}</button><div><span className="en-tag">{word.kind === 'phrase' ? '短语' : '单词'}</span></div></td>
              <td className="en-meaning">{word.meaning}</td>
              <td className="en-hide-mobile"><span className={`en-tag ${memory?.lastRating !== 'good' ? 'en-tag-amber' : ''}`}>{!memory || memory.lastRating !== 'good' ? '没学过' : '待复习'}</span></td>
              <td><button className="en-icon-button" aria-label={`朗读${word.word}`} onClick={() => speak(word.word)}><Volume2 size={16} /></button></td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </>}</LoadGate>

    {listName !== null && <Dialog title={`存成${activeKind === 'phrase' ? '短语' : '单词'}词表`} onClose={() => !busy && setListName(null)}>
      <form onSubmit={async event => {
        event.preventDefault();
        const result = await act({ action: 'collection', name: listName, kind: activeKind, wordIds: selected });
        if (result) {
          setListName(null);
          setSelected([]);
          router.push(`/english/phrases?collection=${result.id}`);
        }
      }}>
        <Field label="词表名称"><input className="en-input" required autoFocus maxLength={100} value={listName} onChange={event => setListName(event.target.value)} /></Field>
        <ErrorMessage message={error} />
        <div className="en-actions"><button className="en-button en-primary" disabled={busy}>保存 {selected.length} 个内容</button></div>
      </form>
    </Dialog>}

    {editing && <Dialog title={editing.word} onClose={() => !busy && setEditing(null)}>
      <form className="en-form" onSubmit={event => { event.preventDefault(); saveWord(); }}>
        <div className="en-form-grid">
          <Field label="英文"><input required className="en-input" value={editing.word} maxLength={120} onChange={event => setEditing({ ...editing, word: event.target.value })} /></Field>

        </div>
        <Field label="核心释义"><input required className="en-input" value={editing.meaning} maxLength={1000} onChange={event => setEditing({ ...editing, meaning: event.target.value })} /></Field>
        <Field label="例句"><textarea rows={2} className="en-textarea" value={editing.senses?.[0]?.example || ''} onChange={event => setEditing({ ...editing, senses: [{ ...editing.senses?.[0], meaning: editing.meaning, example: event.target.value }, ...(editing.senses || []).slice(1)] })} /></Field>
        <Field label="例句翻译"><input className="en-input" value={editing.senses?.[0]?.translation || ''} onChange={event => setEditing({ ...editing, senses: [{ ...editing.senses?.[0], meaning: editing.meaning, translation: event.target.value }, ...(editing.senses || []).slice(1)] })} /></Field>
        <Field label="自己的记忆笔记"><textarea rows={3} className="en-textarea" value={editing.notes || ''} onChange={event => setEditing({ ...editing, notes: event.target.value })} /></Field>
        <details className="en-details"><summary>完整释义、同族词和词源</summary>{editing.senses?.map((sense, index) => <p key={index}>{sense.pos} {sense.meaning}{sense.example && <><br /><SpeakableText text={sense.example} /></>}</p>)}{editing.family?.map((item, index) => <p key={index}><SpeakableText text={item.word} /> · {item.meaning}</p>)}<p>{editing.etymology && <SpeakableText text={editing.etymology} />}</p></details>
        <ErrorMessage message={error} />
        <div className="en-actions"><button type="button" className="en-button" disabled={busy} onClick={() => setEditing(null)}>取消</button><button className="en-button en-primary" disabled={busy}>{busy ? '保存中…' : '保存修改'}</button></div>
      </form>
    </Dialog>}
  </>;
}
