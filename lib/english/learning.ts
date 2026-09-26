import type { ConfusionGroup, ImportRow, MemoryState, Mode, Rating, StudyItem, Workspace } from './types';

export const EMPTY_MEMORY: MemoryState = { revision: 0, seen: 0, lapses: 0, intervalDays: 0, dueAt: null, lastReviewedAt: null, lastAdvancedAt: null, lastRating: null };
const DAY = 86_400_000;
export function isUnlearned(state: MemoryState | undefined) { return !state || state.lastRating !== 'good'; }
export function schedule(previous: MemoryState | undefined, rating: Rating, now = new Date()): MemoryState {
  const p = previous ?? EMPTY_MEMORY;
  const time = now.getTime();
  if (rating === 'again') return { revision: p.revision + 1, seen: p.seen + 1, lapses: p.lapses + 1, intervalDays: 0, dueAt: null, lastAdvancedAt: p.lastAdvancedAt, lastReviewedAt: now.toISOString(), lastRating: 'again' };
  const canAdvance = !p.lastAdvancedAt || time - Date.parse(p.lastAdvancedAt) >= 20 * 3_600_000;
  let intervalDays = p.intervalDays, dueAt = p.dueAt, lastAdvancedAt = p.lastAdvancedAt;
  if (p.lastRating !== 'good' || intervalDays < 1) {
    intervalDays = 1; dueAt = new Date(time + DAY).toISOString(); lastAdvancedAt = now.toISOString();
  } else if (canAdvance) {
    intervalDays = intervalDays < 3 ? 3 : 7;
    dueAt = new Date(time + intervalDays * DAY).toISOString(); lastAdvancedAt = now.toISOString();
  } else if (!dueAt || Date.parse(dueAt) <= time) dueAt = new Date(time + intervalDays * DAY).toISOString();
  return { revision: p.revision + 1, seen: p.seen + 1, lapses: p.lapses, intervalDays, dueAt, lastAdvancedAt, lastReviewedAt: now.toISOString(), lastRating: 'good' };
}
export function normalizeTerm(term: string) { return term.trim().replace(/\s+/g, ' ').toLowerCase(); }

export function confusionGroups(data: Workspace): ConfusionGroup[] {
  const byId = new Map(data.words.map(word => [word.id, word]));
  const byTerm = new Map(data.words.map(word => [normalizeTerm(word.word), word]));
  const groups = new Map<string, { tip: string; ids: Set<number> }>();
  for (const pair of data.confusions) {
    const anchor = byId.get(pair.wordId);
    const other = byTerm.get(normalizeTerm(pair.otherWord));
    if (!anchor || !other || anchor.kind !== 'word' || other.kind !== 'word') continue;
    const key = pair.groupKey || 'legacy:' + pair.wordId + ':' + (pair.tip || pair.id);
    const group = groups.get(key) ?? { tip: pair.tip, ids: new Set<number>() };
    group.ids.add(anchor.id); group.ids.add(other.id); groups.set(key, group);
  }
  return [...groups.entries()].map(([key, group]) => {
    const entries: StudyItem[] = [...group.ids].map(id => byId.get(id)!).filter(word => !word.excluded)
      .map(word => ({ key: 'word:' + word.id, wordId: word.id, kind: 'confusion' as const,
        term: word.word, meaning: word.meaning, example: word.senses?.[0]?.example || undefined,
        translation: word.senses?.[0]?.translation || undefined, groupKey: key, tip: visibleTip(group.tip) }));
    return { key, name: entries.map(item => item.term).join(' / '), tip: visibleTip(group.tip), entries, wordIds: entries.map(item => item.wordId) };
  }).filter(group => group.entries.length > 0);
}

export function catalog(data: Workspace): StudyItem[] {
  const unique = new Map<string, StudyItem>();
  for (const group of confusionGroups(data)) for (const item of group.entries) if (!unique.has(item.key)) unique.set(item.key, item);
  for (const word of data.words) {
    if (word.kind !== 'phrase' || word.excluded) continue;
    unique.set('word:' + word.id, { key: 'word:' + word.id, wordId: word.id, kind: 'phrase',
      term: word.word, meaning: word.meaning, example: word.senses?.[0]?.example || undefined,
      translation: word.senses?.[0]?.translation || undefined });
  }
  return [...unique.values()];
}

