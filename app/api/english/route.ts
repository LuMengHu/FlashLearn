// GET /api/english?type=xxx —— 返回某一类英文复习条目（不传 type 则返回各类的条目数量统计）
import { NextResponse } from 'next/server';
import { eq, sql as raw } from 'drizzle-orm';
import { db } from '@/lib/db';
import { englishItems, ENGLISH_TYPES, type EnglishType } from '@/lib/schema';

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get('type');

  try {
    // 不带 type：返回每一类有多少条，用于入口页显示条目数
    if (!type) {
      const rows = await db
        .select({ type: englishItems.type, count: raw<number>`count(*)`.mapWith(Number) })
        .from(englishItems)
        .groupBy(englishItems.type);

      const counts: Record<string, number> = {};
      for (const t of ENGLISH_TYPES) counts[t] = 0;
      for (const row of rows) counts[row.type] = row.count;
      return NextResponse.json(counts);
    }

    if (!ENGLISH_TYPES.includes(type as EnglishType)) {
      return NextResponse.json({ error: '未知的类型' }, { status: 400 });
    }

    const items = await db.query.englishItems.findMany({
      where: eq(englishItems.type, type as EnglishType),
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('读取英文复习条目失败:', error);
    return NextResponse.json({ error: '读取英文复习条目失败' }, { status: 500 });
  }
}
