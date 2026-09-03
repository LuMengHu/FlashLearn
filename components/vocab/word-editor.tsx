// 单词录入：输入单词 → 调用 AI 生成解析草稿 → 审阅/编辑/增删 → 保存入库
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2, Sparkles, Save, Undo2 } from 'lucide-react';
import type { WordSense, WordFamilyItem, ConfusableItem } from '@/lib/schema';

type Draft = {
  word: string;
  phonetic: string;
  meaning: string;
  senses: WordSense[];
  family: WordFamilyItem[];
  confusables: ConfusableItem[];
  etymology: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  word: '',
  phonetic: '',
  meaning: '',
  senses: [],
  family: [],
  confusables: [],
  etymology: '',
  notes: '',
};

const fieldClass =
  'bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-brand-cyan-600';

/** 一个可增删条目的区块 */
function ListSection<T extends Record<string, string | undefined>>({
  title,
  hint,
  items,
  fields,
  emptyItem,
  onChange,
}: {
  title: string;
  hint: string;
  items: T[];
  fields: { key: keyof T & string; label: string; multiline?: boolean; className?: string }[];
  emptyItem: T;
  onChange: (items: T[]) => void;
}) {
  const update = (index: number, key: string, value: string) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...items, { ...emptyItem }])}
          className="text-slate-300 hover:text-white hover:bg-slate-700/50 shrink-0"
        >
          <Plus size={16} className="mr-1" />
          添加
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-600 border border-dashed border-slate-800 rounded-lg py-4 text-center">
          暂无内容
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="relative rounded-lg border border-slate-800 bg-slate-900/40 p-3 pr-11 space-y-2">
              {fields.map(field => (
                <div key={field.key} className={field.className}>
                  <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                  {field.multiline ? (
                    <Textarea
                      value={item[field.key] ?? ''}
                      onChange={e => update(index, field.key, e.target.value)}
                      className={fieldClass}
                      rows={2}
                    />
                  ) : (
                    <Input
                      value={item[field.key] ?? ''}
                      onChange={e => update(index, field.key, e.target.value)}
                      className={fieldClass}
                    />
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="absolute top-2 right-2 h-8 w-8 text-slate-500 hover:text-brand-red-500 hover:bg-slate-800"
                title="删除这一条"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function WordEditor() {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const handleGenerate = async () => {
    const word = query.trim();
    if (!word || isGenerating) return;

    setIsGenerating(true);
    setError('');
    setSavedMessage('');
    try {
      const res = await fetch('/api/words/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '生成失败');
      setDraft({ ...EMPTY_DRAFT, ...data, notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
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
      setSavedMessage(`「${data.word}」已保存到单词库`);
      setDraft(null);
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const patch = (changes: Partial<Draft>) => setDraft(prev => (prev ? { ...prev, ...changes } : prev));

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
          <Link href="/">
            <Undo2 className="rotate-180 mr-1" size={18} />
            返回
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">录入新单词</h1>
        <Button asChild variant="ghost" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
          <Link href="/vocab/study">去背单词</Link>
        </Button>
      </div>

      {/* 输入 + 生成 */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6 space-y-3">
        <label className="block text-sm text-slate-400">输入一个英文单词，让 AI 帮你整理</label>
        <div className="flex gap-3">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleGenerate();
            }}
            placeholder="例如：resist"
            className={`${fieldClass} h-12 text-lg`}
            autoFocus
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !query.trim()}
            size="lg"
            className="bg-brand-cyan-600 hover:bg-brand-cyan-700 text-white h-12 px-6 shrink-0"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            <span className="ml-2">{isGenerating ? '生成中' : '生成'}</span>
          </Button>
        </div>
        {error && <p className="text-sm text-brand-red-500">{error}</p>}
        {savedMessage && <p className="text-sm text-brand-green-500">{savedMessage}</p>}
      </div>

      {/* 审阅 / 编辑 */}
      {draft && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">单词</label>
              <Input value={draft.word} onChange={e => patch({ word: e.target.value })} className={`${fieldClass} text-lg font-semibold`} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">音标</label>
              <Input value={draft.phonetic} onChange={e => patch({ phonetic: e.target.value })} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">主释义（背单词时显示的答案）</label>
            <Input value={draft.meaning} onChange={e => patch({ meaning: e.target.value })} className={`${fieldClass} text-lg`} />
          </div>

          <ListSection<WordSense>
            title="需要记住的含义"
            hint="按常用度排序，背单词揭晓答案时会显示"
            items={draft.senses}
            emptyItem={{ pos: '', meaning: '', example: '', translation: '' }}
            fields={[
              { key: 'pos', label: '词性' },
              { key: 'meaning', label: '中文释义' },
              { key: 'example', label: '英文例句', multiline: true },
              { key: 'translation', label: '例句翻译', multiline: true },
            ]}
            onChange={senses => patch({ senses })}
          />

          <ListSection<WordFamilyItem>
            title="词源家族 / 变形"
            hint="同词根派生出来的词"
            items={draft.family}
            emptyItem={{ word: '', pos: '', meaning: '' }}
            fields={[
              { key: 'word', label: '单词' },
              { key: 'pos', label: '词性' },
              { key: 'meaning', label: '中文释义' },
            ]}
            onChange={family => patch({ family })}
          />

          <ListSection<ConfusableItem>
            title="容易弄混的词"
            hint="长得像或读起来像、真的会认错的词"
            items={draft.confusables}
            emptyItem={{ word: '', meaning: '', tip: '' }}
            fields={[
              { key: 'word', label: '易混词' },
              { key: 'meaning', label: '它的意思' },
              { key: 'tip', label: '怎么区分', multiline: true },
            ]}
            onChange={confusables => patch({ confusables })}
          />

          <div>
            <label className="block text-xs text-slate-500 mb-1">词源说明</label>
            <Textarea value={draft.etymology} onChange={e => patch({ etymology: e.target.value })} className={fieldClass} rows={3} />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">我自己的笔记</label>
            <Textarea
              value={draft.notes}
              onChange={e => patch({ notes: e.target.value })}
              className={fieldClass}
              rows={3}
              placeholder="自己补充的记忆方法、容易弄混的地方……"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setDraft(null)} className="text-slate-400 hover:text-white hover:bg-slate-700/50">
              放弃
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
              {isSaving ? '保存中' : '确认无误，加入单词库'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
