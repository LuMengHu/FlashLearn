import { sql } from '@/lib/db';
import { catalog, chooseRound, scopeItems, stats } from './learning';
import { RequestError, review, stringValue, workspace } from './server';
import type { Mode, Rating, StudyItem, Workspace } from './types';

type BotSession = {
  queue: string[]; introduced: string[]; ratings: Record<string,Rating>; repeats: Record<string,number>;
  total: number; title: string; revealed: boolean; replies: Record<string,string>;
};
const HELP = '微信小复习\n\n/vocab 开始 5：练 5 个词\n/vocab 短语 5：练短语\n/vocab 易混 5：练易混词\n/vocab 词表：列出词表\n/vocab 词表编号 1 5：练 1 号词表中的 5 个词\n/vocab 下一题：继续新词学习\n/vocab 答案：揭晓意思\n/vocab 1 / 2：不认识 / 认识\n/vocab 继续：恢复上次练习\n\n也可以直接告诉 OpenClaw「用 FlashLearn 复习 5 个词」。';
function describe(state: BotSession, items: Map<string,StudyItem>, data: Workspace): string {
  const item=items.get(state.queue[0]);
  if(!item)return `这一轮完成了。\n${state.total} 个词汇，${Object.values(state.ratings).filter(r=>r==='good').length} 个已认出。\n进度已与网站同步。\n再来一轮：/vocab 开始 5`;
  const fresh=!data.memory[item.key]?.seen&&!state.introduced.includes(item.key);
  const heading=`${state.title} · 已练 ${Object.keys(state.ratings).length}/${state.total}\n\n${item.term}`;
  if(fresh||state.revealed){
    const contrast=item.contrast?`\n\n别认成 ${item.contrast.term}：${item.contrast.meaning}${item.contrast.tip?'\n'+item.contrast.tip:''}`:'';
    return `${heading}\n${item.meaning}${item.example?'\n\n'+item.example:''}${contrast}\n\n${fresh?'新词先认识一下。回复 /vocab 下一题，稍后会再考你。':'回想刚才的答案，回复 /vocab 1（不认识）或 2（认识）。'}`;
  }
  return `${heading}\n\n先在心里想出意思，再回复 /vocab 答案。`;
}
export async function botCommand(input: Record<string,unknown>) {
  const peer=stringValue(input.peer,'会话',200);
  const requestId=stringValue(input.requestId,'消息编号',120);
  const action=String(input.action||'help');
  if(action==='help')return {text:HELP};
  const data=await workspace();
  if(action==='lists')return {text:data.collections.length?data.collections.map(c=>`${c.id}. ${c.name}（${c.wordIds.length} 个）`).join('\n')+'\n\n例如 /vocab 词表编号 1 5：复习 1 号词表中的 5 个词。':'还没有词表。在网站导入一批词，会自动生成。'};
  if(action==='status'){const s=stats(scopeItems(data),data.memory);return {text:`词库 ${s.total} 个 · 待复习 ${s.due} 个 · 未学 ${s.fresh} 个\n回复 /vocab 开始 5，开始一小轮。`};}
  const [row]=await sql.query('SELECT state,revision FROM "EnglishBotSessions" WHERE peer=$1',[peer]);
  let state=row?.state as BotSession|undefined;
  if(state?.replies?.[requestId])return {text:state.replies[requestId]};
  const items=new Map(catalog(data).map(i=>[i.key,i]));
  if(action==='start'){
    const mode=(['all','word','phrase','confusion'].includes(String(input.mode))?input.mode:'all') as Mode;
    const collection=input.collection?String(input.collection):'';
    const chosen=chooseRound(scopeItems(data,mode,collection),data.memory,Math.min(20,Math.max(1,Number(input.count)||5)),true);
    if(!chosen.length)return {text:'这个范围还没有词汇。先在网站添加词汇或易混词，再回来开始。'};
    state={queue:chosen.map(i=>i.key),introduced:[],ratings:{},repeats:{},total:chosen.length,
      title:data.collections.find(c=>String(c.id)===collection)?.name||(mode==='phrase'?'短语积累':mode==='confusion'?'易混词辨认':'词汇小复习'),revealed:false,replies:state?.replies||{}};
  }else{
    if(!state)return {text:HELP};
    state={...state,queue:state.queue.filter(key=>items.has(key))};
    const key=state.queue[0];
    const fresh=key&&!data.memory[key]?.seen&&!state.introduced.includes(key);
    if(action==='reveal')state.revealed=true;
    else if(action==='next'){
      if(fresh){state.introduced=[...state.introduced,key];state.queue=state.queue.slice(1);state.queue.splice(Math.min(3,state.queue.length),0,key);state.revealed=false;}
    }else if(action==='rate'){
      if(!key)return {text:describe(state,items,data)};
      if(fresh||!state.revealed)return {text:'先回忆并揭晓答案，再评价是否记住。\n\n'+describe(state,items,data)};
      const rating=input.rating as Rating;
      if(rating!=='again'&&rating!=='good')throw new RequestError('请选择认识或不认识。');
      const result=await review({eventId:`bot:${requestId}`,key,rating,revision:data.memory[key]?.revision||0},'wechat');
      data.memory[key]=result.state;state.ratings={...state.ratings,[key]:rating};state.queue=state.queue.slice(1);
      if(rating==='again'&&(state.repeats[key]||0)<2){state.repeats={...state.repeats,[key]:(state.repeats[key]||0)+1};state.queue.splice(Math.min(3,state.queue.length),0,key);}
      state.revealed=false;
    }else if(action!=='continue')throw new RequestError('无法识别复习操作。');
  }
  const text=describe(state,items,data);
  state.replies=Object.fromEntries([...Object.entries(state.replies).slice(-19),[requestId,text]]);
  const changed=await sql.query(`INSERT INTO "EnglishBotSessions" (peer,state,revision) VALUES ($1,$2::jsonb,1)
    ON CONFLICT (peer) DO UPDATE SET state=EXCLUDED.state,revision="EnglishBotSessions".revision+1,updated_at=now()
    WHERE "EnglishBotSessions".revision=$3 RETURNING peer`,[peer,JSON.stringify(state),row?.revision||0]);
  if(!changed.length)throw new RequestError('另一条消息正在更新练习，请稍后重试。',409);
  return {text};
}