export function scopeItems(data: Workspace, mode: Mode = 'confusion', collection = '', ids?: number[]): StudyItem[] {
  const list = data.collections.find(item => String(item.id) === collection);
  if (list && mode !== 'all' && list.kind !== mode) return [];
  if (collection && !list && !['recent', 'difficult', 'unfiled'].includes(collection)) return [];
  let allowed = ids ? new Set(ids) : list ? new Set(list.wordIds) : null;
  if (collection === 'unfiled') {
    const filed = new Set(data.collections.filter(item => mode === 'all' || item.kind === mode).flatMap(item => item.wordIds));
    allowed = new Set(data.words.filter(word => !filed.has(word.id)).map(word => word.id));
  }
  if (collection === 'recent') allowed = new Set([...data.words].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0,30).map(word => word.id));
  const scoped = catalog(data).filter(item => {
    if (mode !== 'all' && item.kind !== mode) return false;
    if (allowed && !allowed.has(item.wordId)) return false;
    if (collection === 'difficult' && data.memory[item.key]?.lastRating === 'good') return false;
    return true;
  });
  if (mode !== 'confusion' || !allowed) return scoped;
  const groups = confusionGroups(data);
  return scoped.map(item => {
    const group = groups.find(candidate => candidate.wordIds.includes(item.wordId) && candidate.wordIds.every(id => allowed.has(id)));
    return group ? { ...item, groupKey: group.key, tip: group.tip } : item;
  });
}

export function chooseRound(items: StudyItem[], memory: Workspace['memory'], count: number, all = false, now = Date.now(), focus: 'mixed' | 'review' | 'learn' = 'mixed'): StudyItem[] {
  const due = items.filter(item => memory[item.key]?.lastRating === 'good' && Date.parse(memory[item.key].dueAt || '') <= now).sort((a,b) => (memory[a.key].dueAt || '').localeCompare(memory[b.key].dueAt || ''));
  const fresh = items.filter(item => isUnlearned(memory[item.key]));
  const future = items.filter(item => memory[item.key]?.lastRating === 'good' && Date.parse(memory[item.key].dueAt || '') > now).sort((a,b) => (memory[a.key].dueAt || '').localeCompare(memory[b.key].dueAt || ''));
  const pool = focus === 'review' ? due : focus === 'learn' ? fresh : [...due, ...fresh, ...(all ? future : [])];
  const size = Math.max(1, Math.min(100, count));
  const chosen: StudyItem[] = [];
  const remaining = [...pool];
  while (remaining.length && chosen.length < size) {
    const first = remaining.shift()!;
    chosen.push(first);
    if (first.kind !== 'confusion') continue;
    for (let i = 0; i < remaining.length && chosen.length < size && chosen.length % 4 !== 0;) {
      if (remaining[i].groupKey === first.groupKey) chosen.push(remaining.splice(i,1)[0]);
      else i++;
    }
  }
  return chosen;
}
export function stats(items: StudyItem[], memory: Workspace['memory'], now = Date.now()) {
  return { total: items.length, fresh: items.filter(item => isUnlearned(memory[item.key])).length,
    due: items.filter(item => memory[item.key]?.lastRating === 'good' && Date.parse(memory[item.key].dueAt || '') <= now).length,
    familiar: items.filter(item => memory[item.key]?.intervalDays >= 7 && memory[item.key]?.lastRating === 'good').length };
}
export function visibleTip(tip: string | null | undefined) {
  return (tip || '').replace(/第\s*\d+\s*题(?:考点|题干出现)?[：:]?/gi, '').replace(/试卷第?\s*\d+\s*(?:页|题|左|右)/gi, '')
    .replace(/P\s*\d+\s*(?:页|左|右)?/gi, '').replace(/([：:])\s*[，,]/g, '$1').replace(/[：:]\s*[：:]/g, '：')
    .replace(/^[，,；;：:\s]+|[，,；;：:\s]+$/g, '').trim();
}
export function visibleNote(note: string | null | undefined) {
  return (note || '').split(/\r?\n/).filter(line => line.trim() && !/^导入材料[:：]/.test(line.trim()) && !/^原材料标记[:：]/.test(line.trim()) && !/第\s*\d+\s*题|题干出现|试卷第|P\s*\d+\s*(页|左|右)/i.test(line)).join('\n');
}
export function parseImport(text: string, defaultKind: 'auto' | 'word' | 'phrase' = 'auto'): ImportRow[] {
  const rows = new Map<string, ImportRow>();
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const parts = raw.split(/\t|\s*[|｜]\s*/);
    const word = normalizeTerm(parts[0]);
    if (!word || word.length > 120) throw new Error('每个词或短语需为 1–120 个字符。');
    rows.set(word, { word, meaning: parts[1]?.trim() || '', example: parts[2]?.trim() || '',
      kind: defaultKind === 'auto' ? (/\s/.test(word) ? 'phrase' : 'word') : defaultKind });
  }
  if (rows.size > 200) throw new Error('一次最多导入 200 条，请分批添加。');
  return [...rows.values()];
}
