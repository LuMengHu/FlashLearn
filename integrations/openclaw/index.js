import { randomUUID } from 'node:crypto';

// The Tencent channel plugin owns iLink login, polling and delivery.
// This plugin only calls FlashLearn, and never has direct database credentials.
export function parseCommand(args = '') {
  const parts=args.trim().split(/\s+/);const command=parts[0]||'继续';
  if(['帮助','help'].includes(command))return {action:'help'};
  if(['词表','清单','lists'].includes(command))return {action:'lists'};
  if(['状态','status'].includes(command))return {action:'status'};
  if(['答案','揭晓','reveal'].includes(command))return {action:'reveal'};
  if(['下一题','next'].includes(command))return {action:'next'};
  if(['继续','continue'].includes(command))return {action:'continue'};
  if(['1','不会','again'].includes(command))return {action:'rate',rating:'again'};
  if(['2','认识','good'].includes(command))return {action:'rate',rating:'good'};
  if(['开始','start','单词','短语','易混'].includes(command))return {action:'start',mode:command==='短语'?'phrase':'confusion',count:Number(parts[1])||5};
  if(/^\d+$/.test(command)&&Number(command)>3)return {action:'start',collection:command,count:Number(parts[1])||5};
  if(['清单编号','词表编号'].includes(command)&&/^\d+$/.test(parts[1]))return {action:'start',collection:parts[1],count:Number(parts[2])||5};
  return {action:'help'};
}

export default {
  id:'flashlearn-study',name:'FlashLearn personal vocabulary',
  register(api) {
    const queues=new Map();
    const run=async(peer,command,requestId)=>{
      const config=api.pluginConfig||{};
      if(config.allowedSender&&config.allowedSender!==peer)throw new Error('这个学习连接只供本人使用。');
      if(!config.token)throw new Error('FlashLearn 尚未配置学习连接密钥。');
      const previous=queues.get(peer)||Promise.resolve();
      const job=previous.catch(()=>{}).then(async()=>{
        const response=await fetch((config.baseUrl||'http://127.0.0.1:3000').replace(/\/$/,'')+'/api/english/bot',{
          method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.token}`},
          body:JSON.stringify({...command,peer,requestId}),signal:AbortSignal.timeout(30000),
        });
        const data=await response.json();if(!response.ok)throw new Error(data.error||'连接失败');return data.text;
      });
      queues.set(peer,job);try{return await job;}finally{if(queues.get(peer)===job)queues.delete(peer);}
    };
    api.registerCommand({name:'vocab',description:'FlashLearn 易混词与短语：易混 5 / 短语 5 / 答案 / 1 / 2 / 词表',acceptsArgs:true,requireAuth:true,
      handler:async(ctx)=>{
        try{return {text:await run(ctx.senderId||'owner',parseCommand(ctx.args),randomUUID())};}
        catch(e){return {text:`FlashLearn：${e.message}`};}
      },
    });
    api.registerTool(context=>({
      name:'flashlearn_vocab',
      description:'Use the user’s FlashLearn vocabulary and shared memory in WeChat. Actions: start (default 5 items), reveal, next, rate (again/good after explicit self-assessment), continue, lists, status, help. Relay returned text faithfully. Never invent a question, definition or progress. For a free-text meaning answer, reveal the canonical answer and ask the user to self-assess; do not guess a rating. Use lists to resolve collection ids. Short replies 1/2 mean again/good during a review.',
      parameters:{type:'object',properties:{action:{type:'string',enum:['start','reveal','next','rate','continue','lists','status','help']},rating:{type:'string',enum:['again','good']},mode:{type:'string',enum:['phrase','confusion']},collection:{type:'string'},count:{type:'integer',minimum:1,maximum:20}},required:['action'],additionalProperties:false},
      async execute(id,params){const text=await run(context.requesterSenderId||'owner',params,id);return {content:[{type:'text',text}]};},
    }));
  },
};
