import { NextResponse } from 'next/server';
import { assertSameOrigin, RequestError, review, stringValue, undo } from '@/lib/english/server';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    if (!body || typeof body !== 'object') throw new RequestError('请求格式不正确。');
    return NextResponse.json(body.action === 'undo' ? await undo(stringValue(body.eventId, '作答编号', 150)) : await review(body));
  } catch (error) {
    if (!(error instanceof RequestError)) console.error('English review:', error);
    return NextResponse.json({ error: error instanceof RequestError ? error.message : '进度未保存，请重试。这张卡会为你保留。' }, { status: error instanceof RequestError ? error.status : 500 });
  }
}
