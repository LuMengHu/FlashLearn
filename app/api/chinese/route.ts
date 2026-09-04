// GET /api/chinese?type=xxx —— 返回某一类中文条目（不传 type 则返回各类的条目数量统计）
import { NextResponse } from 'next/server';
import { eq, sql as raw } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chineseItems, CHINESE_TYPES, type ChineseType } from '@/lib/schema';

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get('type');

  try {
    // 不带 type：返回每一类有多少条，用于入口页显示条目数
    if (!type) {
      const rows = await db
        .select({ type: chineseItems.type, count: raw<number>`count(*)`.mapWith(Number) })
        .from(chineseItems)
        .groupBy(chineseItems.type);

      const counts: Record<string, number> = {};
      for (const t of CHINESE_TYPES) counts[t] = 0;
      for (const row of rows) counts[row.type] = row.count;
      return NextResponse.json(counts);
    }

    if (!CHINESE_TYPES.includes(type as ChineseType)) {
      return NextResponse.json({ error: '未知的类型' }, { status: 400 });
    }

    const items = await db.query.chineseItems.findMany({
      where: eq(chineseItems.type, type as ChineseType),
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('读取中文条目失败:', error);
    return NextResponse.json({ error: '读取中文条目失败' }, { status: 500 });
  }
}
