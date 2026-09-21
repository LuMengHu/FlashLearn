'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { parseImport } from '@/lib/english/learning';
import type { ImportRow } from '@/lib/english/types';
import { requestJson, useWorkspace } from './workspace-provider';
import { ErrorMessage, Field, Heading } from './common';
import ChoiceSelect from './choice-select';

export default function Capture() {
  const { data, refresh } = useWorkspace();
  const [text, setText] = useState(''); const [name, setName] = useState('');
  const [kind, setKind] = useState<'auto'|'word'|'phrase'>('auto');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState('');
  const [error, setError] = useState(''); const [saved, setSaved] = useState<{ id: number; count: number } | null>(null);
  function prepare() {
    try {
      const parsed = parseImport(text, kind);
      if (!parsed.length) throw new Error('先填入一个词，或粘贴一批词表。');
      const withExisting = parsed.map(row => { const existing = data?.words.find(w => w.word.toLowerCase() === row.word); return existing ? { ...row, meaning: existing.meaning, kind: existing.kind, example: existing.senses?.[0]?.example || '' } : row; });
      setRows(withExisting); setError('');
      if (!name.trim()) setName(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(new Date()) + '的词汇');
    } catch (e) { setError((e as Error).message); }
  }
  async function generate() {
    if (!rows || busy) return;
    const missing = rows.filter(r => !r.meaning.trim());
    if (missing.length > 30) { setError('一次 AI 整理最多 30 个新词；已有释义的词不受影响。请分批整理。'); return; }
    setBusy(true); setError('');
    try {
      for (let i=0;i<rows.length;i++) {
        if (rows[i].meaning.trim()) continue;
        setProgress(`正在整理 ${rows[i].word}…`);
        const result = await requestJson<{ meaning: string; senses?: {example?:string;translation?:string}[] }>('/api/words/generate', { word: rows[i].word });
        if (!result.meaning) throw new Error(`${rows[i].word} 暂时没有得到释义，请手动补充或重试。`);
        setRows(previous => previous?.map((r,j) => j === i ? { ...r, meaning: result.meaning, example: result.senses?.[0]?.example || '', translation: result.senses?.[0]?.translation || '' } : r) || null);
      }
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); setProgress(''); }
  }
  async function save() {
    if (busy || !rows?.length) return;
    setBusy(true); setError('');
    try { const result = await requestJson<{ id:number;count:number }>('/api/english/workspace', { action: 'import', name, rows }); await refresh(); setSaved(result); }
    catch(e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <><Heading eyebrow="CAPTURE A LITTLE" title="添加词汇" description="输入一批词，保存为词表。" />
    {saved ? <div className="en-panel en-result"><Check size={40} className="mx-auto text-[#528247]" /><h2>已加入「{name}」</h2><p>{saved.count} 个词汇已放进清单，已有词条的资料和进度保持不变。</p><div className="en-actions"><Link className="en-button en-primary" href={`/english/study?collection=${saved.id}`}>现在开始学<ArrowRight size={16} /></Link><button className="en-button" onClick={() => { setSaved(null); setRows(null); setText(''); setName(''); }}>再加一批</button></div></div> : <div className="en-panel">
      {!rows ? <div className="en-form"><Field label="一行一个单词或短语；有释义时用 | 或 Tab 分隔"><textarea className="en-textarea" rows={10} value={text} onChange={e => setText(e.target.value)} placeholder={'resilient\nadopt | 采纳；收养\nput up with | 忍受 | I cannot put up with the noise.'} /></Field><div className="en-form-grid"><Field label="放进这份清单（可不填）"><input className="en-input" maxLength={100} placeholder="例如：周五 Reading" value={name} onChange={e => setName(e.target.value)} /></Field><div className="en-field"><span>内容类型</span><ChoiceSelect label="内容类型" value={kind} options={[{value:'auto',label:'自动区分单词 / 短语'},{value:'word',label:'全部是单词'},{value:'phrase',label:'全部是短语'}]} onChange={value=>setKind(value as typeof kind)} /></div></div><ErrorMessage message={error} /><div className="en-actions"><button className="en-button en-primary" onClick={prepare}>整理这批词<ArrowRight size={16} /></button></div></div> : <>
        <div className="en-toolbar"><button className="en-button en-button-small" disabled={busy} onClick={() => setRows(null)}><ArrowLeft size={14} />返回输入</button><span className="en-muted">共 {rows.length} 条 · 重复词已合并</span><button className="en-button ml-auto" disabled={busy || rows.every(r => r.meaning.trim())} onClick={generate}>{busy && progress ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}AI 补全缺失释义</button></div>
        <Field label="清单名称"><input className="en-input" maxLength={100} disabled={busy} value={name} onChange={e => setName(e.target.value)} /></Field><p className="en-notice">确认释义后再保存。已有词汇会加入清单，不会覆盖原来的资料。AI 整理结果可以直接修改。</p>
        {rows.map((r,i) => <div key={i} className="en-import-row"><div><span className="en-term">{r.word}</span><ChoiceSelect className="en-compact-choice" label={`${r.word}的类型`} disabled={busy} value={r.kind} options={[{value:'word',label:'单词'},{value:'phrase',label:'短语'}]} onChange={value=>setRows(rows.map((x,j)=>j===i?{...x,kind:value as ImportRow['kind']}:x))} /></div><input className="en-input" aria-label={`${r.word}的释义`} disabled={busy} placeholder="填写核心释义，或用 AI 补全" value={r.meaning} onChange={e => setRows(rows.map((x,j) => j===i ? {...x,meaning:e.target.value} : x))} /><button className="en-icon-button" aria-label={`移除${r.word}`} disabled={busy} onClick={() => setRows(rows.filter((_,j) => j!==i))}><Trash2 size={16} /></button></div>)}
        {progress && <p className="en-notice" role="status">{progress}</p>}<ErrorMessage message={error} /><div className="en-actions"><button className="en-button en-primary" onClick={save} disabled={busy || !name.trim() || !rows.length || rows.some(r => !r.meaning.trim())}>{busy && !progress ? '保存中…' : '确认，加入词库与清单'}<Check size={16} /></button></div>
      </>}
    </div>}
  </>;
}
