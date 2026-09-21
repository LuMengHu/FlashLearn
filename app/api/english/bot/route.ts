import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { botCommand } from '@/lib/english/bot';
import { RequestError } from '@/lib/english/server';
export async function POST(request:Request){
  const expected=process.env.FLASHLEARN_BOT_TOKEN;
  const provided=request.headers.get('authorization')?.replace(/^Bearer /,'')||'';
  if(!expected||expected.length<32||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return NextResponse.json({error:'未授权的学习连接。'},{status:401});
  try{
    const body=await request.json();
    if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError('请求格式不正确。');
    return NextResponse.json(await botCommand(body));
  }catch(e){if(!(e instanceof RequestError))console.error('English bot:',e);return NextResponse.json({error:e instanceof RequestError?e.message:'暂时无法连接词库，请稍后重试。'},{status:e instanceof RequestError?e.status:500});}
}
