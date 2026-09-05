// /api/progress —— GET 拉取某一类内容的熟练度快照，POST 上报作答结果并更新等级
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { studyProgress, STUDY_ITEM_TYPES, MAX_STUDY_LEVEL, type StudyItemType } from '@/lib/schema';

function parseItemType(value: unknown): StudyItemType | null {
  return typeof value === 'string' && STUDY_ITEM_TYPES.includes(value as StudyItemType)
    ? (value as StudyItemType)
    : null;
}

export async function GET(request: Request) {
  const itemType = parseItemType(new URL(request.url).searchParams.get('itemType'));
  if (!itemType) return NextResponse.json({ error: '缺少合法的 itemType' }, { status: 400 });

  try {
    const rows = await db.query.studyProgress.findMany({
      where: eq(studyProgress.itemType, itemType),
    });

    const map: Record<number, { level: number; seenCount: number; lastSeenAt: string | null }> = {};
    for (const row of rows) {
      map[row.itemId] = {
        level: row.level,
        seenCount: row.seenCount,
        lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt).toISOString() : null,
      };
    }
    return NextResponse.json(map);
  } catch (error) {
    console.error('读取学习进度失败:', error);
    return NextResponse.json({ error: '读取学习进度失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法的 JSON' }, { status: 400 });
  }

  const itemType = parseItemType(body?.itemType);
  if (!itemType) return NextResponse.json({ error: '缺少合法的 itemType' }, { status: 400 });

  // 撤销上一题：把这几条记录恢复成作答之前的样子
  // previousLevel < 0 表示作答前根本没有记录，那就把整行删掉，回到「没练过」
  const undo: { itemId: number; correct: boolean; previousLevel: number }[] = Array.isArray(body?.undo)
    ? body.undo
        .filter((r: any) => Number.isFinite(Number(r?.itemId)))
        .map((r: any) => ({
          itemId: Number(r.itemId),
          correct: !!r.correct,
          previousLevel: Number.isFinite(Number(r?.previousLevel)) ? Number(r.previousLevel) : 0,
        }))
    : [];

  if (undo.length > 0) {
    try {
      for (const { itemId, correct, previousLevel } of undo) {
        const existing = await db.query.studyProgress.findFirst({
          where: and(eq(studyProgress.itemType, itemType), eq(studyProgress.itemId, itemId)),
        });
        if (!existing) continue;

        if (previousLevel < 0) {
          await db.delete(studyProgress).where(eq(studyProgress.id, existing.id));
          continue;
        }

        await db
          .update(studyProgress)
          .set({
            level: previousLevel,
            seenCount: Math.max(0, existing.seenCount - 1),
            correctCount: Math.max(0, existing.correctCount - (correct ? 1 : 0)),
            wrongCount: Math.max(0, existing.wrongCount - (correct ? 0 : 1)),
          })
          .where(eq(studyProgress.id, existing.id));
      }
      return NextResponse.json({ ok: true, reverted: undo.length });
    } catch (error) {
      console.error('撤销学习进度失败:', error);
      return NextResponse.json({ error: '撤销学习进度失败' }, { status: 500 });
    }
  }

  const results: { itemId: number; correct: boolean }[] = Array.isArray(body?.results)
    ? body.results
        .filter((r: any) => Number.isFinite(Number(r?.itemId)))
        .map((r: any) => ({ itemId: Number(r.itemId), correct: !!r.correct }))
    : [];

  if (results.length === 0) return NextResponse.json({ error: '没有要上报的结果' }, { status: 400 });

  try {
    for (const { itemId, correct } of results) {
      const existing = await db.query.studyProgress.findFirst({
        where: and(eq(studyProgress.itemType, itemType), eq(studyProgress.itemId, itemId)),
      });

      // 答对升一级（封顶 MAX_STUDY_LEVEL），答错直接掉回 0
      const level = correct ? Math.min((existing?.level ?? 0) + 1, MAX_STUDY_LEVEL) : 0;

      if (existing) {
        await db
          .update(studyProgress)
          .set({
            level,
            seenCount: existing.seenCount + 1,
            correctCount: existing.correctCount + (correct ? 1 : 0),
            wrongCount: existing.wrongCount + (correct ? 0 : 1),
            lastSeenAt: new Date(),
          })
          .where(eq(studyProgress.id, existing.id));
      } else {
        await db.insert(studyProgress).values({
          itemType,
          itemId,
          level,
          seenCount: 1,
          correctCount: correct ? 1 : 0,
          wrongCount: correct ? 0 : 1,
          lastSeenAt: new Date(),
        });
      }
    }

    return NextResponse.json({ ok: true, updated: results.length });
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return NextResponse.json({ error: '更新学习进度失败' }, { status: 500 });
  }
}
