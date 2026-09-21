import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, chooseRound, isUnlearned, parseImport, schedule, scopeItems, stats, visibleNote, visibleTip } from '../lib/english/learning';
import type { Vocabulary, Workspace } from '../lib/english/types';

const day0 = new Date('2026-09-20T08:00:00Z');
const word = (id: number, kind: 'word' | 'phrase' = 'word'): Vocabulary => ({
  id, kind, word: `word${id}`, meaning: `meaning${id}`, source: null, sourceContext: null, notes: null,
  senses: [], family: [], confusables: [], etymology: null, createdAt: day0.toISOString(),
});
const data: Workspace = {
  words: [word(1), word(2, 'phrase'), word(3)],
  collections: [
    { id: 1, name: 'Reading words', kind: 'word', createdAt: day0.toISOString(), wordIds: [1] },
    { id: 2, name: 'Reading phrases', kind: 'phrase', createdAt: day0.toISOString(), wordIds: [2] },
    { id: 3, name: 'Confusions', kind: 'confusion', createdAt: day0.toISOString(), wordIds: [1, 3] },
  ],
  confusions: [{ id: '1', wordId: 1, otherWord: 'word3', otherMeaning: 'meaning3', tip: '一组辨析', createdAt: day0.toISOString() }],
  memory: {},
};

test('unknown answers remain unlearned and have no review due date', () => {
  const state = schedule(undefined, 'again', day0);
  assert.equal(state.intervalDays, 0);
  assert.equal(state.dueAt, null);
  assert.equal(state.lastRating, 'again');
  assert.equal(isUnlearned(state), true);
});

test('recognized answers follow the 1, 3, 7 day review chain', () => {
  const first = schedule(undefined, 'good', day0);
  assert.equal(first.intervalDays, 1);
  assert.equal(Date.parse(first.dueAt!) - +day0, 86_400_000);

  const sameDay = schedule(first, 'good', new Date(+day0 + 60_000));
  assert.equal(sameDay.intervalDays, 1);
  assert.equal(sameDay.dueAt, first.dueAt);

  const second = schedule(first, 'good', new Date(+day0 + 86_400_000));
  assert.equal(second.intervalDays, 3);
  const third = schedule(second, 'good', new Date(+day0 + 4 * 86_400_000));
  assert.equal(third.intervalDays, 7);
});

test('practice only accepts collections from the selected category', () => {
  assert.deepEqual(scopeItems(data, 'word', '1').map(item => item.key), ['word:1']);
  assert.equal(scopeItems(data, 'word', '2').length, 0);
  assert.deepEqual(scopeItems(data, 'phrase', '2').map(item => item.key), ['word:2']);
  assert.equal(scopeItems(data, 'confusion', '1').length, 0);
  assert.equal(scopeItems(data, 'word', '999').length, 0);
});

test('a confusion group is one table-shaped practice item', () => {
  const groups = scopeItems(data, 'confusion', '3');
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, 'confusion');
  assert.deepEqual(groups[0].entries, [
    { term: 'word1', meaning: 'meaning1' },
    { term: 'word3', meaning: 'meaning3' },
  ]);
  assert.deepEqual(groups[0].wordIds, [1, 3]);
  assert.equal(catalog(data).length, 4);
});

test('recommended rounds prioritize due and unlearned items', () => {
  const items = scopeItems(data, 'word');
  const memory = {
    'word:1': schedule(undefined, 'good', day0),
    'word:3': schedule(undefined, 'again', day0),
  };
  const now = +day0 + 2 * 86_400_000;
  assert.deepEqual(chooseRound(items, memory, 20, false, now).map(item => item.key), ['word:1', 'word:3']);
  assert.deepEqual(stats(items, memory, now), { total: 2, fresh: 1, due: 1, familiar: 0 });
});

test('import preserves phrases and commas in definitions and deduplicates normalized words', () => {
  const rows = parseImport(' Adopt | collect, accept\nput   up with\t忍受\tA sentence.\nADOPT | 采纳\n\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].meaning, '采纳');
  assert.equal(rows[1].word, 'put up with');
  assert.equal(rows[1].kind, 'phrase');
  assert.equal(rows[1].example, 'A sentence.');
  assert.throws(() => parseImport(Array.from({ length: 201 }, (_, index) => `word${index}`).join('\n')));
});

test('exam locations are removed from confusion tips without losing useful guidance', () => {
  assert.equal(visibleTip('形容词组：第 4 题考点：individual 在此=独特的'), '形容词组：individual 在此=独特的');
});
test('import provenance and exam locations are hidden from notes', () => {
  assert.equal(visibleNote('导入材料：Practice 2\n分组：take\n第 9 题题干出现\n辨析：方向词'), '分组：take\n辨析：方向词');
});