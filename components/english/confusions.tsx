'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { scopeItems } from '@/lib/english/learning';
import { requestJson, useWorkspace } from './workspace-provider';
import { Empty, ErrorMessage, Heading, LoadGate } from './common';
import ChoiceSelect from './choice-select';

export default function Confusions() {
  const { data, refresh } = useWorkspace();
  const params = useSearchParams();
  const collectionId = params.get('collection') || '';
  const collection = data?.collections.find(item => String(item.id) === collectionId && item.kind === 'confusion');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [addTo, setAddTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const groups = useMemo(() => {
    if (!data) return [];
    return scopeItems(data, 'confusion', collectionId).filter(group =>
      [...(group.entries || []).flatMap(entry => [entry.term, entry.meaning]), group.tip || '']
        .join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  }, [data, collectionId, query]);

  const selectedGroups = groups.filter(group => selected.includes(group.key));
  const selectedWordIds = [...new Set(selectedGroups.flatMap(group => group.wordIds ?? [group.wordId]))];

  async function updateMembers(remove = false) {
    const id = remove ? collection?.id : Number(addTo);
    if (!id || !selectedWordIds.length) return;
    setBusy(true);
    setError('');
    try {
      await requestJson('/api/english/workspace', { action: 'members', id, wordIds: selectedWordIds, remove });
      await refresh();
      setSelected([]);
      setAddTo('');
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Heading
      eyebrow="CONFUSABLE WORDS"
      title={collection?.name || '易混词'}
      description={data ? `${groups.length} 组辨析，按组记忆。` : ''}
      action={groups.length ? <Link href={`/english/study?mode=confusion${collection ? `&collection=${collection.id}` : ''}`} className="en-button en-primary">开始练习<ArrowRight size={16} /></Link> : undefined}
    />
    <LoadGate>{data && <>
      <div className="en-list-tabs"><Link href="/english/confusions" className={!collectionId ? 'active' : ''}>全部易混词</Link>{data.collections.filter(item => item.kind === 'confusion').map(item => <Link key={item.id} href={`/english/confusions?collection=${item.id}`} className={collectionId === String(item.id) ? 'active' : ''}>{item.name}</Link>)}</div>
      <div className="en-search en-toolbar"><Search size={17} className="en-search-icon" /><input className="en-input" aria-label="搜索易混词" placeholder="搜索英文或中文" value={query} onChange={event => setQuery(event.target.value)} /></div>
      {selected.length > 0 && <div className="en-selection">
        <span>已选 {selected.length} 组</span>
        {!collection && <><ChoiceSelect label="加入易混词词表" value={addTo} options={[{ value: '', label: '加入词表…' }, ...data.collections.filter(item => item.kind === 'confusion').map(item => ({ value: String(item.id), label: item.name }))]} onChange={setAddTo} /><button className="en-button en-button-small en-primary" disabled={!addTo || busy} onClick={() => updateMembers(false)}>加入</button></>}
        {collection && <button className="en-button en-button-small" disabled={busy} onClick={() => updateMembers(true)}>移出本词表</button>}
        <button className="en-inline-link" onClick={() => setSelected([])}>取消选择</button>
      </div>}
      <ErrorMessage message={error} />
      {groups.length ? <div className="en-deck-grid">{groups.map(group => <article className="en-panel en-confusion-library" key={group.key}>
        <label className="en-confusion-select"><input type="checkbox" checked={selected.includes(group.key)} onChange={() => setSelected(current => current.includes(group.key) ? current.filter(key => key !== group.key) : [...current, group.key])} /><span>选择这一组</span></label>
        <table className="en-confusion-preview"><tbody>{group.entries?.map(entry => <tr key={entry.term}><th>{entry.term}</th><td>{entry.meaning}</td></tr>)}</tbody></table>
        {group.tip && <p className="en-notice">{group.tip}</p>}
      </article>)}</div> : <Empty title={query ? '没有匹配的词。' : '暂无易混资料。'} text={query ? '试试另一种拼写。' : collection ? '从“全部易混词”选择整组加入这份词表。' : '后台词库提供易混词后，会自动出现在这里。'} href={collection ? '/english/confusions' : '/english/collections?kind=confusion'} label={collection ? '查看全部易混词' : '管理易混词词表'} />}
    </>}</LoadGate>
  </>;
}