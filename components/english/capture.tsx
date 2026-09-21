'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { parseImport } from '@/lib/english/learning';
import type { ImportRow, VocabularyKind } from '@/lib/english/types';
import { requestJson, useWorkspace } from './workspace-provider';
import { ErrorMessage, Field, Heading } from './common';
import ChoiceSelect from './choice-select';

export default function Capture() {
  const { data, refresh } = useWorkspace();
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<VocabularyKind>('word');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ id: number; count: number; kind: VocabularyKind } | null>(null);

  function prepare() {
    try {
      const parsed = parseImport(text, kind);
      if (!parsed.length) throw new Error('先填入一个词，或粘贴一批词表。');
      const withExisting = parsed.map(row => {
        const existing = data?.words.find(word => word.word.toLowerCase() === row.word);
        return existing ? { ...row, meaning: existing.meaning, kind: existing.kind, example: existing.senses?.[0]?.example || '' } : row;
      });
      if (new Set(withExisting.map(row => row.kind)).size !== 1) throw new Error('已有内容中同时包含单词和短语，请分成两份词表导入。');
      setRows(withExisting);
      setError('');
      if (!name.trim()) setName(new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric' }).format(new Date()) + (kind === 'phrase' ? '短语' : '单词'));
    } catch (cause) {
      setError((cause as Error).message);
    }
  }

  async function generate() {
    if (!rows || busy) return;
    const missing = rows.filter(row => !row.meaning.trim());
    if (missing.length > 30) {
      setError('一次 AI 整理最多 30 个新词；已有释义的内容不受影响。请分批整理。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      for (let index = 0; index < rows.length; index++) {
        if (rows[index].meaning.trim()) continue;
        setProgress(`正在整理 ${rows[index].word}…`);
        const result = await requestJson<{ meaning: string; senses?: { example?: string; translation?: string }[] }>('/api/words/generate', { word: rows[index].word });
        if (!result.meaning) throw new Error(`${rows[index].word} 暂时没有得到释义，请手动补充或重试。`);
        setRows(previous => previous?.map((row, current) => current === index ? { ...row, meaning: result.meaning, example: result.senses?.[0]?.example || '', translation: result.senses?.[0]?.translation || '' } : row) || null);
      }
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  async function save() {
    if (busy || !rows?.length) return;
    setBusy(true);
    setError('');
    try {
      const result = await requestJson<{ id: number; count: number; kind: VocabularyKind }>('/api/english/workspace', { action: 'import', name, rows });
      await refresh();
      setSaved(result);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Heading eyebrow="CAPTURE A LITTLE" title="添加词汇" description="单词和短语分别保存为对应类别的词表。" />
    {saved ? <div className="en-panel en-result">
      <Check size={40} className="mx-auto text-[#528247]" />
      <h2>已加入「{name}」</h2>
      <p>{saved.count} 个内容已放进{saved.kind === 'phrase' ? '短语' : '单词'}词表。</p>
      <div className="en-actions"><Link className="en-button en-primary" href={`/english/study?mode=${saved.kind}&collection=${saved.id}`}>现在开始学<ArrowRight size={16} /></Link><button className="en-button" onClick={() => { setSaved(null); setRows(null); setText(''); setName(''); }}>再加一批</button></div>
    </div> : <div className="en-panel">
      {!rows ? <div className="en-form">
        <div className="en-field"><span>内容类型</span><ChoiceSelect label="内容类型" value={kind} options={[{ value: 'word', label: '单词' }, { value: 'phrase', label: '短语' }]} onChange={value => setKind(value as VocabularyKind)} /></div>
        <Field label={`一行一个${kind === 'phrase' ? '短语' : '单词'}；有释义时用 | 或 Tab 分隔`}><textarea className="en-textarea" rows={10} value={text} onChange={event => setText(event.target.value)} placeholder={kind === 'phrase' ? 'put up with | 忍受' : 'resilient\nadopt | 采纳；收养'} /></Field>
        <Field label="词表名称"><input className="en-input" maxLength={100} placeholder={kind === 'phrase' ? '例如：Reading 短语' : '例如：Reading 生词'} value={name} onChange={event => setName(event.target.value)} /></Field>
        <ErrorMessage message={error} />
        <div className="en-actions"><button className="en-button en-primary" onClick={prepare}>整理这批内容<ArrowRight size={16} /></button></div>
      </div> : <>
        <div className="en-toolbar"><button className="en-button en-button-small" disabled={busy} onClick={() => setRows(null)}><ArrowLeft size={14} />返回输入</button><span className="en-muted">共 {rows.length} 条 · 重复内容已合并</span><button className="en-button ml-auto" disabled={busy || rows.every(row => row.meaning.trim())} onClick={generate}>{busy && progress ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}AI 补全释义</button></div>
        <Field label="词表名称"><input className="en-input" maxLength={100} disabled={busy} value={name} onChange={event => setName(event.target.value)} /></Field>
        <p className="en-notice">这批内容将统一保存为{kind === 'phrase' ? '短语' : '单词'}词表。</p>
        {rows.map((row, index) => <div key={index} className="en-import-row"><div><span className="en-term">{row.word}</span><span className="en-tag">{kind === 'phrase' ? '短语' : '单词'}</span></div><input className="en-input" aria-label={`${row.word}的释义`} disabled={busy} placeholder="填写核心释义，或用 AI 补全" value={row.meaning} onChange={event => setRows(rows.map((item, current) => current === index ? { ...item, meaning: event.target.value } : item))} /><button className="en-icon-button" aria-label={`移除${row.word}`} disabled={busy} onClick={() => setRows(rows.filter((_, current) => current !== index))}><Trash2 size={16} /></button></div>)}
        {progress && <p className="en-notice" role="status">{progress}</p>}
        <ErrorMessage message={error} />
        <div className="en-actions"><button className="en-button en-primary" onClick={save} disabled={busy || !name.trim() || !rows.length || rows.some(row => !row.meaning.trim())}>{busy && !progress ? '保存中…' : '确认加入词库与词表'}<Check size={16} /></button></div>
      </>}
    </div>}
  </>;
}