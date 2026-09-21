import type { CollectionKind, ImportRow, MemoryState, Mode, Rating, StudyItem, Workspace } from './types';

export const EMPTY_MEMORY: MemoryState = {
  revision: 0, seen: 0, lapses: 0, intervalDays: 0,
  dueAt: null, lastReviewedAt: null, lastAdvancedAt: null, lastRating: null,
};
const DAY = 86_400_000;
const REVIEW_STEPS = [1, 3, 7] as const;

export function isUnlearned(state: MemoryState | undefined) {
  return !state || state.lastRating !== 'good';
}

// “认识”才进入 1、3、7 天复习链；“不认识”始终留在没学过。
export function schedule(previous: MemoryState | undefined, rating: Rating, now = new Date()): MemoryState {
  const p = previous ?? EMPTY_MEMORY;
  const time = now.getTime();
  if (rating === 'again') {
    return {
      revision: p.revision + 1,
      seen: p.seen + 1,
      lapses: p.lapses + 1,
      intervalDays: 0,
      dueAt: null,
      lastAdvancedAt: p.lastAdvancedAt,
      lastReviewedAt: now.toISOString(),
      lastRating: 'again',
    };
  }

  const canAdvance = !p.lastAdvancedAt || time - Date.parse(p.lastAdvancedAt) >= 20 * 3_600_000;
  let intervalDays = p.intervalDays;
  let dueAt = p.dueAt;
  let lastAdvancedAt = p.lastAdvancedAt;
  if (p.lastRating !== 'good' || intervalDays < 1) {
    intervalDays = REVIEW_STEPS[0];
    dueAt = new Date(time + intervalDays * DAY).toISOString();
    lastAdvancedAt = now.toISOString();
  } else if (canAdvance) {
    intervalDays = intervalDays < 3 ? REVIEW_STEPS[1] : REVIEW_STEPS[2];
    dueAt = new Date(time + intervalDays * DAY).toISOString();
    lastAdvancedAt = now.toISOString();
  } else if (!dueAt || Date.parse(dueAt) <= time) {
    dueAt = new Date(time + intervalDays * DAY).toISOString();
  }
  return {
    revision: p.revision + 1,
    seen: p.seen + 1,
    lapses: p.lapses,
    intervalDays,
    dueAt,
    lastAdvancedAt,
    lastReviewedAt: now.toISOString(),
    lastRating: 'good',
  };
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function confusionItems(data: Workspace): StudyItem[] {
  const wordsByTerm = new Map(data.words.map(word => [normalizeTerm(word.word), word]));
  const groups = new Map<string, { tip: string; entries: Map<string, { term: string; meaning: string }>; wordIds: Set<number> }>();

  for (const pair of data.confusions) {
    const original = data.words.find(word => word.id === pair.wordId);
    if (!original) continue;
    const tip = pair.tip.trim();
    const groupKey = tip ? `tip:${tip}` : `pair:${pair.id}`;
    const group = groups.get(groupKey) ?? { tip, entries: new Map(), wordIds: new Set<number>() };
    group.entries.set(normalizeTerm(original.word), { term: original.word, meaning: original.meaning });
    group.entries.set(normalizeTerm(pair.otherWord), { term: pair.otherWord, meaning: pair.otherMeaning });
    group.wordIds.add(original.id);
    const other = wordsByTerm.get(normalizeTerm(pair.otherWord));
    if (other) group.wordIds.add(other.id);
    groups.set(groupKey, group);
  }

  return [...groups.values()].map(group => {
    const entries = [...group.entries.values()];
    const identity = entries.map(entry => normalizeTerm(entry.term)).sort().join('|');
    const wordIds = [...group.wordIds];
    return {
      key: `confusion-group:${stableHash(identity + '|' + group.tip)}`,
      wordId: wordIds[0],
      wordIds,
      kind: 'confusion',
      term: entries.map(entry => entry.term).join(' / '),
      meaning: entries.map(entry => entry.meaning).join('；'),
      entries,
      tip: visibleTip(group.tip),
    };
  });
}

export function catalog(data: Workspace): StudyItem[] {
  const vocabulary: StudyItem[] = data.words.map(word => ({
    key: `word:${word.id}`,
    wordId: word.id,
    wordIds: [word.id],
    kind: word.kind,
    term: word.word,
    meaning: word.meaning,
    example: word.senses?.[0]?.example || undefined,
    translation: word.senses?.[0]?.translation || undefined,
  }));
  return [...vocabulary, ...confusionItems(data)];
}

function itemMatchesIds(item: StudyItem, allowed: Set<number>) {
  return (item.wordIds ?? [item.wordId]).some(id => allowed.has(id));
}

function collectionKindForMode(mode: Mode): CollectionKind | null {
  return mode === 'all' ? null : mode;
}

export function scopeItems(data: Workspace, mode: Mode = 'word', collection = '', ids?: number[]): StudyItem[] {
  const list = data.collections.find(item => String(item.id) === collection);
  const expectedKind = collectionKindForMode(mode);
  if (list && expectedKind && list.kind !== expectedKind) return [];
  if (collection && !list && !['recent', 'difficult', 'unfiled'].includes(collection)) return [];

  let allowed = ids ? new Set(ids) : list ? new Set(list.wordIds) : null;
  if (collection === 'unfiled') {
    const relevantKinds = mode === 'all' ? ['word', 'phrase'] : [mode];
    const filed = new Set(data.collections.filter(item => relevantKinds.includes(item.kind)).flatMap(item => item.wordIds));
    allowed = new Set(data.words.filter(word => !filed.has(word.id)).map(word => word.id));
  }
  if (collection === 'recent') {
    const relevant = data.words.filter(word => mode === 'all' ? true : mode === 'confusion' ? word.kind === 'word' : word.kind === mode);
    allowed = new Set([...relevant].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 30).map(word => word.id));
  }

  return catalog(data).filter(item => {
    if (mode === 'all' ? item.kind === 'confusion' : item.kind !== mode) return false;
    if (allowed && !itemMatchesIds(item, allowed)) return false;
    if (collection === 'difficult' && data.memory[item.key]?.lastRating === 'good') return false;
    return true;
  });
}

