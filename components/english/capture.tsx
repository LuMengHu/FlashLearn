'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Volume2 } from 'lucide-react';
import { parseImport } from '@/lib/english/learning';
import type { ImportRow } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { ErrorMessage, Field, Heading } from './common';
import ChoiceSelect from './choice-select';

export default function Capture() {
  const { data, refresh } = useWorkspace();
  const { speak } = useSpeech();
  const [kind, setKind] = useState<'confusion' | 'phrase'>('confusion');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [targetCollection, setTargetCollection] = useState('');
  const [tip, setTip] = useState('');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: number; count: number; kind: string } | null>(null);

  function prepare() {
    try {
      const parsed = parseImport(text, kind === 'phrase' ? 'phrase' : 'word');
      if (!parsed.length || (kind === 'confusion' && (parsed.length < 2 || parsed.length > 20)))
        throw new Error(kind === 'confusion' ? '一组填写 2–20 个真正容易混淆的单词。' : '请至少填写一条短语。');
      if (kind === 'confusion' && parsed.some(row => /\s/.test(row.word))) throw new Error('易混词组只收录单词，短语请单独添加。');
      setRows(parsed); setError('');
      if (!name.trim()) setName(kind === 'confusion' ? '我的易混词' : '我的短语');
    } catch (cause) { setError((cause as Error).message); }
  }

  async function save() {
    if (!rows?.length || (!targetCollection && !name.trim()) || rows.some(row => !row.meaning.trim()) || busy) return;
    setBusy(true); setError('');
    try {
      const result = await requestJson<{ id: number; count: number; kind: string }>('/api/english/workspace',
        kind === 'confusion'
          ? { action: 'createConfusionGroup', name, tip, rows, collectionId: targetCollection || undefined }
          : { action: 'import', name, rows, collectionId: targetCollection || undefined });
      await refresh();
      setSaved(result);
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  return <>
    <Heading eyebrow="ADD" title="添加内容" />
    {saved ? <div className="en-panel en-result"><Check size={34} className="mx-auto text-[#528247]" /><h2>已加入「{data?.collections.find(item => item.id === saved.id)?.name || name}」</h2><p>{saved.count} 项</p>
      <div className="en-actions"><Link className="en-button en-primary" href={'/english/study?mode=' + saved.kind + '&collection=' + saved.id}>开始学习<ArrowRight size={16} /></Link>
        <button className="en-button" onClick={() => { setSaved(null); setRows(null); setText(''); setName(''); setTip(''); setTargetCollection(''); }}>继续添加</button></div></div> :
      <div className="en-panel en-capture">
        <div className="en-list-tabs" aria-label="内容类别">
          <button className={kind === 'confusion' ? 'active' : ''} onClick={() => { setKind('confusion'); setRows(null); setTargetCollection(''); }}>易混词</button>
          <button className={kind === 'phrase' ? 'active' : ''} onClick={() => { setKind('phrase'); setRows(null); setTargetCollection(''); }}>短语</button>
        </div>
        {!rows ? <div className="en-form">
          <Field label="保存到"><ChoiceSelect label="保存到词表" value={targetCollection} options={[{ value: '', label: '新建词表' }, ...(data?.collections.filter(item => item.kind === kind).map(item => ({ value: String(item.id), label: item.name })) || [])]} onChange={setTargetCollection} /></Field>
          {!targetCollection && <Field label="词表名称"><input className="en-input" maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder={kind === 'confusion' ? '例如：本周易混' : '例如：Practice 4 短语'} /></Field>}
          <Field label="每行一条：英文 | 中文"><textarea className="en-textarea" rows={8} value={text} onChange={event => setText(event.target.value)}
            placeholder={kind === 'confusion' ? 'adapt | 适应\nadopt | 采用；收养\nadept | 熟练的' : 'put up with | 忍受\naccount for | 解释；占比'} /></Field>
          {kind === 'confusion' && <Field label="辨析提示（可选）"><input className="en-input" maxLength={2000} value={tip} onChange={event => setTip(event.target.value)} placeholder="写出关键差别" /></Field>}
          <ErrorMessage message={error} /><button className="en-button en-primary" onClick={prepare}>预览内容<ArrowRight size={16} /></button>
        </div> : <div className="en-form">
          <div className="en-toolbar"><button className="en-button" onClick={() => setRows(null)} disabled={busy}>返回修改</button><span className="en-muted">{rows.length} 项</span></div>
          {!targetCollection && <Field label="词表名称"><input className="en-input" value={name} onChange={event => setName(event.target.value)} maxLength={100} /></Field>}
          <div className="en-import-preview">{rows.map((row,index) => <div className="en-import-row" key={row.word}>
            <button className="en-speak-term" onClick={() => speak(row.word)} title="朗读"><Volume2 size={15} />{row.word}</button>
            <input className="en-input" aria-label={row.word + '的中文释义'} value={row.meaning} onChange={event => setRows(rows.map((item,i) => i === index ? { ...item, meaning: event.target.value } : item))} placeholder="中文释义" />
            <button className="en-icon-button en-danger-link" aria-label={'移除' + row.word} onClick={() => setRows(rows.filter((_,i) => i !== index))}>移除</button>
          </div>)}</div>
          {kind === 'confusion' && <Field label="辨析提示"><input className="en-input" value={tip} onChange={event => setTip(event.target.value)} maxLength={2000} /></Field>}
          <ErrorMessage message={error} />
          <button className="en-button en-primary" disabled={busy || (!targetCollection && !name.trim()) || rows.length < (kind === 'confusion' ? 2 : 1) || rows.some(row => !row.meaning.trim())} onClick={save}>{busy ? '保存中…' : '加入词表'}</button>
        </div>}
      </div>}
  </>;
}
