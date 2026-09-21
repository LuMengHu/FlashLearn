'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trash2, Volume2 } from 'lucide-react';
import { catalog, chooseRound, isUnlearned, scopeItems, stats } from '@/lib/english/learning';
import type { CollectionKind, MemoryState, Mode, Rating, StudyItem } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { Empty, ErrorMessage, Heading, labelForKind, LoadGate } from './common';
import ChoiceSelect from './choice-select';
import MemoryDetails from './memory-details';

const STORAGE = 'flashlearn.english.session.v1';
type SessionSnapshot = { queue: string[]; ratings: Record<string, Rating>; repeats: Record<string, number> };
type Session = SessionSnapshot & { id: string; total: number; title: string; history: { eventId: string; before: SessionSnapshot }[] };
const MODES: { value: CollectionKind; label: string }[] = [
  { value: 'word', label: '单词' },
  { value: 'confusion', label: '易混词' },
  { value: 'phrase', label: '短语' },
];

export default function StudyWorkspace() {
  const { data, refresh, setData } = useWorkspace();
  const params = useSearchParams();
  const router = useRouter();
  const { speak } = useSpeech();
  const rawMode = params.get('mode');
  const mode = (['word', 'phrase', 'confusion'].includes(rawMode || '') ? rawMode : 'word') as Exclude<Mode, 'all'>;
  const collection = params.get('collection') || '';
  const [count, setCount] = useState(20);
  const [all, setAll] = useState(params.get('all') === '1');
  const [session, setSession] = useState<Session | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageReady, setStorageReady] = useState(false);
  const pending = useRef<{ key: string; rating: Rating; eventId: string } | null>(null);
  const locked = useRef(false);
  const signature = params.toString();

  useEffect(() => {
    setStorageReady(false);
    setSession(null);
    setRevealed(false);
    setAll(new URLSearchParams(signature).get('all') === '1');
    if (new URLSearchParams(signature).get('resume') === '1') {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE) || 'null');
        if (saved && typeof saved.id === 'string' && Array.isArray(saved.queue) && Array.isArray(saved.history) && saved.ratings && saved.repeats) {
          setSession(saved);
        }
      } catch {
        setError('上次练习未能恢复，可以重新开始。');
      }
    }
    setStorageReady(true);
  }, [signature]);

  useEffect(() => {
    if (!storageReady || !session) return;
    try {
      localStorage.setItem(STORAGE, JSON.stringify(session));
    } catch {
      setError('浏览器无法保存本轮位置；已提交的学习进度仍保存在词库中。');
    }
  }, [session, storageReady]);

  const ids = useMemo(() => {
    const raw = params.get('ids');
    return raw ? [...new Set(raw.split(',').map(Number).filter(value => Number.isSafeInteger(value) && value > 0))] : undefined;
  }, [signature]);
  const items = useMemo(() => data ? scopeItems(data, mode, collection, ids) : [], [data, mode, collection, ids]);
  const allItems = useMemo(() => data ? new Map(catalog(data).map(item => [item.key, item])) : new Map<string, StudyItem>(), [data]);
  const matchingCollections = useMemo(() => data?.collections.filter(item => item.kind === mode) ?? [], [data, mode]);
  const summary = data ? stats(items, data.memory) : null;
  const current = session ? allItems.get(session.queue[0]) : undefined;
  const memory = current ? data?.memory[current.key] : undefined;
  const title = ids
    ? '选中的内容'
    : data?.collections.find(item => String(item.id) === collection)?.name
      || (mode === 'phrase' ? '短语练习' : mode === 'confusion' ? '易混词练习' : '单词练习');

  function start(selected?: StudyItem[]) {
    if (!data) return;
    const chosen = selected || chooseRound(items, data.memory, count, all);
    if (!chosen.length) {
      setError('现在没有没学过或已到期的内容。勾选“也练还没到期的内容”即可随时巩固。');
      return;
    }
    setSession({
      id: crypto.randomUUID(),
      queue: chosen.map(item => item.key),
      ratings: {},
      repeats: {},
      history: [],
      total: chosen.length,
      title,
    });
    setRevealed(false);
    setError('');
    pending.current = null;
  }

  const rate = useCallback(async (rating: Rating) => {
    if (!current || !session || !data || locked.current || !revealed) return;
    locked.current = true;
    setBusy(true);
    setError('');
    const attempt = pending.current?.key === current.key && pending.current.rating === rating
      ? pending.current
      : { key: current.key, rating, eventId: crypto.randomUUID() };
    pending.current = attempt;
    try {
      const result = await requestJson<{ key: string; state: MemoryState; eventId: string }>('/api/english/review', {
        ...attempt,
        revision: data.memory[current.key]?.revision || 0,
      });
      setData(previous => previous ? { ...previous, memory: { ...previous.memory, [result.key]: result.state } } : previous);
      const before: SessionSnapshot = {
        queue: [...session.queue],
        ratings: { ...session.ratings },
        repeats: { ...session.repeats },
      };
      const queue = session.queue.slice(1);
      const repeats = { ...session.repeats };
      if (rating === 'again' && (repeats[current.key] || 0) < 2) {
        repeats[current.key] = (repeats[current.key] || 0) + 1;
        queue.splice(Math.min(3, queue.length), 0, current.key);
      }
      setSession({
        ...session,
        queue,
        repeats,
        ratings: { ...session.ratings, [current.key]: rating },
        history: [...session.history, { eventId: result.eventId, before }],
      });
      pending.current = null;
      setRevealed(false);
    } catch (cause) {
      setError((cause as Error).message);
      await refresh().catch(() => {});
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [current, session, data, revealed, setData, refresh]);

  const undo = useCallback(async () => {
    const last = session?.history.at(-1);
    if (!session || !last || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await requestJson<{ key: string; state: MemoryState }>('/api/english/review', { action: 'undo', eventId: last.eventId });
      setData(previous => previous ? { ...previous, memory: { ...previous.memory, [result.key]: result.state } } : previous);
      setSession({ ...session, ...last.before, history: session.history.slice(0, -1) });
      setRevealed(false);
      pending.current = null;
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [session, setData]);

  async function removeCurrent() {
    if (!current || !session || busy || current.kind === 'confusion') return;
    if (!confirm(`把「${current.term}」从词库彻底删除？它也会从所有词表和复习记录中移除。`)) return;
    setBusy(true);
    setError('');
    try {
      await requestJson('/api/english/workspace', { action: 'deleteWord', id: current.wordId });
      const removed = new Set([...allItems.values()].filter(item => (item.wordIds ?? [item.wordId]).includes(current.wordId)).map(item => item.key));
      setSession({ ...session, queue: session.queue.filter(key => !removed.has(key)), history: [], total: Math.max(0, session.total - 1) });
      setRevealed(false);
      await refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || locked.current || !current) return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,button,a,[contenteditable="true"]')) return;
      if (event.code === 'Space') {
        event.preventDefault();
        setRevealed(true);
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        undo();
      }
      if (revealed && ['1', '2'].includes(event.key)) {
        event.preventDefault();
        rate(event.key === '1' ? 'again' : 'good');
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [current, revealed, rate, undo]);

  if (!storageReady) return <LoadGate><div className="en-loading">正在恢复练习…</div></LoadGate>;

  return <LoadGate>{data && summary && <div className="en-study">
    {!session ? <>
      <Heading eyebrow="ONE SMALL SESSION" title={title} description="先回忆，再揭晓；认识后按 1、3、7 天复习。" />
      <div className="en-list-tabs" aria-label="练习类别">
        {MODES.map(option => <Link key={option.value} href={`/english/study?mode=${option.value}`} className={mode === option.value ? 'active' : ''}>{option.label}</Link>)}
      </div>
      <div className="en-panel">
        <div className="en-field">
          <span>{labelForKind[mode]}词表</span>
          <ChoiceSelect
            label={`选择${labelForKind[mode]}词表`}
            value={collection}
            options={[
              { value: '', label: `全部${labelForKind[mode]}` },
              ...matchingCollections.map(item => ({ value: String(item.id), label: item.name })),
            ]}
            onChange={value => {
              const next = new URLSearchParams();
              next.set('mode', mode);
              if (value) next.set('collection', value);
              router.replace(`/english/study?${next}`);
            }}
          />
        </div>
        <p className="en-muted my-5">{summary.total} 项 · {summary.due} 项到期复习 · {summary.fresh} 项没学过</p>
        {summary.total > 0 ? <>
          <div className="en-field"><span>本轮数量</span><div className="en-toolbar !mb-0">{[5, 10, 20, 50].map(value => <button key={value} className={`en-button en-button-small ${count === value ? 'en-primary' : ''}`} onClick={() => setCount(value)}>{value}</button>)}</div></div>
          <label className="flex gap-2 items-center text-sm text-[#728169] mt-5"><input type="checkbox" checked={all} onChange={event => setAll(event.target.checked)} className="accent-[#446f49]" />也练还没到期的内容</label>
          <ErrorMessage message={error} />
          <button className="en-button en-primary w-full" onClick={() => start()}>开始这一轮<ArrowRight size={17} /></button>
        </> : <Empty title={matchingCollections.length ? '这份词表还没有内容。' : `还没有${labelForKind[mode]}词表。`} text={mode === 'confusion' ? '易混词由后台资料生成，建立对应词表后即可练习。' : '先添加内容或建立一份对应类别的词表。'} href="/english/collections" label="管理词表" />}
      </div>
    </> : session.queue.length === 0 ? <div className="en-panel en-result">
      <span className="en-tag">这一轮完成了</span>
      <h2>这一轮已经完成。</h2>
      <div className="en-result-number">{Object.keys(session.ratings).length}</div>
      <p>项内容 · {Object.values(session.ratings).filter(rating => rating === 'good').length} 项认识 · {Object.values(session.ratings).filter(rating => rating === 'again').length} 项没学过</p>
      <p className="mt-4">认识的内容会在 1、3、7 天后依次进入复习列表。</p>
      <ErrorMessage message={error} />
      <div className="en-actions">
        <Link href="/english" className="en-button en-primary">回到学习首页<Check size={16} /></Link>
        <button className="en-button" onClick={() => { setSession(null); refresh().catch(() => {}); }}>再来一轮</button>
        {Object.values(session.ratings).some(rating => rating === 'again') && <button className="en-button" onClick={() => start(Object.entries(session.ratings).filter(([, rating]) => rating === 'again').map(([key]) => allItems.get(key)).filter((item): item is StudyItem => !!item))}>只练不认识的</button>}
        <button className="en-button" disabled={busy || !session.history.length} onClick={undo}>撤销最后一次</button>
      </div>
    </div> : !current ? <div className="en-empty"><h2>这个条目已经被移除。</h2><button className="en-button" onClick={() => setSession({ ...session, queue: session.queue.slice(1) })}>继续其他内容</button></div> : <>
      <div className="en-study-top"><Link href="/english" className="flex gap-2 items-center"><ArrowLeft size={16} />稍后继续</Link><span>{session.title}</span><button className="en-icon-button" title="撤销上次作答" aria-label="撤销上次作答" disabled={busy || !session.history.length} onClick={undo}><RotateCcw size={17} /></button></div>
      <div className="flex justify-between text-xs text-[#89967e]"><span>已练 {Object.keys(session.ratings).length} / {session.total}</span><span>{session.queue.length} 次待练{session.repeats[current.key] ? ' · 本轮再练一次' : ''}</span></div>
      <div className="en-progress"><div style={{ width: `${Object.keys(session.ratings).length / session.total * 100}%` }} /></div>

      <article className={`en-flashcard ${current.kind === 'confusion' ? 'en-confusion-card' : ''}`} key={current.key}>
        <div className="en-flash-top">
          <span className="en-tag">{labelForKind[current.kind]} · {isUnlearned(memory) ? '没学过' : '待复习'}</span>
          {current.kind !== 'confusion' && <div className="en-word-actions"><button className="en-icon-button" onClick={() => speak(current.term)} aria-label="朗读词汇"><Volume2 size={19} /></button><button className="en-icon-button en-danger-link" disabled={busy} onClick={removeCurrent} aria-label={`删除${current.term}`} title="从词库删除"><Trash2 size={17} /></button></div>}
        </div>

        {current.kind === 'confusion' ? <div className="en-confusion-quiz-wrap">
          <table className="en-confusion-quiz">
            <thead><tr><th>英文</th><th>中文</th></tr></thead>
            <tbody>{current.entries?.map(entry => <tr key={entry.term}><td>{entry.term}</td><td className={revealed ? 'revealed' : 'covered'}>{revealed ? entry.meaning : '—'}</td></tr>)}</tbody>
          </table>
          {revealed && current.tip && <p className="en-confusion-tip">{current.tip}</p>}
          {!revealed && <p className="en-recall-hint">逐个回忆这一组词的中文意思。</p>}
        </div> : <>
          <h2>{current.term}</h2>
          {revealed ? <div className="en-answer"><h3>{current.meaning}</h3>{current.example && <p className="en-example">{current.example}</p>}{current.translation && <p className="en-muted">{current.translation}</p>}<MemoryDetails word={data.words.find(word => word.id === current.wordId)} /></div> : <p className="en-recall-hint">先在心里说出它的意思。</p>}
        </>}
      </article>

      <ErrorMessage message={error} />
      {!revealed
        ? <button className="en-button en-primary w-full mt-5 !min-h-14" onClick={() => setRevealed(true)}>想好了，揭晓答案</button>
        : <div className="en-rating"><button disabled={busy} onClick={() => rate('again')}>{busy ? '保存中…' : '不认识'}</button><button disabled={busy} onClick={() => rate('good')}>{busy ? '保存中…' : '认识'}</button></div>}
      <p className="en-shortcuts">空格 揭晓 · 1 不认识 · 2 认识 · Backspace 撤销</p>
    </>}
  </div>}</LoadGate>;
}