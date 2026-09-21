'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, RotateCcw, Trash2, Volume2 } from 'lucide-react';
import { catalog, chooseRound, EMPTY_MEMORY, schedule, scopeItems, stats } from '@/lib/english/learning';
import type { MemoryState, Mode, Rating, StudyItem } from '@/lib/english/types';
import { useSpeech } from '@/hooks/use-speech';
import { requestJson, useWorkspace } from './workspace-provider';
import { Empty, ErrorMessage, Field, Heading, labelForKind, LoadGate } from './common';
import ChoiceSelect from './choice-select';
import MemoryDetails from './memory-details';

const STORAGE = 'flashlearn.english.session.v1';
type SessionSnapshot = { queue: string[]; introduced: string[]; ratings: Record<string,Rating>; repeats: Record<string,number> };
type Session = SessionSnapshot & { id:string; total:number; title:string; history:{eventId:string;before:SessionSnapshot}[] };
function delayLabel(state: MemoryState | undefined, rating: Rating) {
  const next=schedule(state,rating);const hours=(Date.parse(next.dueAt!)-Date.now())/3_600_000;
  return hours<1?'约 10 分钟后':hours<24?`约 ${Math.max(1,Math.round(hours))} 小时后`:`约 ${Math.max(1,Math.round(hours/24))} 天后`;
}

