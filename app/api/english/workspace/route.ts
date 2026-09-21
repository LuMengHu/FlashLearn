import { NextResponse } from 'next/server';
import { assertSameOrigin, mutateWorkspace, RequestError, workspace } from '@/lib/english/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { return NextResponse.json(await workspace()); }
  catch (error) { console.error('English workspace:', error); return NextResponse.json({ error: '词库暂时无法连接，请稍后重试。' }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError('请求格式不正确。');
    return NextResponse.json(await mutateWorkspace(body));
  } catch (error) {
    if (!(error instanceof RequestError)) console.error('English mutation:', error);
    return NextResponse.json({ error: error instanceof RequestError ? error.message : '保存失败，请检查是否存在同名词条后重试。' }, { status: error instanceof RequestError ? error.status : 500 });
  }
}
