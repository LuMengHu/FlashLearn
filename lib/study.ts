// 选题与熟练度：中文与英文共用的一套规则（外交知识不参与，进去就是整套题库）
//
// 核心思路（只看等级，不看时间）：
//   1. 没练过的排最前面 —— 保证新内容一定会被见到，不会有一直抽不到的盲区
//   2. 其次按熟练等级从低到高 —— 越生疏越常出现
//   3. 同等级里，最久没练的排前面 —— 自然轮换，不会老是同几个
// 因为不设复习到期时间，任何时候都能开练；就算只有十个条目也会一直轮着出现。
import { MAX_STUDY_LEVEL, type StudyItemType } from '@/lib/schema';
import { shuffle } from '@/lib/utils';

export { MAX_STUDY_LEVEL };
export type { StudyItemType };

/** 前端拿到的进度快照：itemId -> 进度 */
export type ProgressMap = Record<number, { level: number; seenCount: number; lastSeenAt: string | null }>;

/** 没练过的条目在排序里当作 -1 级，永远排在 0 级前面 */
const NEVER_STUDIED = -1;

export function levelOf(id: number, progress: ProgressMap): number {
  return progress[id] ? progress[id].level : NEVER_STUDIED;
}

/**
 * 按「未学 → 生疏 → 熟练」排序，并取前 count 个。
 * count 传 0 或负数表示全部。
 */
export function pickForRound<T extends { id: number }>(
  items: T[],
  progress: ProgressMap,
  count: number
): T[] {
  // 先打乱，让同一档位内部（尤其是都没练过的）每轮顺序不同
  const ordered = shuffle(items).sort((a, b) => {
    const la = levelOf(a.id, progress);
    const lb = levelOf(b.id, progress);
    if (la !== lb) return la - lb;

    const ta = progress[a.id]?.lastSeenAt ? new Date(progress[a.id].lastSeenAt!).getTime() : 0;
    const tb = progress[b.id]?.lastSeenAt ? new Date(progress[b.id].lastSeenAt!).getTime() : 0;
    return ta - tb; // 最久没练的排前面
  });

  if (!count || count <= 0) return ordered;
  return ordered.slice(0, count);
}

/** 统计：未学 / 生疏 / 掌握 */
export function summarize<T extends { id: number }>(items: T[], progress: ProgressMap) {
  let fresh = 0;
  let learning = 0;
  let mastered = 0;

  for (const item of items) {
    const level = levelOf(item.id, progress);
    if (level === NEVER_STUDIED) fresh++;
    else if (level >= MAX_STUDY_LEVEL) mastered++;
    else learning++;
  }

  return { fresh, learning, mastered, total: items.length };
}

/** 答对升一级（封顶），答错直接掉回 0 */
export function nextLevel(current: number, correct: boolean): number {
  if (!correct) return 0;
  return Math.min(current + 1, MAX_STUDY_LEVEL);
}

/** 把一次作答结果发回服务端（失败也不打断练习） */
export async function reportResult(itemType: StudyItemType, itemId: number, correct: boolean) {
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, results: [{ itemId, correct }] }),
    });
  } catch {
    // 进度上报失败不影响本轮练习
  }
}

/** 批量上报（判断题一次交一组） */
export async function reportResults(itemType: StudyItemType, results: { itemId: number; correct: boolean }[]) {
  if (results.length === 0) return;
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, results }),
    });
  } catch {
    // 同上
  }
}

/** 拉取某一类内容的进度快照 */
export async function fetchProgress(itemType: StudyItemType): Promise<ProgressMap> {
  try {
    const res = await fetch(`/api/progress?itemType=${itemType}`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
