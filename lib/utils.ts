// 通用工具函数：className 合并、数组洗牌、随机隐藏字段选取
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS classes with support for conditional classes.
 * This is a standard utility from shadcn/ui.
 * @param inputs The class values to merge.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param array The array to shuffle.
 * @returns The shuffled array.
 */
export function shuffle<T>(array: T[]): T[] {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * 从一组字段中随机选一个作为"展示"，其余满足 isValid 的字段作为待隐藏集合返回。
 * 供 pos/verb-forms 表格"每行只显现一个格子，其余待填空"的交互复用。
 */
export function pickHiddenKeys(
  data: Record<string, any>,
  isValid: (value: any) => boolean
): Set<string> {
  const validKeys = Object.keys(data).filter((key) => isValid(data[key]));
  if (validKeys.length === 0) return new Set();
  const keyToShow = validKeys[Math.floor(Math.random() * validKeys.length)];
  return new Set(validKeys.filter((key) => key !== keyToShow));
}
