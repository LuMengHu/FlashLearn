// POST /api/words/generate —— 传入一个英文单词，调用 AI 生成待审阅的解析草稿（不写库）
import { NextResponse } from 'next/server';
import { generateWordDraft } from '@/lib/ai';

// AI 调用可能比较慢，给足超时时间（Vercel 上生效）
export const maxDuration = 60;

export async function POST(request: Request) {
  let word = '';
  try {
    const body = await request.json();
    word = typeof body?.word === 'string' ? body.word.trim() : '';
  } catch {
    return NextResponse.json({ error: '请求体不是合法的 JSON' }, { status: 400 });
  }

  if (!word) {
    return NextResponse.json({ error: '请输入要查询的单词' }, { status: 400 });
  }
  if (word.length > 64) {
    return NextResponse.json({ error: '单词太长了' }, { status: 400 });
  }

  try {
    const draft = await generateWordDraft(word);
    return NextResponse.json(draft);
  } catch (error) {
    console.error('AI 生成单词解析失败:', error);
    const message = error instanceof Error ? error.message : '生成失败，请稍后重试';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
