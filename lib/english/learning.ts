import type { ImportRow, MemoryState, Mode, Rating, StudyItem, Workspace } from './types';

export const EMPTY_MEMORY: MemoryState = {
  revision: 0, seen: 0, lapses: 0, intervalDays: 0,
  dueAt: null, lastReviewedAt: null, lastAdvancedAt: null, lastRating: null,
};
const DAY = 86_400_000;

// A transparent spacing policy, not a claim of an individually optimal memory model.
// Early same-day practice cannot repeatedly multiply a long-term interval.
export function schedule(previous: MemoryState | undefined, rating: Rating, now = new Date()): MemoryState {
  const p = previous ?? EMPTY_MEMORY;
  const time = now.getTime();
  const canAdvance = !p.lastAdvancedAt || time - Date.parse(p.lastAdvancedAt) >= 20 * 3_600_000;
  let intervalDays = p.intervalDays;
  let dueAt = p.dueAt;
  let lastAdvancedAt = p.lastAdvancedAt;
  if (rating === 'again') {
    intervalDays = 0;
    dueAt = new Date(time + 10 * 60_000).toISOString();
  } else if (rating === 'hard') {
    intervalDays = Math.max(0.25, Math.min(1, p.intervalDays / 2));
    dueAt = new Date(time + intervalDays * DAY).toISOString();
  } else if (canAdvance || p.intervalDays === 0) {
    intervalDays = canAdvance ? Math.min(90, Math.max(1, p.intervalDays * 2.2)) : 1;
    dueAt = new Date(time + intervalDays * DAY).toISOString();
    lastAdvancedAt = now.toISOString();
  } else if (!dueAt || Date.parse(dueAt) < time) {
    dueAt = new Date(time + Math.max(0.25, intervalDays) * DAY).toISOString();
  }
  return {
    revision: p.revision + 1, seen: p.seen + 1,
    lapses: p.lapses + (rating === 'again' ? 1 : 0), intervalDays,
    dueAt, lastAdvancedAt, lastReviewedAt: now.toISOString(), lastRating: rating,
  };
}

export function catalog(data: Workspace): StudyItem[] {
  const result: StudyItem[] = data.words.map(w => ({
    key: `word:${w.id}`, wordId: w.id, kind: w.kind, term: w.word, meaning: w.meaning,
    example: w.sourceContext || w.senses?.[0]?.example || undefined,
    translation: w.sourceContext ? undefined : w.senses?.[0]?.translation,
    source: w.source || undefined,
  }));
  for (const pair of data.confusions) {
    const word = data.words.find(w => w.id === pair.wordId);
    if (!word) continue;
    const sides = [{ term: word.word, meaning: word.meaning }, { term: pair.otherWord, meaning: pair.otherMeaning }];
    sides.forEach((side, i) => result.push({
      key: `confusion:${pair.id}:${i}`, wordId: word.id, kind: 'confusion', ...side,
      contrast: { ...sides[1 - i], tip: pair.tip },
    }));
  }
  return result;
}

export function scopeItems(data: Workspace, mode: Mode = 'all', collection = '', ids?: number[]): StudyItem[] {
  const list = data.collections.find(c => String(c.id) === collection);
  let allowed = ids ? new Set(ids) : list ? new Set(list.wordIds) : null;
  if (collection && !list && !['recent', 'difficult', 'unfiled'].includes(collection)) return [];
  if (collection === 'unfiled') {
    const filed = new Set(data.collections.flatMap(c => c.wordIds));
    allowed = new Set(data.words.filter(w => !filed.has(w.id)).map(w => w.id));
  }
  if (collection === 'recent') allowed = new Set([...data.words].sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0,30).map(w => w.id));
  return catalog(data).filter(item => {
    if (mode === 'all' ? item.kind === 'confusion' : item.kind !== mode) return false;
    if (allowed && !allowed.has(item.wordId)) return false;
    if (collection === 'difficult' && !['again', 'hard'].includes(data.memory[item.key]?.lastRating || '')) return false;
    return true;
  });
}

export function chooseRound(items: StudyItem[], memory: Workspace['memory'], count: number, all = false, now = Date.now()): StudyItem[] {
  const due = items.filter(i => memory[i.key]?.seen && Date.parse(memory[i.key].dueAt || '') <= now)
    .sort((a,b) => (memory[a.key].dueAt || '').localeCompare(memory[b.key].dueAt || ''));
  const fresh = items.filter(i => !memory[i.key]?.seen);
  const future = items.filter(i => memory[i.key]?.seen && Date.parse(memory[i.key].dueAt || '') > now)
    .sort((a,b) => (memory[a.key].lastReviewedAt || '').localeCompare(memory[b.key].lastReviewedAt || ''));
  return [...due, ...fresh, ...(all ? future : [])].slice(0, Math.max(1, Math.min(100, count)));
}

export function stats(items: StudyItem[], memory: Workspace['memory'], now = Date.now()) {
  return {
    total: items.length,
    fresh: items.filter(i => !memory[i.key]?.seen).length,
    due: items.filter(i => memory[i.key]?.seen && Date.parse(memory[i.key].dueAt || '') <= now).length,
    familiar: items.filter(i => memory[i.key]?.intervalDays >= 7 && memory[i.key]?.lastRating === 'good').length,
  };
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
