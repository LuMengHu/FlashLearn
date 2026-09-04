// 中文六个入口的展示信息与练习方式，页面和路由都从这里取，避免各处硬编码
import type { ChineseType } from '@/lib/schema';

/** 练习交互的三种形式 */
export type ChineseQuizKind =
  | 'judgment'  // 一次给多条，其中部分是错的，判断哪些有错（易错字、拼音）
  | 'choice'    // 从固定选项里选一个（六书）
  | 'recall';   // 看正面回忆，揭晓答案后自评（文化、作者、文言）

export type ChineseMeta = {
  type: ChineseType;
  title: string;
  description: string;
  emoji: string;
  kind: ChineseQuizKind;
  /** judgment 类型：每轮出几条 */
  batchSize?: number;
  /** choice 类型：可选项 */
  choices?: string[];
  /** recall 类型：正面上方的提示语 */
  recallHint?: string;
};

export const CHINESE_META: ChineseMeta[] = [
  {
    type: 'char_confusion',
    title: '易错字辨析',
    description: '一次六个词，挑出写错的那几个',
    emoji: '✍️',
    kind: 'judgment',
    batchSize: 6,
  },
  {
    type: 'pinyin',
    title: '拼音',
    description: '一次六个注音，挑出注错的那几个',
    emoji: '🔤',
    kind: 'judgment',
    batchSize: 6,
  },
  {
    type: 'liushu',
    title: '六书',
    description: '判断这个字属于六书里的哪一类',
    emoji: '🈯',
    kind: 'choice',
    choices: ['象形', '指事', '会意', '形声', '转注', '假借'],
  },
  {
    type: 'culture',
    title: '文化常识',
    description: '科举、官职、称谓、礼仪、历法',
    emoji: '🏮',
    kind: 'recall',
    recallHint: '先在心里回答，再看答案',
  },
  {
    type: 'author',
    title: '作者常识',
    description: '朝代、字号、代表作',
    emoji: '📜',
    kind: 'recall',
    recallHint: '回忆他的朝代、称号和代表作',
  },
  {
    type: 'classical',
    title: '文言常识',
    description: '高频文言实词虚词的释义与例句',
    emoji: '📖',
    kind: 'recall',
    recallHint: '回忆它在文言里的意思',
  },
];

export function getChineseMeta(type: string): ChineseMeta | undefined {
  return CHINESE_META.find(m => m.type === type);
}
