// 单词总表：搜索 / 分组浏览全部单词，点开任意一个就能就地编辑或删除
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';
import { Loader2, Search, Save, Trash2, X, Plus, Volume2 } from 'lucide-react';
import { useSpeech } from '@/hooks/use-speech';
import { WordForm, fieldClass, toDraft, type WordDraft } from './word-form';
import { cn } from '@/lib/utils';
import type { Word } from '@/lib/schema';

type SortMode = 'alpha' | 'recent';

export default function WordTable() {
  const [words, setWords] = useState<Word[] | null>(null);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('alpha');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<WordDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { speak } = useSpeech();

  const load = async () => {
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '读取失败');
      setWords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取失败');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!words) return [];
    const kw = keyword.trim().toLowerCase();
    if (!kw) return words;
    return words.filter(w => {
      const haystack = [
        w.word,
        w.meaning,
        w.etymology ?? '',
        w.notes ?? '',
        ...(w.senses ?? []).map(s => s.meaning),
        ...(w.family ?? []).map(f => `${f.word} ${f.meaning}`),
        ...(w.confusables ?? []).map(c => `${c.word} ${c.meaning}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(kw);
    });
  }, [words, keyword]);

  /** 按当前排序方式分组：字母模式按首字母，最近模式不分组 */
  const groups = useMemo(() => {
    if (sortMode === 'recent') {
      const sorted = [...filtered].sort(
        (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      );
      return [{ label: '按录入时间（新→旧）', items: sorted }];
    }

    const map = new Map<string, Word[]>();
    for (const word of [...filtered].sort((a, b) => a.word.localeCompare(b.word))) {
      const letter = /^[a-z]/i.test(word.word) ? word.word[0].toUpperCase() : '#';
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(word);
    }
    return [...map.entries()].map(([label, items]) => ({ label, items }));
  }, [filtered, sortMode]);

  const startEdit = (word: Word) => {
    setEditingId(word.id);
    setDraft(toDraft(word));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const handleSave = async () => {
    if (!draft || isSaving) return;
    if (!draft.word.trim() || !draft.meaning.trim()) {
      setError('单词和主释义不能为空');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '保存失败');
      await load();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (word: Word) => {
    if (!window.confirm(`确定要从单词库里删除「${word.word}」吗？`)) return;
    try {
      const res = await fetch(`/api/words?id=${word.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      await load();
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  if (error && !words) return <p className="text-center text-brand-red-500">{error}</p>;

  if (!words) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        加载中…
      </div>
    );
  }

  if (words.length === 0) {
    return <EmptyState message="单词库还是空的" actionHref="/english/new" actionLabel="去录入第一个单词" />;
  }

  return (
    <div className="space-y-5">
      {/* 工具条 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
          <Input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索单词、释义、家族词、易混词…"
            className={`${fieldClass} h-11 pl-9`}
          />
        </div>

        <div className="flex shrink-0 gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
          {([['alpha', 'A-Z'], ['recent', '最近录入']] as [SortMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              onClick={() => setSortMode(mode)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                sortMode === mode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button asChild size="sm" className="h-11 shrink-0 bg-cyan-600 px-4 text-white hover:bg-cyan-500">
          <Link href="/english/new">
            <Plus size={16} className="mr-1" />
            录入
          </Link>
        </Button>
      </div>

      <p className="text-sm text-slate-500">
        共 <span className="font-semibold tabular-nums text-slate-300">{words.length}</span> 个单词
        {keyword && <> · 匹配 <span className="font-semibold tabular-nums text-slate-300">{filtered.length}</span> 个</>}
      </p>

      {error && <p className="text-sm text-brand-red-500">{error}</p>}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-800 py-12 text-center text-slate-500">没有匹配的单词</p>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <section key={group.label}>
              <h2 className="mb-2 px-1 text-sm font-semibold text-slate-600">{group.label}</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                {group.items.map((word, index) => {
                  const isEditing = editingId === word.id;
                  return (
                    <div key={word.id} className={cn(index > 0 && 'border-t border-slate-800')}>
                      {/* 行 */}
                      <div
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
                          isEditing ? 'bg-slate-800/60' : 'bg-slate-900/40 hover:bg-slate-800/40'
                        )}
                        onClick={() => (isEditing ? cancelEdit() : startEdit(word))}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-slate-100">{word.word}</span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                speak(word.word, { rate: 0.9 });
                              }}
                              className="text-slate-700 transition-colors hover:text-cyan-400"
                              title="发音"
                            >
                              <Volume2 size={15} />
                            </button>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-slate-400">{word.meaning}</p>
                        </div>

                        <div className="hidden shrink-0 gap-1.5 sm:flex">
                          {(word.family?.length ?? 0) > 0 && (
                            <Badge label={`家族 ${word.family!.length}`} tone="cyan" />
                          )}
                          {(word.confusables?.length ?? 0) > 0 && (
                            <Badge label={`易混 ${word.confusables!.length}`} tone="red" />
                          )}
                          {word.notes && <Badge label="笔记" tone="slate" />}
                        </div>

                        <span className="shrink-0 text-xs text-slate-600">{isEditing ? '收起' : '编辑'}</span>
                      </div>

                      {/* 就地编辑 */}
                      {isEditing && draft && (
                        <div className="space-y-6 border-t border-slate-800 bg-slate-950/40 p-4 sm:p-6">
                          <WordForm draft={draft} onChange={changes => setDraft(prev => (prev ? { ...prev, ...changes } : prev))} />

                          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-4">
                            <Button
                              variant="ghost"
                              onClick={() => handleDelete(word)}
                              className="mr-auto text-slate-500 hover:bg-red-950/40 hover:text-brand-red-500"
                            >
                              <Trash2 size={16} className="mr-1" />
                              删除
                            </Button>
                            <Button variant="ghost" onClick={cancelEdit} className="text-slate-400 hover:bg-slate-700/50 hover:text-white">
                              <X size={16} className="mr-1" />
                              取消
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 text-white hover:bg-green-500">
                              {isSaving ? <Loader2 className="mr-2 animate-spin" size={16} /> : <Save className="mr-2" size={16} />}
                              保存
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: 'cyan' | 'red' | 'slate' }) {
  const toneClass = {
    cyan: 'border-cyan-900 bg-cyan-950/50 text-cyan-500',
    red: 'border-red-900 bg-red-950/40 text-red-400',
    slate: 'border-slate-700 bg-slate-800/60 text-slate-400',
  }[tone];
  return <span className={cn('rounded-full border px-2 py-0.5 text-xs', toneClass)}>{label}</span>;
}
