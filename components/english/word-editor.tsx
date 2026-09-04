// 单词录入：输入单词 → 调用 AI 生成解析草稿 → 审阅/编辑/增删 → 保存入库
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { WordForm, EMPTY_WORD_DRAFT, fieldClass, type WordDraft } from './word-form';

export default function WordEditor() {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<WordDraft | null>(null);
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
      setDraft({ ...EMPTY_WORD_DRAFT, ...data, notes: '' });
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

  const patch = (changes: Partial<WordDraft>) => setDraft(prev => (prev ? { ...prev, ...changes } : prev));

  return (
    <div className="w-full space-y-6">
      {/* 输入 + 生成 */}
      <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-slate-400">输入一个英文单词，让 AI 帮你整理</label>
          <Link href="/english/list" className="shrink-0 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-300">
            批量导入？看单词总表
          </Link>
        </div>
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
            className="h-12 shrink-0 bg-cyan-600 px-6 text-white hover:bg-cyan-500"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
            <span className="ml-2">{isGenerating ? '生成中' : '生成'}</span>
          </Button>
        </div>
        {error && <p className="text-sm text-brand-red-500">{error}</p>}
        {savedMessage && (
          <p className="flex items-center gap-2 text-sm text-brand-green-500">
            {savedMessage}
            <Link href="/english/study" className="underline underline-offset-2 hover:text-green-400">
              去背单词
            </Link>
          </p>
        )}
      </div>

      {/* 审阅 / 编辑 */}
      {draft && (
        <div className="space-y-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-lg sm:p-6">
          <WordForm draft={draft} onChange={patch} />

          <div className="flex flex-col justify-end gap-3 border-t border-slate-800 pt-4 sm:flex-row">
            <Button variant="ghost" onClick={() => setDraft(null)} className="text-slate-400 hover:bg-slate-700/50 hover:text-white">
              放弃
            </Button>
            <Button onClick={handleSave} disabled={isSaving} size="lg" className="bg-green-600 text-white hover:bg-green-500">
              {isSaving ? <Loader2 className="mr-2 animate-spin" size={18} /> : <Save className="mr-2" size={18} />}
              {isSaving ? '保存中' : '确认无误，加入单词库'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
