import { sql } from '@/lib/db';
import { catalog, chooseRound, scopeItems, stats } from './learning';
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
const HELP = '微信小复习\n\n/vocab 开始 5：练 5 个单词\n/vocab 短语 5：练短语\n/vocab 易混 5：练易混词\n/vocab 词表：列出三类词表\n/vocab 词表编号 1 5：练指定词表\n/vocab 答案：揭晓答案\n/vocab 1 / 2：不认识 / 认识\n/vocab 继续：恢复上次练习';

function describe(state: BotSession, items: Map<string, StudyItem>): string {
  const item = items.get(state.queue[0]);
  if (!item) {
    return `这一轮完成了。\n${state.total} 项内容，${Object.values(state.ratings).filter(rating => rating === 'good').length} 项认识。\n进度已与网站同步。\n再来一轮：/vocab 开始 5`;
  }
  const heading = `${state.title} · 已练 ${Object.keys(state.ratings).length}/${state.total}`;
  if (item.kind === 'confusion') {
    const rows = (item.entries || []).map(entry => state.revealed ? `${entry.term}｜${entry.meaning}` : entry.term).join('\n');
    return state.revealed
      ? `${heading}\n\n${rows}${item.tip ? `\n\n${item.tip}` : ''}\n\n回复 /vocab 1（不认识）或 2（认识）。`
      : `${heading}\n\n${rows}\n\n逐个回忆中文意思，再回复 /vocab 答案。`;
  }
  return state.revealed
    ? `${heading}\n\n${item.term}\n${item.meaning}${item.example ? `\n\n${item.example}` : ''}\n\n回复 /vocab 1（不认识）或 2（认识）。`
    : `${heading}\n\n${item.term}\n\n先在心里想出意思，再回复 /vocab 答案。`;
}

export async function botCommand(input: Record<string, unknown>) {
  const peer = stringValue(input.peer, '会话', 200);
  const requestId = stringValue(input.requestId, '消息编号', 120);
  const action = String(input.action || 'help');
  if (action === 'help') return { text: HELP };

  const data = await workspace();
  if (action === 'lists') {
    return {
      text: data.collections.length
        ? data.collections.map(collection => `${collection.id}. [${collection.kind === 'word' ? '单词' : collection.kind === 'phrase' ? '短语' : '易混词'}] ${collection.name}（${collection.wordIds.length} 项）`).join('\n') + '\n\n例如 /vocab 词表编号 1 5'
        : '还没有词表。请先在网站建立词表。',
    };
  }
  if (action === 'status') {
    const summaries = (['word', 'confusion', 'phrase'] as CollectionKind[]).map(kind => stats(scopeItems(data, kind), data.memory));
    return {
      text: `词库 ${summaries.reduce((sum, item) => sum + item.total, 0)} 项 · 到期复习 ${summaries.reduce((sum, item) => sum + item.due, 0)} 项 · 没学过 ${summaries.reduce((sum, item) => sum + item.fresh, 0)} 项\n回复 /vocab 开始 5，开始一小轮。`,
    };
  }

  const [row] = await sql.query('SELECT state,revision FROM "EnglishBotSessions" WHERE peer=$1', [peer]);
  let state = row?.state as BotSession | undefined;
  if (state?.replies?.[requestId]) return { text: state.replies[requestId] };

  const items = new Map(catalog(data).map(item => [item.key, item]));
  if (action === 'start') {
    const mode = (['word', 'phrase', 'confusion'].includes(String(input.mode)) ? input.mode : 'word') as CollectionKind;
    const collection = input.collection ? String(input.collection) : '';
    const chosen = chooseRound(scopeItems(data, mode, collection), data.memory, Math.min(20, Math.max(1, Number(input.count) || 5)), true);
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
    const key = state.queue[0];
    if (action === 'reveal' || action === 'next') {
      state.revealed = true;
    } else if (action === 'rate') {
      if (!key) return { text: describe(state, items) };
      if (!state.revealed) return { text: '先揭晓答案，再评价是否认识。\n\n' + describe(state, items) };
      const rating = input.rating as Rating;
      if (rating !== 'again' && rating !== 'good') throw new RequestError('请选择认识或不认识。');
      const result = await review({ eventId: `bot:${requestId}`, key, rating, revision: data.memory[key]?.revision || 0 }, 'wechat');
      data.memory[key] = result.state;
      state.ratings = { ...state.ratings, [key]: rating };
      state.queue = state.queue.slice(1);
      if (rating === 'again' && (state.repeats[key] || 0) < 2) {
        state.repeats = { ...state.repeats, [key]: (state.repeats[key] || 0) + 1 };
        state.queue.splice(Math.min(3, state.queue.length), 0, key);
      }
      state.revealed = false;
    } else if (action !== 'continue') {
      throw new RequestError('无法识别复习操作。');
    }
  }

  const text = describe(state, items);
  state.replies = Object.fromEntries([...Object.entries(state.replies).slice(-19), [requestId, text]]);
  const changed = await sql.query(`INSERT INTO "EnglishBotSessions" (peer,state,revision) VALUES ($1,$2::jsonb,1)
    ON CONFLICT (peer) DO UPDATE SET state=EXCLUDED.state,revision="EnglishBotSessions".revision+1,updated_at=now()
    WHERE "EnglishBotSessions".revision=$3 RETURNING peer`, [peer, JSON.stringify(state), row?.revision || 0]);
  if (!changed.length) throw new RequestError('另一条消息正在更新练习，请稍后重试。', 409);
  return { text };
}