import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, chooseRound, EMPTY_MEMORY, parseImport, schedule, scopeItems, stats } from '../lib/english/learning';
import type { Vocabulary, Workspace } from '../lib/english/types';

const day0=new Date('2026-09-20T08:00:00Z');
const word=(id:number,kind:'word'|'phrase'='word'):Vocabulary=>({id,kind,word:`word${id}`,meaning:'meaning',source:null,sourceContext:null,notes:null,senses:[],family:[],confusables:[],etymology:null,createdAt:day0.toISOString()});
const data:Workspace={words:[word(1),word(2,'phrase'),word(3)],collections:[{id:1,name:'Reading',createdAt:day0.toISOString(),wordIds:[1,2]}],confusions:[{id:'1',wordId:1,otherWord:'other',otherMeaning:'another meaning',tip:'difference',createdAt:day0.toISOString()}],memory:{}};

test('new recognition gets a day, repeated same-day recognition cannot inflate it',()=>{
 const first=schedule(undefined,'good',day0);
 let current=first;
 for(let n=1;n<=10;n++)current=schedule(current,'good',new Date(+day0+n*60_000));
 assert.equal(current.intervalDays,1);assert.equal(current.dueAt,first.dueAt);assert.equal(current.seen,11);
 const tomorrow=schedule(current,'good',new Date(+day0+86_400_000));assert.equal(tomorrow.intervalDays,2.2);
});
test('lapses return soon, hard shortens interval, and repeated review is capped',()=>{
 const prior={...EMPTY_MEMORY,intervalDays:40,lastAdvancedAt:day0.toISOString()};
 const lapse=schedule(prior,'again',day0);assert.equal(lapse.intervalDays,0);assert.equal(lapse.lapses,1);assert.equal(Date.parse(lapse.dueAt!)-+day0,600000);
 assert.equal(schedule(prior,'hard',day0).intervalDays,1);
 assert.equal(schedule({...prior,intervalDays:89,lastAdvancedAt:null},'good',day0).intervalDays,90);
});
test('collections share item keys and invalid scopes never fall back to the full library',()=>{
 assert.deepEqual(scopeItems(data,'all','1').map(i=>i.key),['word:1','word:2']);
 assert.equal(scopeItems(data,'all','999').length,0);
 assert.deepEqual(scopeItems(data,'all','unfiled').map(i=>i.key),['word:3']);
 assert.equal(scopeItems(data,'phrase').length,1);
 assert.deepEqual(scopeItems(data,'all','',[3,3]).map(i=>i.key),['word:3']);
});
test('confusable sides have independent practice records and do not expand normal study',()=>{
 assert.equal(catalog(data).length,5);assert.equal(scopeItems(data).length,3);
 const pair=scopeItems(data,'confusion');assert.equal(pair.length,2);assert.notEqual(pair[0].key,pair[1].key);assert.equal(pair[0].contrast?.term,pair[1].term);
});
test('recommended rounds prioritize due items and exclude future items until explicitly requested',()=>{
 const items=scopeItems(data);const memory={ 'word:1':schedule(undefined,'good',day0), 'word:2':schedule(undefined,'again',day0) };
 const now=+day0+3_600_000;
 assert.deepEqual(chooseRound(items,memory,20,false,now).map(i=>i.key),['word:2','word:3']);
 assert.deepEqual(chooseRound(items,memory,20,true,now).map(i=>i.key),['word:2','word:3','word:1']);
 assert.deepEqual(stats(items,memory,now),{total:3,fresh:1,due:1,familiar:0});
});
test('import preserves phrases and commas in definitions and deduplicates normalized words',()=>{
 const rows=parseImport(' Adopt | collect, accept\nput   up with\t忍受\tA sentence.\nADOPT | 采纳\n\n');
 assert.equal(rows.length,2);assert.equal(rows[0].meaning,'采纳');assert.equal(rows[1].word,'put up with');assert.equal(rows[1].kind,'phrase');assert.equal(rows[1].example,'A sentence.');
 assert.throws(()=>parseImport(Array.from({length:201},(_,i)=>`word${i}`).join('\n')));
});
