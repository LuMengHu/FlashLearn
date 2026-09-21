'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Plus, Search, Trash2, Volume2 } from 'lucide-react';
import type { Vocabulary } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { Dialog, Empty, ErrorMessage, Field, Heading, LoadGate } from './common';
import ChoiceSelect from './choice-select';

export default function Library({ phrases = false }: { phrases?: boolean }) {
  const { data, refresh } = useWorkspace(); const { speak } = useSpeech(); const router = useRouter(); const params = useSearchParams();
  const collectionId = params.get('collection') || '';
  const collection = data?.collections.find(c => String(c.id) === collectionId);
  const [query, setQuery] = useState(''); const [kind, setKind] = useState(phrases ? 'phrase' : 'all'); const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState<number[]>([]); const [editing, setEditing] = useState<Vocabulary | null>(null);
  const [listName, setListName] = useState<string | null>(null); const [addTo, setAddTo] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => (data?.words || []).filter(w => {
    if (kind !== 'all' && w.kind !== kind) return false;
    if (collectionId === 'unfiled' && data?.collections.some(c => c.wordIds.includes(w.id))) return false;
    if (collectionId && collectionId !== 'unfiled' && (!collection || !collection.wordIds.includes(w.id))) return false;
    return [w.word,w.meaning,w.source,w.notes,...(w.family || []).map(x=>x.word),...(w.confusables || []).map(x=>x.word)].join(' ').toLowerCase().includes(query.trim().toLowerCase());
  }).sort((a,b) => sort==='alpha' ? a.word.localeCompare(b.word) : (b.createdAt || '').localeCompare(a.createdAt || '')), [data,kind,collectionId,collection,query,sort]);
  async function act(body: unknown) { setBusy(true); setError(''); try { const result = await requestJson<{id:number}>('/api/english/workspace',body); await refresh(); return result; } catch(e) { setError((e as Error).message); return null; } finally {setBusy(false);} }
  function toggle(id:number) { setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]); }
  function practice() { router.push(`/english/study?ids=${selected.join(',')}&all=1`); }
  async function saveWord() {
    if (!editing) return;
    const result = await act({action:'save',...editing,example:editing.senses?.[0]?.example || '',translation:editing.senses?.[0]?.translation || ''});
    if(result) setEditing(null);
  }
  async function deleteEditing() {
    if (!editing || busy) return;
    if (!confirm(`把「${editing.word}」从词库彻底删除？它也会从所有词表和复习记录中移除。`)) return;
    const result = await act({ action: 'deleteWord', id: editing.id });
    if (result) { setSelected(items => items.filter(id => id !== editing.id)); setEditing(null); }
  }
  return <><Heading eyebrow={phrases ? 'PHRASES, AS A WHOLE' : 'YOUR VOCABULARY'} title={collection?.name || (collectionId === 'unfiled' ? '未归类' : phrases ? '短语' : '词汇')} description={phrases ? undefined : '按词表管理，选中后可练习或归类。'} action={<Link className="en-button" href="/english/new"><Plus size={16} />添加词汇</Link>} />
    <LoadGate>{data && <>
      {phrases && filtered.length>0 && <div className="en-toolbar"><Link className="en-button en-primary" href="/english/study?mode=phrase">开始短语练习<ArrowRight size={16} /></Link></div>}
      {!phrases && <div className="en-list-tabs"><Link href="/english/list" className={!collectionId?'active':''}>全部</Link><Link href="/english/list?collection=unfiled" className={collectionId==='unfiled'?'active':''}>未归类</Link>{data.collections.map(c=><Link key={c.id} href={`/english/list?collection=${c.id}`} className={collectionId===String(c.id)?'active':''}>{c.name}</Link>)}</div>}
      <div className="en-toolbar"><div className="en-search"><Search size={17} className="en-search-icon" /><input className="en-input" aria-label="搜索词表" placeholder="搜索英文、释义、来源…" value={query} onChange={e=>setQuery(e.target.value)} /></div><ChoiceSelect label="词汇类型" value={kind} options={[{value:'all',label:'全部类型'},{value:'word',label:'单词'},{value:'phrase',label:'短语'}]} onChange={setKind} /><ChoiceSelect label="排序" value={sort} options={[{value:'recent',label:'最近加入'},{value:'alpha',label:'字母顺序'}]} onChange={setSort} /></div>
      {collection && <p className="en-notice">正在查看「{collection.name}」。<Link href="/english/list" className="en-inline-link ml-2">查看全部词汇</Link></p>}
      {selected.length>0 && <div className="en-selection"><span>已选 {selected.length} 个</span><button className="en-button en-primary en-button-small" onClick={practice}>练这些</button><button className="en-button en-button-small" onClick={()=>setListName('')}>存成清单</button>{data.collections.length>0 && <><ChoiceSelect label="加入词表" value={addTo} options={[{value:'',label:'加入词表…'},...data.collections.map(c=>({value:String(c.id),label:c.name}))]} onChange={setAddTo} /><button className="en-button en-button-small" disabled={!addTo||busy} onClick={async()=>{if(await act({action:'members',id:addTo,wordIds:selected}))setSelected([]);}}>加入</button></>}{collection && <button className="en-button en-button-small" disabled={busy} onClick={async()=>{if(await act({action:'members',id:collection.id,wordIds:selected,remove:true}))setSelected([]);}}>移出本清单</button>}<button className="en-inline-link" onClick={()=>setSelected([])}>取消选择</button></div>}
      <ErrorMessage message={!editing && listName===null ? error : ''} />
      {!filtered.length ? <Empty title={query ? '还没有找到这个词。' : phrases ? '留住那些不能逐字理解的表达。' : '这里还没有词汇。'} text={query ? '试试另一种拼写或中文释义。' : '粘贴词表或短语，创建一份清单就能开始。'} /> : <div className="en-panel !p-2"><table className="en-table"><thead><tr><th className="w-10"><input type="checkbox" aria-label="选择当前结果" checked={filtered.length>0 && filtered.every(w=>selected.includes(w.id))} onChange={e=>setSelected(e.target.checked ? [...new Set([...selected,...filtered.map(w=>w.id)])] : selected.filter(id=>!filtered.some(w=>w.id===id)))} /></th><th>词汇 · {filtered.length}</th><th>核心释义</th><th className="en-hide-mobile">记忆状态</th><th className="w-10" /></tr></thead><tbody>{filtered.map(w=>{const m=data.memory[`word:${w.id}`];return <tr key={w.id}><td><input type="checkbox" aria-label={`选择${w.word}`} checked={selected.includes(w.id)} onChange={()=>toggle(w.id)} /></td><td><button className="en-term" onClick={()=>{setError('');setEditing(w);}}>{w.word}</button><div><span className="en-tag">{w.kind==='phrase'?'短语':'单词'}</span>{w.source&&<span className="en-muted en-hide-mobile ml-2">{w.source}</span>}</div></td><td className="en-meaning">{w.meaning}</td><td className="en-hide-mobile"><span className={`en-tag ${m?.lastRating==='again'?'en-tag-amber':''}`}>{!m?.seen?'未学':m.lastRating==='again'?'再巩固':m.lastRating==='hard'?'待复习':m.intervalDays>=7?'逐渐熟悉':'正在记住'}</span></td><td><button className="en-icon-button" aria-label={`朗读${w.word}`} onClick={()=>speak(w.word)}><Volume2 size={16} /></button></td></tr>;})}</tbody></table></div>}
    </>}</LoadGate>
    {listName!==null&&<Dialog title="把选中的词存成清单" onClose={()=>!busy&&setListName(null)}><form onSubmit={async e=>{e.preventDefault();const r=await act({action:'collection',name:listName,wordIds:selected});if(r){setListName(null);setSelected([]);router.push(`/english/list?collection=${r.id}`);}}}><Field label="清单名称"><input className="en-input" required autoFocus maxLength={100} value={listName} onChange={e=>setListName(e.target.value)} /></Field><ErrorMessage message={error} /><div className="en-actions"><button className="en-button en-primary" disabled={busy}>保存 {selected.length} 个词</button></div></form></Dialog>}
    {editing&&<Dialog title={editing.word} onClose={()=>!busy&&setEditing(null)}><form className="en-form" onSubmit={e=>{e.preventDefault();saveWord();}}><div className="en-form-grid"><Field label="英文"><input required className="en-input" value={editing.word} maxLength={120} onChange={e=>setEditing({...editing,word:e.target.value})}/></Field><Field label="类型"><ChoiceSelect label="词汇类型" value={editing.kind} options={[{value:'word',label:'单词'},{value:'phrase',label:'短语'}]} onChange={value=>setEditing({...editing,kind:value as Vocabulary['kind']})} /></Field></div><Field label="核心释义"><input required className="en-input" value={editing.meaning} maxLength={1000} onChange={e=>setEditing({...editing,meaning:e.target.value})}/></Field><Field label="例句"><textarea rows={2} className="en-textarea" value={editing.senses?.[0]?.example||''} onChange={e=>setEditing({...editing,senses:[{...editing.senses?.[0],meaning:editing.meaning,example:e.target.value},...(editing.senses||[]).slice(1)]})}/></Field><Field label="例句翻译"><input className="en-input" value={editing.senses?.[0]?.translation||''} onChange={e=>setEditing({...editing,senses:[{...editing.senses?.[0],meaning:editing.meaning,translation:e.target.value},...(editing.senses||[]).slice(1)]})}/></Field><Field label="来源"><input className="en-input" value={editing.source||''} onChange={e=>setEditing({...editing,source:e.target.value})}/></Field><Field label="材料原句（学习时优先展示）"><textarea rows={2} className="en-textarea" value={editing.sourceContext||''} onChange={e=>setEditing({...editing,sourceContext:e.target.value})}/></Field><Field label="自己的记忆笔记"><textarea rows={2} className="en-textarea" value={editing.notes||''} onChange={e=>setEditing({...editing,notes:e.target.value})}/></Field><details className="en-details"><summary>已有的完整释义、同族词和词源</summary>{editing.senses?.map((s,i)=><p key={i}>{s.pos} {s.meaning}{s.example&&<><br/>{s.example}</>}</p>)}{editing.family?.map((f,i)=><p key={i}>{f.word} · {f.meaning}</p>)}<p>{editing.etymology}</p></details><ErrorMessage message={error}/><div className="en-actions"><button type="button" className="en-button en-danger-link mr-auto" disabled={busy} onClick={deleteEditing}><Trash2 size={15}/>删除词条</button><button type="button" className="en-button" disabled={busy} onClick={()=>setEditing(null)}>取消</button><button className="en-button en-primary" disabled={busy}>{busy?'保存中…':'保存修改'}</button></div></form></Dialog>}
  </>;
}
