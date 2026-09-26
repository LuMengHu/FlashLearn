'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, RotateCcw, Volume2 } from 'lucide-react';
import { catalog, chooseRound, confusionGroups, isUnlearned, practiceBatch, scopeItems, stats, studyFamily } from '@/lib/english/learning';
import type { MemoryState, Rating, StudyItem } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { ErrorMessage, Heading, LoadGate } from './common';
import ChoiceSelect from './choice-select';
import SpeakableText from './speakable-text';

const STORAGE = 'flashlearn.english.session.v3';
const RECENT = 'flashlearn.english.recent.v1';
type Snapshot = { queue: string[]; ratings: Record<string, Rating>; repeats: Record<string, number>; batch: string[]; revealed: boolean };
type Session = Snapshot & { id: string; title: string; mode: 'confusion' | 'phrase'; collection: string; total: number; history: { eventIds: string[]; before: Snapshot }[] };
type Attempt = { keys: string[]; rating: Rating; eventIds: string[] };
function snapshot(session: Session): Snapshot {
  return { queue: [...session.queue], ratings: { ...session.ratings }, repeats: { ...session.repeats },
    batch: [...session.batch], revealed: session.revealed };
}

export default function StudyWorkspace() {
  const { data, refresh, setData } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const { speak } = useSpeech();
  const mode: 'confusion' | 'phrase' = params.get('mode') === 'phrase' ? 'phrase' : 'confusion';
  const collection = params.get('collection') || '';
  const focus = params.get('focus') === 'review' ? 'review' : params.get('focus') === 'learn' ? 'learn' : 'mixed';
  const signature = params.toString();
  const [count, setCount] = useState(12);
  const [all, setAll] = useState(params.get('all') === '1');
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const pending = useRef<Attempt | null>(null);
  const autostarted = useRef('');
  const ids = useMemo(() => {
    const raw = params.get('ids');
    return raw ? [...new Set(raw.split(',').map(Number).filter(value => Number.isSafeInteger(value) && value > 0))] : undefined;
  }, [signature]);
  const items = useMemo(() => data ? scopeItems(data, mode, collection, ids) : [], [data, mode, collection, ids]);
  const catalogMap = useMemo(() => new Map([...(data ? catalog(data) : []), ...items].map(item => [item.key, item])), [data, items]);
  const groups = useMemo(() => data ? new Map(confusionGroups(data).map(group => [group.key, group])) : new Map(), [data]);
  const summary = data ? stats(items, data.memory) : null;
  const matchingCollections = data?.collections.filter(item => item.kind === mode) || [];
  const title = data?.collections.find(item => String(item.id) === collection)?.name || (mode === 'phrase' ? '短语' : '易混词');

  useEffect(() => {
    setReady(false); setSession(null);
    setAll(new URLSearchParams(signature).get('all') === '1');
    if (new URLSearchParams(signature).get('resume') === '1') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
        if (saved && Array.isArray(saved.queue) && Array.isArray(saved.batch) &&
          Array.isArray(saved.history) && saved.history.every((entry: Session['history'][number]) => Array.isArray(entry.eventIds)) &&
          saved.ratings) setSession(saved);
      } catch { setError('上次练习无法恢复，请重新开始。'); }
    }
    setReady(true);
  }, [signature]);

  useEffect(() => {
    if (!ready || !session) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(session)); }
    catch { setError('浏览器无法保存本轮位置，已提交的进度仍保存在词库中。'); }
  }, [ready, session]);

  const start = useCallback(() => {
    if (!data) return;
    const recentKey = RECENT + ':' + mode + ':' + collection;
    let recent: string[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem(recentKey) || '[]');
      if (Array.isArray(saved)) recent = saved.filter(value => typeof value === 'string');
    } catch { /* An unavailable history should never block learning. */ }
    const chosen = chooseRound(items, data.memory, count, all, Date.now(), focus, { avoidFamilies: new Set(recent) });
    if (!chosen.length) { setError(focus === 'review' ? '目前没有到期词条。' : '这个范围没有可练习的词条。'); return; }
    if (focus !== 'review') {
      const available = new Set(items.filter(item => isUnlearned(data.memory[item.key])).map(studyFamily));
      const offered = chosen.filter(item => isUnlearned(data.memory[item.key])).map(studyFamily);
      const next = [...new Set([...recent.filter(family => available.has(family)), ...offered])];
      try { localStorage.setItem(recentKey, JSON.stringify(next.length >= available.size ? [] : next.slice(-40))); } catch { /* The round still works without history. */ }
    }
    const queue = chosen.map(item => item.key);
    setSession({ id: crypto.randomUUID(), title, mode, collection, total: chosen.length, queue,
      batch: practiceBatch(queue, catalogMap), revealed: false, ratings: {}, repeats: {}, history: [] });
    setError(''); pending.current = null;
  }, [data, items, count, all, focus, title, mode, collection, catalogMap]);

  useEffect(() => {
    if (!ready || !data || params.get('autostart') !== '1' || autostarted.current === signature) return;
    autostarted.current = signature;
    start();
  }, [ready, data, signature, params, start]);

  const batchItems = session?.batch.map(key => catalogMap.get(key)).filter((item): item is StudyItem => !!item) || [];
  const activeGroup = batchItems[0]?.groupKey ? groups.get(batchItems[0].groupKey) : undefined;

  const rateBatch = useCallback(async (rating: Rating) => {
    if (!session || !data || !session.revealed || !session.batch.length || locked.current) return;
    if (pending.current && pending.current.rating !== rating) { setError('请先用原来的选择重试这一组。'); return; }
    locked.current = true; setBusy(true); setError('');
    const keys = session.batch.filter(key => session.queue.includes(key));
    const attempt = pending.current || { keys, rating, eventIds: keys.map(() => crypto.randomUUID()) };
    pending.current = attempt;
    const memoryNow = { ...data.memory };
    try {
      for (let index = 0; index < attempt.keys.length; index++) {
        const key = attempt.keys[index];
        const result = await requestJson<{ key: string; state: MemoryState; eventId: string }>('/api/english/review',
          { key, rating, eventId: attempt.eventIds[index], revision: memoryNow[key]?.revision || 0 });
        memoryNow[key] = result.state;
        setData(previous => previous ? { ...previous, memory: { ...previous.memory, [key]: result.state } } : previous);
      }
      const before = snapshot(session);
      const queue = session.queue.filter(key => !attempt.keys.includes(key));
      const repeats = { ...session.repeats };
      if (rating === 'again') for (const key of attempt.keys) if ((repeats[key] || 0) < 1) {
        repeats[key] = 1; queue.push(key);
      }
      const ratings = { ...session.ratings };
      for (const key of attempt.keys) ratings[key] = rating;
      setSession({ ...session, queue, repeats, ratings, batch: practiceBatch(queue, catalogMap), revealed: false,
        history: [...session.history, { eventIds: attempt.eventIds, before }] });
      pending.current = null;
    } catch (cause) {
      setError('这一组尚未全部保存，请保持原选择重试。' + (cause as Error).message);
      await refresh().catch(() => {});
    } finally { locked.current = false; setBusy(false); }
  }, [session, data, catalogMap, refresh, setData]);

  const undo = useCallback(async () => {
    const last = session?.history.at(-1);
    if (!session || !last || locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      for (const eventId of [...last.eventIds].reverse()) {
        const result = await requestJson<{ key: string; state: MemoryState }>('/api/english/review', { action: 'undo', eventId });
        setData(previous => previous ? { ...previous, memory: { ...previous.memory, [result.key]: result.state } } : previous);
      }
      setSession({ ...session, ...last.before, history: session.history.slice(0, -1) });
      pending.current = null;
    } catch (cause) { setError((cause as Error).message); }
    finally { locked.current = false; setBusy(false); }
  }, [session, setData]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || locked.current || !session) return;
      if ((event.target as HTMLElement).closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
      if (event.code === 'Space') { event.preventDefault(); setSession(current => current ? { ...current, revealed: true } : current); }
      if (event.code === 'Backspace') { event.preventDefault(); undo(); }
      if (session.revealed && event.key === '1') { event.preventDefault(); rateBatch('again'); }
      if (session.revealed && event.key === '2') { event.preventDefault(); rateBatch('good'); }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [session, rateBatch, undo]);

  if (!ready) return <div className="en-loading">正在恢复练习…</div>;
  return <LoadGate>{data && summary && <div className="en-study en-study-wide">
    {!session ? <>
      <Heading eyebrow="STUDY" title={title} description={summary.due + ' 项到期 · ' + summary.fresh + ' 项没学过'} />
      <div className="en-list-tabs" aria-label="练习类别">
        <Link href="/english/study?mode=confusion" className={mode === 'confusion' ? 'active' : ''}>易混词</Link>
        <Link href="/english/study?mode=phrase" className={mode === 'phrase' ? 'active' : ''}>短语</Link>
      </div>
      <div className="en-panel en-study-setup">
        <div className="en-field"><span>词表</span><ChoiceSelect label="选择词表" value={collection} options={[
          { value: '', label: '全部' }, ...matchingCollections.map(item => ({ value: String(item.id), label: item.name })),
        ]} onChange={value => router.replace('/english/study?mode=' + mode + (value ? '&collection=' + value : ''))} /></div>
        <div className="en-field"><span>本轮词条数</span><div className="en-toolbar">{[4,8,12,20].map(value =>
          <button key={value} className={'en-button en-button-small ' + (count === value ? 'en-primary' : '')} onClick={() => setCount(value)}>{value}</button>)}</div></div>
        <label className="en-check"><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} />也练未到期内容</label>
        <ErrorMessage message={error} />
        <button className="en-button en-primary en-start-button" disabled={!summary.total} onClick={start}>开始学习<ArrowRight size={17} /></button>
      </div>
    </> : session.queue.length === 0 ? <div className="en-panel en-result">
      <h2>这轮完成</h2>
      <p>{Object.values(session.ratings).filter(value => value === 'good').length} 项认识 · {Object.values(session.ratings).filter(value => value === 'again').length} 项没学过</p>
      <div className="en-actions"><Link href="/english" className="en-button en-primary">返回首页</Link>
        <button className="en-button" onClick={() => { setSession(null); refresh().catch(() => {}); }}>再学一轮</button>
        <button className="en-button" disabled={!session.history.length || busy} onClick={undo}>撤销上次</button></div>
    </div> : <div>
      <div className="en-study-top"><Link href="/english"><ArrowLeft size={16} />稍后继续</Link><span>{session.title} · {Object.keys(session.ratings).length}/{session.total}</span>
        <button className="en-icon-button" aria-label="撤销上次作答" disabled={busy || !session.history.length} onClick={undo}><RotateCcw size={17} /></button></div>
      <div className="en-progress"><div style={{ width: Math.min(100, Object.keys(session.ratings).length / Math.max(1, session.total) * 100) + '%' }} /></div>
      <div className="en-panel en-quiz-panel">
        <div className="en-quiz-head"><div><span className="en-tag">{mode === 'confusion' ? '易混词' : '短语'}</span>
          <h2>{mode === 'confusion' ? <SpeakableText text={batchItems.map(item => item.term).join(' / ')} /> : (batchItems[0]?.term.split(' ')[0] || '') + ' 词组'}</h2></div>
          <span className="en-muted">{batchItems.length} 项</span></div>
        <p className="en-muted">先看英文回忆中文，再揭晓答案。</p>
        <div className="en-table-scroll"><table className="en-quiz-table"><thead><tr><th>英文 · 点击朗读</th><th>中文</th></tr></thead><tbody>
          {batchItems.map(item => <tr key={item.key}>
            <td><button className="en-speak-term" onClick={() => speak(item.term)} title="朗读"><Volume2 size={15} />{item.term}</button></td>
            <td>{session.revealed ? <div className="en-quiz-meaning"><strong>{item.meaning}</strong>{item.example && <small><SpeakableText text={item.example} /></small>}</div> : <span className="en-covered">点击下方揭晓</span>}</td>
          </tr>)}
        </tbody></table></div>
        {session.revealed && activeGroup?.tip && <div className="en-memory-highlight"><strong>辨析提示</strong><p><SpeakableText text={activeGroup.tip} /></p></div>}
        {!session.revealed ? <button className="en-button en-primary en-reveal" onClick={() => setSession({ ...session, revealed: true })}>揭晓中文</button> :
          <div className="en-group-actions"><button className="en-button" disabled={busy} onClick={() => rateBatch('again')}>都不认识</button><button className="en-button en-primary" disabled={busy} onClick={() => rateBatch('good')}>都认识</button></div>}
      </div>
      <ErrorMessage message={error} />
      <p className="en-shortcuts">空格揭晓 · 1 都不认识 · 2 都认识 · Backspace 撤销</p>
    </div>}
  </div>}</LoadGate>;
}
