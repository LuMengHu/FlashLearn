// 英文复习入口（作文句型 / 词汇升级）的展示信息，页面和路由都从这里取
import type { EnglishType } from '@/lib/schema';

export type EnglishMeta = {
  type: EnglishType;
  title: string;
  description: string;
  emoji: string;
  /** 正面上方的提示语 */
  hint: string;
  /** 题量单位 */
  unit: string;
};

export const ENGLISH_META: EnglishMeta[] = [
  {
    type: 'essay_pattern',
    title: '作文句型',
    description: '看中文默写句型，重点是固定搭配和语法点',
    emoji: '✍️',
    hint: '先在心里把空格补出来，再看答案',
    unit: '句',
  },
  {
    type: 'word_upgrade',
    title: '词汇升级',
    description: '给一个简单词，说出能取代它的高级说法',
    emoji: '⬆️',
    hint: '想想写作时该用哪些词替换它',
    unit: '组',
  },
];

export function getEnglishMeta(type: string): EnglishMeta | undefined {
  return ENGLISH_META.find(m => m.type === type);
}