export default function StudyWorkspace() {
  const {data,refresh,setData}=useWorkspace();const params=useSearchParams();const router=useRouter();const {speak}=useSpeech();
  const mode=(['word','phrase','confusion'].includes(params.get('mode')||'')?params.get('mode'):'all') as Mode;
  const collection=params.get('collection')||'';
  const [count,setCount]=useState(20); const [all,setAll]=useState(params.get('all')==='1');
  const [session,setSession]=useState<Session|null>(null);const [revealed,setRevealed]=useState(false);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [storageReady,setStorageReady]=useState(false);
  const pending=useRef<{key:string;rating:Rating;eventId:string}|null>(null);const locked=useRef(false);
  const signature=params.toString();
  useEffect(()=>{setStorageReady(false);setSession(null);setRevealed(false);setAll(new URLSearchParams(signature).get('all')==='1');if(new URLSearchParams(signature).get('resume')==='1'){try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved&&typeof saved.id==='string'&&Array.isArray(saved.queue)&&Array.isArray(saved.history)&&saved.ratings&&saved.repeats&&Array.isArray(saved.introduced))setSession(saved);}catch{setError('上次练习未能恢复，可以重新开始。');}}setStorageReady(true);},[signature]);
  useEffect(()=>{if(!storageReady||!session)return;try{localStorage.setItem(STORAGE,JSON.stringify(session));}catch{setError('浏览器无法保存本轮位置；已提交的学习进度仍保存在词库中。');}},[session,storageReady]);
  const ids=useMemo(()=>{const raw=params.get('ids');return raw?[...new Set(raw.split(',').map(Number).filter(n=>Number.isSafeInteger(n)&&n>0))]:undefined;},[signature]);
  const items=useMemo(()=>data?scopeItems(data,mode,collection,ids):[],[data,mode,collection,ids]);
  const allItems=useMemo(()=>data?new Map(catalog(data).map(i=>[i.key,i])):new Map<string,StudyItem>(),[data]);
  const summary=data?stats(items,data.memory):null;
  const current=session?allItems.get(session.queue[0]):undefined;
  const memory=current?data?.memory[current.key]:undefined;
  const fresh=!!current&&!memory?.seen&&!session?.introduced.includes(current.key);
  const title=ids?'选中的词汇':data?.collections.find(c=>String(c.id)===collection)?.name||(collection==='unfiled'?'未归类':collection==='recent'?'最近加入':collection==='difficult'?'最近没记牢':mode==='phrase'?'短语积累':mode==='confusion'?'易混词辨认':'单词与短语');
  function start(selected?: StudyItem[]) {
    if(!data)return;const chosen=selected||chooseRound(items,data.memory,count,all);
    if(!chosen.length){setError('现在没有待复习或未学的词。勾选“也练已经认识的词”即可随时巩固。');return;}
    setSession({id:crypto.randomUUID(),queue:chosen.map(i=>i.key),introduced:[],ratings:{},repeats:{},history:[],total:chosen.length,title});setRevealed(false);setError('');pending.current=null;
  }
  const introduce=useCallback(()=>{if(!session||!current)return;const queue=session.queue.slice(1);queue.splice(Math.min(3,queue.length),0,current.key);setSession({...session,queue,introduced:[...session.introduced,current.key]});setRevealed(false);},[session,current]);
  const rate=useCallback(async(rating:Rating)=>{
    if(!current||!session||!data||locked.current||!revealed||fresh)return;
    locked.current=true;setBusy(true);setError('');
    const attempt=pending.current?.key===current.key&&pending.current.rating===rating?pending.current:{key:current.key,rating,eventId:crypto.randomUUID()};pending.current=attempt;
    try{
      const result=await requestJson<{key:string;state:MemoryState;eventId:string}>('/api/english/review',{...attempt,revision:data.memory[current.key]?.revision||0});
      setData(d=>d?{...d,memory:{...d.memory,[result.key]:result.state}}:d);
      const before:SessionSnapshot={queue:[...session.queue],introduced:[...session.introduced],ratings:{...session.ratings},repeats:{...session.repeats}};
      const queue=session.queue.slice(1);const repeats={...session.repeats};
      if(rating==='again'&&(repeats[current.key]||0)<2){repeats[current.key]=(repeats[current.key]||0)+1;queue.splice(Math.min(3,queue.length),0,current.key);}
      setSession({...session,queue,repeats,ratings:{...session.ratings,[current.key]:rating},history:[...session.history,{eventId:result.eventId,before}]});
      pending.current=null;setRevealed(false);
    }catch(e){setError((e as Error).message);await refresh().catch(()=>{});}finally{locked.current=false;setBusy(false);}
  },[current,session,data,revealed,fresh,setData,refresh]);
  const undo=useCallback(async()=>{
    const last=session?.history.at(-1);if(!session||!last||locked.current)return;
    locked.current=true;setBusy(true);setError('');
    try{const result=await requestJson<{key:string;state:MemoryState}>('/api/english/review',{action:'undo',eventId:last.eventId});setData(d=>d?{...d,memory:{...d.memory,[result.key]:result.state}}:d);setSession({...session,...last.before,history:session.history.slice(0,-1)});setRevealed(false);pending.current=null;}
    catch(e){setError((e as Error).message);}finally{locked.current=false;setBusy(false);}
  },[session,setData]);
  async function removeCurrent() {
    if (!current || !session || busy || current.kind === 'confusion') return;
    if (!confirm(`把「${current.term}」从词库彻底删除？它也会从所有词表和复习记录中移除。`)) return;
    setBusy(true); setError('');
    try {
      await requestJson('/api/english/workspace', { action: 'deleteWord', id: current.wordId });
      const removed = new Set([...allItems.values()].filter(item => item.wordId === current.wordId).map(item => item.key));
      setSession({ ...session, queue: session.queue.filter(key => !removed.has(key)), history: [], total: Math.max(0, session.total - 1) });
      setRevealed(false); await refresh();
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  useEffect(()=>{
    function keydown(e:KeyboardEvent){if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||locked.current||!current)return;const target=e.target as HTMLElement;if(target.closest('input,textarea,select,button,a,[contenteditable="true"]'))return;
      if(e.code==='Space'){e.preventDefault();if(fresh)introduce();else setRevealed(true);}
      if(e.key==='Backspace'){e.preventDefault();undo();}
      if(revealed&&!fresh&&['1','2'].includes(e.key)){e.preventDefault();rate(e.key==='1'?'again':'good');}
    }window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
  },[current,fresh,revealed,introduce,rate,undo]);
  if(!storageReady)return <LoadGate><div className="en-loading">正在恢复练习…</div></LoadGate>;
  return <LoadGate>{data&&summary&&<div className="en-study">
    {!session ? <><Heading eyebrow="ONE SMALL SESSION" title="先从一小轮开始。" description="先回忆，再揭晓；不认识的词会再出现。"/><div className="en-panel"><div className="en-form-grid"><div className="en-field"><span>词表</span><ChoiceSelect label="选择词表" value={collection} options={[{value:'',label:'全部词汇'},{value:'unfiled',label:'未归类'},...data.collections.map(c=>({value:String(c.id),label:c.name})),{value:'recent',label:'最近加入'},{value:'difficult',label:'没记牢的'}]} onChange={value=>{const p=new URLSearchParams(signature);p.delete('resume');p.delete('ids');value?p.set('collection',value):p.delete('collection');router.replace(`/english/study?${p}`);}} /></div><div className="en-field"><span>类型</span><ChoiceSelect label="选择类型" value={mode} options={[{value:'all',label:'单词和短语'},{value:'word',label:'单词'},{value:'phrase',label:'短语'},{value:'confusion',label:'易混词'}]} onChange={value=>{const p=new URLSearchParams(signature);p.delete('resume');p.set('mode',value);router.replace(`/english/study?${p}`);}} /></div></div>
      <p className="en-muted my-5">{summary.total} 个词 · {summary.due} 个待复习 · {summary.fresh} 个未学</p>
      {summary.total>0?<><div className="en-field"><span>本轮数量</span><div className="en-toolbar !mb-0">{[5,10,20,50].map(n=><button key={n} className={`en-button en-button-small ${count===n?'en-primary':''}`} onClick={()=>setCount(n)}>{n}</button>)}</div></div><label className="flex gap-2 items-center text-sm text-[#728169] mt-5"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)} className="accent-[#446f49]"/>包括已认识的词</label><ErrorMessage message={error}/><button className="en-button en-primary w-full" onClick={()=>start()}>开始这一轮<ArrowRight size={17}/></button></>:<Empty title="这个范围还没有学习内容。" text={mode==='confusion'?'后台词库暂无易混资料。':'先添加词汇，或换一份词表。'} href={mode==='confusion'?'/english/collections':'/english/new'}/>}</div></> : session.queue.length===0 ? <div className="en-panel en-result"><span className="en-tag">这一轮完成了</span><h2>又把一批词，留在了记忆里。</h2><div className="en-result-number">{Object.keys(session.ratings).length}</div><p>个词汇 · {Object.values(session.ratings).filter(r=>r==='good').length} 个已认出 · {Object.values(session.ratings).filter(r=>r!=='good').length} 个还需巩固</p><p className="mt-4">进度已保存，后续复习会按你的作答安排。</p><ErrorMessage message={error}/><div className="en-actions"><Link href="/english" className="en-button en-primary">回到学习首页<Check size={16}/></Link><button className="en-button" onClick={()=>{setSession(null);refresh().catch(()=>{});}}>再来一轮</button>{Object.values(session.ratings).some(r=>r!=='good')&&<button className="en-button" onClick={()=>start(Object.entries(session.ratings).filter(([,r])=>r!=='good').map(([k])=>allItems.get(k)).filter((i):i is StudyItem=>!!i))}>只练没记牢的</button>}<button className="en-button" disabled={busy||!session.history.length} onClick={undo}>撤销最后一次</button></div></div> : !current ? <div className="en-empty"><h2>这个词条已经被移除。</h2><button className="en-button" onClick={()=>setSession({...session,queue:session.queue.slice(1)})}>继续其他词</button></div> : <>
      <div className="en-study-top"><Link href="/english" className="flex gap-2 items-center"><ArrowLeft size={16}/>稍后继续</Link><span>{session.title}</span><button className="en-icon-button" title="撤销上次作答" aria-label="撤销上次作答" disabled={busy||!session.history.length} onClick={undo}><RotateCcw size={17}/></button></div><div className="flex justify-between text-xs text-[#89967e]"><span>已练 {Object.keys(session.ratings).length} / {session.total}</span><span>{session.queue.length} 次待练{session.repeats[current.key]?' · 再巩固一次':''}</span></div><div className="en-progress"><div style={{width:`${Object.keys(session.ratings).length/session.total*100}%`}}/></div>
      <article className="en-flashcard" key={current.key}><div className="en-flash-top"><span className="en-tag">{labelForKind[current.kind]} · {fresh?'先认识它':memory?.seen?'再想一次':'试着回忆'}</span><div className="en-word-actions"><button className="en-icon-button" onClick={()=>speak(current.term)} aria-label="朗读词汇"><Volume2 size={19}/></button>{current.kind!=='confusion'&&<button className="en-icon-button en-danger-link" disabled={busy} onClick={removeCurrent} aria-label={`删除${current.term}`} title="从词库删除"><Trash2 size={17}/></button>}</div></div><h2>{current.term}</h2>{fresh||revealed?<div className="en-answer"><h3>{current.meaning}</h3>{current.example&&<p className="en-example">{current.example}</p>}{current.translation&&<p className="en-muted">{current.translation}</p>}{current.contrast&&<div className="en-contrast"><p>别和 <strong>{current.contrast.term}</strong> 弄混：{current.contrast.meaning}</p>{current.contrast.tip&&<p className="mt-2 text-[#839174]">{current.contrast.tip}</p>}</div>}{current.source&&<p className="en-muted mt-4">来自 {current.source}</p>}</div>:<p className="en-recall-hint">先在心里说出它的意思。</p>}
      {(revealed||fresh)&&current.kind!=='confusion'&&<MemoryDetails word={data.words.find(w=>w.id===current.wordId)} />}</article>
      <ErrorMessage message={error}/>{fresh?<button className="en-button en-primary w-full mt-5" onClick={introduce}>先记一下，稍后考我<ArrowRight size={17}/></button>:!revealed?<button className="en-button en-primary w-full mt-5 !min-h-14" onClick={()=>setRevealed(true)}>想好了，揭晓意思</button>:<div className="en-rating">{[{r:'again',l:'不认识'},{r:'good',l:'认识'}].map(({r,l})=><button key={r} disabled={busy} onClick={()=>rate(r as Rating)}><span>{busy?'保存中…':l}</span><small>{delayLabel(memory,r as Rating)}</small></button>)}</div>}<p className="en-shortcuts">空格 {fresh?'稍后测试':'揭晓'} · 1 不认识 · 2 认识 · Backspace 撤销</p>
    </>}
  </div>}</LoadGate>;
}
