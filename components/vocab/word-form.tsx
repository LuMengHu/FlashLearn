// 单词编辑表单：录入页和总表的快速编辑共用这一套字段编辑 UI
'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WordSense, WordFamilyItem, ConfusableItem } from '@/lib/schema';

export type WordDraft = {
  word: string;
  meaning: string;
  senses: WordSense[];
  family: WordFamilyItem[];
  confusables: ConfusableItem[];
  etymology: string;
  notes: string;
};

export const EMPTY_WORD_DRAFT: WordDraft = {
  word: '',
  meaning: '',
  senses: [],
  family: [],
  confusables: [],
  etymology: '',
  notes: '',
};

export const fieldClass =
  'bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-cyan-600';

/** 把数据库里取出的一行整理成表单用的草稿 */
export function toDraft(row: {
  word: string;
  meaning: string;
  senses?: WordSense[] | null;
  family?: WordFamilyItem[] | null;
  confusables?: ConfusableItem[] | null;
  etymology?: string | null;
  notes?: string | null;
}): WordDraft {
  return {
    word: row.word,
    meaning: row.meaning,
    senses: row.senses ?? [],
    family: row.family ?? [],
    confusables: row.confusables ?? [],
    etymology: row.etymology ?? '',
    notes: row.notes ?? '',
  };
}

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
  fields: { key: keyof T & string; label: string; multiline?: boolean }[];
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
          <h2 className="font-semibold text-slate-100">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...items, { ...emptyItem }])}
          className="shrink-0 text-slate-300 hover:bg-slate-700/50 hover:text-white"
        >
          <Plus size={16} className="mr-1" />
          添加
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-800 py-4 text-center text-sm text-slate-600">暂无内容</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="relative space-y-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3 pr-11">
              {fields.map(field => (
                <div key={field.key}>
                  <label className="mb-1 block text-xs text-slate-500">{field.label}</label>
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
                className="absolute right-2 top-2 h-8 w-8 text-slate-500 hover:bg-slate-800 hover:text-brand-red-500"
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

export function WordForm({
  draft,
  onChange,
  showWordField = true,
}: {
  draft: WordDraft;
  onChange: (changes: Partial<WordDraft>) => void;
  showWordField?: boolean;
}) {
  return (
    <div className="space-y-8">
      {showWordField && (
        <div>
          <label className="mb-1 block text-xs text-slate-500">单词</label>
          <Input
            value={draft.word}
            onChange={e => onChange({ word: e.target.value })}
            className={`${fieldClass} text-lg font-semibold`}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs text-slate-500">主释义（背单词时显示的答案）</label>
        <Input value={draft.meaning} onChange={e => onChange({ meaning: e.target.value })} className={`${fieldClass} text-lg`} />
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
        onChange={senses => onChange({ senses })}
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
        onChange={family => onChange({ family })}
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
        onChange={confusables => onChange({ confusables })}
      />

      <div>
        <label className="mb-1 block text-xs text-slate-500">词源说明</label>
        <Textarea value={draft.etymology} onChange={e => onChange({ etymology: e.target.value })} className={fieldClass} rows={3} />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-500">我自己的笔记</label>
        <Textarea
          value={draft.notes}
          onChange={e => onChange({ notes: e.target.value })}
          className={fieldClass}
          rows={3}
          placeholder="自己补充的记忆方法、容易弄混的地方……"
        />
      </div>
    </div>
  );
}