export function chooseRound(items: StudyItem[], memory: Workspace['memory'], count: number, all = false, now = Date.now()): StudyItem[] {
  const due = items.filter(item => memory[item.key]?.lastRating === 'good' && Date.parse(memory[item.key].dueAt || '') <= now)
    .sort((a, b) => (memory[a.key].dueAt || '').localeCompare(memory[b.key].dueAt || ''));
  const fresh = items.filter(item => isUnlearned(memory[item.key]));
  const future = items.filter(item => memory[item.key]?.lastRating === 'good' && Date.parse(memory[item.key].dueAt || '') > now)
    .sort((a, b) => (memory[a.key].dueAt || '').localeCompare(memory[b.key].dueAt || ''));
  return [...due, ...fresh, ...(all ? future : [])].slice(0, Math.max(1, Math.min(100, count)));
}

export function stats(items: StudyItem[], memory: Workspace['memory'], now = Date.now()) {
  return {
    total: items.length,
    fresh: items.filter(item => isUnlearned(memory[item.key])).length,
    due: items.filter(item => memory[item.key]?.lastRating === 'good' && Date.parse(memory[item.key].dueAt || '') <= now).length,
    familiar: items.filter(item => memory[item.key]?.intervalDays >= 7 && memory[item.key]?.lastRating === 'good').length,
  };
}

export function visibleTip(tip: string | null | undefined) {
  return (tip || '')
    .replace(/第\s*\d+\s*题(?:考点|题干出现)?[：:]?/gi, '')
    .replace(/试卷第?\s*\d+\s*(?:页|题|左|右)/gi, '')
    .replace(/P\s*\d+\s*(?:页|左|右)?/gi, '')
    .replace(/([：:])\s*[，,]/g, '$1')
    .replace(/[：:]\s*[：:]/g, '：')
    .replace(/^[，,；;：:\s]+|[，,；;：:\s]+$/g, '')
    .trim();
}
export function visibleNote(note: string | null | undefined) {
  return (note || '').split(/\r?\n/)
    .filter(line => line.trim() && !/^导入材料[:：]/.test(line.trim()) && !/^原材料标记[:：]/.test(line.trim()) && !/第\s*\d+\s*题|题干出现|试卷第|P\s*\d+\s*(页|左|右)/i.test(line))
    .join('\n');
}

export function normalizeTerm(term: string) { return term.trim().replace(/\s+/g, ' ').toLowerCase(); }

// One expression per line. Commas belong to meanings, not entry separators.
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