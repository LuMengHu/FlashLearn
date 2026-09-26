import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, chooseRound, confusionGroups, isUnlearned, parseImport, practiceBatch, schedule, scopeItems, stats, studyFamily, visibleNote, visibleTip } from '../lib/english/learning';
import type { Vocabulary, Workspace } from '../lib/english/types';

const day0 = new Date('2026-09-20T08:00:00Z');
const word = (id: number, kind: 'word' | 'phrase' = 'word', excluded = false): Vocabulary => ({
  id, kind, excluded, word: kind === 'phrase' ? 'take away' : 'word' + id, meaning: 'meaning' + id,
  source: null, sourceContext: null, notes: null, senses: [], family: [], confusables: [],
  etymology: null, createdAt: day0.toISOString(),
});
const data: Workspace = {
  words: [word(1), word(2), word(3,'word',true), word(4), word(5), word(6,'phrase')],
  collections: [
    { id: 1, name: '易混', kind: 'confusion', createdAt: day0.toISOString(), wordIds: [1,2,3,4,5] },
    { id: 2, name: '短语', kind: 'phrase', createdAt: day0.toISOString(), wordIds: [6] },
  ],
  confusions: [2,3,4,5].map(id => ({ id: String(id), wordId: 1, otherWord: 'word' + id,
    otherMeaning: 'meaning' + id, tip: '留意拼写差异', groupKey: 'g1', createdAt: day0.toISOString() })),
  memory: {},
};

test('不认识保持没学过，认识依次进入 1/3/7 天复习', () => {
  const again = schedule(undefined, 'again', day0);
  assert.equal(again.intervalDays, 0);
  assert.equal(again.dueAt, null);
  assert.equal(isUnlearned(again), true);
  const first = schedule(again, 'good', day0);
  assert.equal(first.intervalDays, 1);
  assert.equal(Date.parse(first.dueAt!) - +day0, 86_400_000);
  assert.equal(schedule(first, 'good', new Date(+day0 + 60_000)).dueAt, first.dueAt);
  const second = schedule(first, 'good', new Date(+day0 + 2 * 86_400_000));
  assert.equal(second.intervalDays, 3);
  assert.equal(schedule(second, 'good', new Date(+day0 + 4 * 86_400_000)).intervalDays, 7);
});

test('易混词组按单词独立记录，已移出词条不进入练习', () => {
  const group = confusionGroups(data)[0];
  assert.equal(group.entries.length, 4);
  assert.deepEqual(group.entries.map(item => item.key), ['word:1','word:2','word:4','word:5']);
  assert.equal(catalog(data).length, 5);
  assert.deepEqual(scopeItems(data, 'confusion','1').map(item => item.key), group.entries.map(item => item.key));
  assert.deepEqual(scopeItems(data, 'phrase','2').map(item => item.key), ['word:6']);
  assert.equal(scopeItems(data, 'confusion','2').length, 0);
  assert.equal(scopeItems(data, 'phrase','1').length, 0);
  assert.equal(scopeItems(data, 'word').length, 0);
});

test('到期、新词和限定复习范围分开，四词组优先同组', () => {
  const items = scopeItems(data, 'confusion');
  const memory = {
    'word:1': schedule(undefined, 'good', day0),
    'word:2': schedule(undefined, 'again', day0),
    'word:4': schedule(undefined, 'good', new Date(+day0 + 2 * 86_400_000)),
  };
  const now = +day0 + 2 * 86_400_000;
  assert.deepEqual(chooseRound(items, memory, 4, false, now, 'mixed', { random: () => 0.999 }).map(item => item.key), ['word:1','word:2','word:5']);
  assert.deepEqual(chooseRound(items, memory, 4, false, now, 'review').map(item => item.key), ['word:1']);
  assert.deepEqual(chooseRound(items, memory, 4, false, now, 'learn', { random: () => 0.999 }).map(item => item.key), ['word:2','word:5']);
  assert.deepEqual(stats(items, memory, now), { total: 4, fresh: 2, due: 1, familiar: 0 });
});


test('短语每表最多三个且不混合不同词头；新词轮换优先未展示家族', () => {
  const phrases = ['take over', 'take after', 'take to', 'put up', 'put off', 'break down'].map((term, index) => ({
    key: 'phrase:' + index, wordId: index + 10, kind: 'phrase' as const, term, meaning: '释义' + index,
  }));
  const map = new Map(phrases.map(item => [item.key, item]));
  const queue = phrases.map(item => item.key);
  assert.deepEqual(practiceBatch(queue, map), queue.slice(0, 3));
  assert.deepEqual(practiceBatch(queue.slice(3), map), queue.slice(3, 5));
  assert.equal(studyFamily(phrases[0]), 'phrase:take');
  const original = chooseRound(phrases, {}, 3, false, +day0, 'learn', { random: () => 0.999 });
  const rotated = chooseRound(phrases, {}, 3, false, +day0, 'learn', {
    random: () => 0.999, avoidFamilies: new Set(['phrase:take']),
  });
  assert.equal(original[0].term, 'take over');
  assert.equal(rotated[0].term.startsWith('take'), false);
  assert.equal(practiceBatch(rotated.map(item => item.key), map).length, 2);
  const shuffled = chooseRound(phrases, {}, 3, false, +day0, 'learn', { random: () => 0 });
  assert.notEqual(shuffled[0].term, original[0].term);
});

test('易混大组拆成四词以内的表格', () => {
  const items = scopeItems(data, 'confusion');
  const map = new Map(items.map(item => [item.key, item]));
  assert.deepEqual(practiceBatch(items.map(item => item.key), map), ['word:1', 'word:2', 'word:4', 'word:5']);
});
test('短语导入保留释义里的逗号与归一化去重', () => {
  const rows = parseImport('put up with | 忍受, 容忍\nTAKE AWAY | 拿走\nput   up with | 容忍');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].word, 'put up with');
  assert.equal(rows[0].meaning, '容忍');
  assert.equal(rows[0].kind, 'phrase');
  assert.throws(() => parseImport(Array.from({ length: 201 }, (_, index) => 'word' + index).join('\n')));
});

test('笔记与提示不显示导入来源及考题位置', () => {
  assert.equal(visibleTip('形容词组：第 4 题考点：individual 在此=独特的'), '形容词组：individual 在此=独特的');
  assert.equal(visibleNote('导入材料：Practice 2\n分组：take\n第 9 题题干出现\n辨析：方向词'), '分组：take\n辨析：方向词');
});
