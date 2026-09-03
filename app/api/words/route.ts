// /api/words —— GET 列出全部单词（背单词页用），POST 新增/更新一个单词（录入页用）
import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { words } from '@/lib/schema';
import type { NewWord } from '@/lib/schema';

export async function GET() {
  try {
    const rows = await db.query.words.findMany({
      orderBy: [desc(words.createdAt)],
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error('读取单词列表失败:', error);
    return NextResponse.json({ error: '读取单词列表失败' }, { status: 500 });
  }
}

/** 把前端传来的对象裁剪成可写入的字段，避免多余的键进入 insert */
function toWordRow(body: any): NewWord | null {
  const word = typeof body?.word === 'string' ? body.word.trim() : '';
  const meaning = typeof body?.meaning === 'string' ? body.meaning.trim() : '';
  if (!word || !meaning) return null;

  const cleanList = <T extends Record<string, unknown>>(value: unknown, keys: string[]): T[] =>
    Array.isArray(value)
      ? value
          .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
          .map(item => {
            const next: Record<string, unknown> = {};
            for (const key of keys) {
              const raw = item[key];
              if (typeof raw === 'string' && raw.trim()) next[key] = raw.trim();
            }
            return next as T;
          })
          .filter(item => Object.keys(item).length > 0)
      : [];

  return {
    word,
    meaning,
    phonetic: typeof body?.phonetic === 'string' ? body.phonetic.trim() || null : null,
    etymology: typeof body?.etymology === 'string' ? body.etymology.trim() || null : null,
    notes: typeof body?.notes === 'string' ? body.notes.trim() || null : null,
    senses: cleanList(body?.senses, ['pos', 'meaning', 'example', 'translation']),
    family: cleanList(body?.family, ['word', 'pos', 'meaning']),
    confusables: cleanList(body?.confusables, ['word', 'meaning', 'tip']),
  } as NewWord;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法的 JSON' }, { status: 400 });
  }

  const row = toWordRow(body);
  if (!row) {
    return NextResponse.json({ error: '单词和中文释义都不能为空' }, { status: 400 });
  }

  try {
    // 同一个单词重复录入时更新已有记录，而不是插入重复行
    const [saved] = await db
      .insert(words)
      .values(row)
      .onConflictDoUpdate({
        target: words.word,
        set: { ...row, updatedAt: new Date() },
      })
      .returning();

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error('保存单词失败:', error);
    return NextResponse.json({ error: '保存单词失败' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: '缺少合法的 id' }, { status: 400 });
  }

  try {
    await db.delete(words).where(eq(words.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('删除单词失败:', error);
    return NextResponse.json({ error: '删除单词失败' }, { status: 500 });
  }
}
