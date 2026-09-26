import { sql } from '@/lib/db';
import { catalog, chooseRound, confusionGroups, practiceBatch, scopeItems, stats } from './learning';
import { RequestError, review, stringValue, workspace } from './server';
import type { CollectionKind, Rating, StudyItem, Workspace } from './types';

type BotSession = {
  queue: string[];
  introduced?: string[];
  ratings: Record<string, Rating>;
  repeats: Record<string, number>;
  total: number;
  title: string;
  revealed: boolean;
  replies: Record<string, string>;
};
const HELP = '微信小复习\n\n/vocab 开始 5：学易混词\n/vocab 短语 5：学短语\n/vocab 词表：查看两类词表\n/vocab 词表编号 1 5：练指定词表\n/vocab 答案：揭晓\n/vocab 1 / 2：这一组都不认识 / 都认识\n/vocab 继续：恢复';

function describe(state: BotSession, items: Map<string, StudyItem>, groups: Map<string, ReturnType<typeof confusionGroups>[number]>): string {
  const batch = practiceBatch(state.queue, items).map(key => items.get(key)!).filter(Boolean);
  if (!batch.length) return '这一轮完成：' + Object.values(state.ratings).filter(value => value === 'good').length + '/' + state.total + ' 项认识。进度已同步。';
  const heading = state.title + ' · ' + Object.keys(state.ratings).length + '/' + state.total;
  const rows = batch.map(item => state.revealed ? item.term + '｜' + item.meaning : item.term).join('\n');
  const group = batch[0].kind === 'confusion' ? groups.get(batch[0].groupKey || '') : undefined;
  return heading + ' · 本组 ' + batch.length + ' 项\n\n' + rows +
    (state.revealed && group?.tip ? '\n\n辨析：' + group.tip : '') +
    (state.revealed ? '\n\n回复 /vocab 1（都不认识）或 2（都认识）。' : '\n\n先逐项回忆中文，再回复 /vocab 答案。');
}

export async function botCommand(input: Record<string, unknown>) {
  const peer = stringValue(input.peer, '会话', 200);
  const requestId = stringValue(input.requestId, '消息编号', 120);
  const action = String(input.action || 'help');
  if (action === 'help') return { text: HELP };

  const data = await workspace();
  if (action === 'lists') {
    return {
      text: data.collections.filter(item => item.kind !== 'word').length
        ? data.collections.filter(item => item.kind !== 'word').map(collection => `${collection.id}. [${collection.kind === 'word' ? '单词' : collection.kind === 'phrase' ? '短语' : '易混词'}] ${collection.name}（${collection.wordIds.length} 项）`).join('\n') + '\n\n例如 /vocab 词表编号 ' + data.collections.find(item => item.kind !== 'word')!.id + ' 5'
        : '还没有词表。请先在网站建立词表。',
    };
  }
  if (action === 'status') {
    const summaries = (['confusion', 'phrase'] as CollectionKind[]).map(kind => stats(scopeItems(data, kind), data.memory));
    return {
      text: `词库 ${summaries.reduce((sum, item) => sum + item.total, 0)} 项 · 到期复习 ${summaries.reduce((sum, item) => sum + item.due, 0)} 项 · 没学过 ${summaries.reduce((sum, item) => sum + item.fresh, 0)} 项\n回复 /vocab 开始 5，开始一小轮。`,
    };
  }

  const [row] = await sql.query('SELECT state,revision FROM "EnglishBotSessions" WHERE peer=$1', [peer]);
  let state = row?.state as BotSession | undefined;
  if (state?.replies?.[requestId]) return { text: state.replies[requestId] };

  const items = new Map(catalog(data).map(item => [item.key, item]));
  const groups = new Map(confusionGroups(data).map(group => [group.key, group]));
  if (action === 'start') {
    const collection = input.collection ? String(input.collection) : '';
    const requestedList = data.collections.find(item => String(item.id) === collection);
    const mode = (requestedList?.kind === 'phrase' || input.mode === 'phrase' ? 'phrase' : 'confusion') as CollectionKind;
    const chosen = chooseRound(scopeItems(data, mode, collection), data.memory, Math.min(20, Math.max(1, Number(input.count) || 5)), false);
    if (!chosen.length) return { text: '这个范围还没有内容。请先在网站添加对应类别的词表。' };
    state = {
      queue: chosen.map(item => item.key),
      ratings: {},
      repeats: {},
      total: chosen.length,
      title: data.collections.find(item => String(item.id) === collection)?.name || (mode === 'phrase' ? '短语' : mode === 'confusion' ? '易混词' : '单词'),
      revealed: false,
      replies: state?.replies || {},
    };
  } else {
    if (!state) return { text: HELP };
    state = { ...state, queue: state.queue.filter(key => items.has(key)) };
    const batch = practiceBatch(state.queue, items);
    if (action === 'reveal' || action === 'next') {
      state.revealed = true;
    } else if (action === 'rate') {
      if (!batch.length) return { text: describe(state, items, groups) };
      if (!state.revealed) return { text: '先揭晓答案，再评价是否认识。\n\n' + describe(state, items, groups) };
      const rating = input.rating as Rating;
      if (rating !== 'again' && rating !== 'good') throw new RequestError('请选择认识或不认识。');
      for (let index = 0; index < batch.length; index++) {
        const key = batch[index];
        const result = await review({ eventId: 'bot:' + requestId + ':' + index, key, rating, revision: data.memory[key]?.revision || 0 }, 'wechat');
        data.memory[key] = result.state;
      }
      state.ratings = { ...state.ratings, ...Object.fromEntries(batch.map(key => [key, rating])) };
      state.queue = state.queue.filter(key => !batch.includes(key));
      if (rating === 'again') for (const key of batch) if ((state.repeats[key] || 0) < 1) {
        state.repeats = { ...state.repeats, [key]: 1 };
        state.queue.push(key);
      }
      state.revealed = false;
    } else if (action !== 'continue') {
      throw new RequestError('无法识别复习操作。');
    }
  }

  const text = describe(state, items, groups);
  state.replies = Object.fromEntries([...Object.entries(state.replies).slice(-19), [requestId, text]]);
  const changed = await sql.query(`INSERT INTO "EnglishBotSessions" (peer,state,revision) VALUES ($1,$2::jsonb,1)
    ON CONFLICT (peer) DO UPDATE SET state=EXCLUDED.state,revision="EnglishBotSessions".revision+1,updated_at=now()
    WHERE "EnglishBotSessions".revision=$3 RETURNING peer`, [peer, JSON.stringify(state), row?.revision || 0]);
  if (!changed.length) throw new RequestError('另一条消息正在更新练习，请稍后重试。', 409);
  return { text };
}
