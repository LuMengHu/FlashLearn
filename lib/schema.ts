// Drizzle 数据库表结构定义：题库（questionBanks）、题目（questions）与背单词的单词表（words）
import {
  pgTable,
  bigserial,
  text,
  timestamp,
  jsonb,
  integer,
  bigint,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const questionBanks = pgTable('QuestionBanks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  cover_image_url: text('cover_image_url'),
  mode: text('mode', { enum: ['qa', 'mcq'] }).notNull(),
  category: text('category').notNull().default('General'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  parentId: bigint('parent_id', { mode: 'number' }).references((): any => questionBanks.id),
  metadata: jsonb("metadata").default({}), 
});

export const questions = pgTable('Questions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  bankId: bigint('bank_id', { mode: 'number' })
    .notNull()
    .references(() => questionBanks.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  answer: text('answer').notNull(),
  options: jsonb('options'),
  correctOptionIndex: integer('correct_option_index'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// --- 背单词：单词表 ---
// 与 QuestionBanks/Questions 完全独立，因此 `npm run db:seed` 重建题库时不会影响这里的单词数据。

/** 一条需要记住的含义 */
export type WordSense = {
  pos?: string;          // 词性，如 n. / v. / adj.
  meaning: string;       // 中文释义
  example?: string;      // 英文例句
  translation?: string;  // 例句中文翻译
};

/** 词源家族里的一个变形词 */
export type WordFamilyItem = {
  word: string;      // 变形后的单词，如 resistance
  pos?: string;      // 词性
  meaning: string;   // 中文释义
};

/** 一个容易混淆的相似单词 */
export type ConfusableItem = {
  word: string;      // 长得像的单词
  meaning: string;   // 它的中文释义
  tip?: string;      // 区分技巧
};

export const words = pgTable('Words', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  word: text('word').notNull(),                                        // 英文单词（背诵时的正面）
  meaning: text('meaning').notNull(),                                  // 主释义（背诵时的答案）
  senses: jsonb('senses').$type<WordSense[]>().default([]),            // 需要记住的分条含义
  family: jsonb('family').$type<WordFamilyItem[]>().default([]),       // 词源家族变形
  confusables: jsonb('confusables').$type<ConfusableItem[]>().default([]), // 易混词
  etymology: text('etymology'),                                        // 词源说明
  notes: text('notes'),                                                // 自己补充的笔记
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // 同一个单词只保留一条，重复录入时走「更新」而不是新增
  wordUnique: uniqueIndex('Words_word_unique').on(table.word),
}));

// --- 中文：六类知识条目 ---
// 六个入口共用一张表，靠 type 区分；各类型自己的额外结构放在 payload 里。
// 同样与题库表无关，seed 题库不会影响这里。

/** 中文入口的类型 */
export const CHINESE_TYPES = [
  'char_confusion', // 易错字辨析
  'pinyin',         // 拼音
  'liushu',         // 六书
  'culture',        // 文化常识
  'author',         // 作者常识
  'classical',      // 文言常识
] as const;

export type ChineseType = (typeof CHINESE_TYPES)[number];

/** 作者常识的代表作 / 文言常识的例句等，放在 payload 里 */
export type ChinesePayload = {
  dynasty?: string;        // 作者：朝代
  works?: string[];        // 作者：代表作
  aka?: string;            // 作者：字号 / 称号
  examples?: {             // 文言常识：例句
    sentence: string;
    translation: string;
  }[];
  senses?: {               // 文言常识：一词多义
    meaning: string;
    example?: string;
  }[];
};

export const chineseItems = pgTable('ChineseItems', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  type: text('type', { enum: CHINESE_TYPES }).notNull(),
  front: text('front').notNull(),   // 正面：词语 / 字 / 问题 / 作者名
  back: text('back').notNull(),     // 答案：正确写法 / 正确读音 / 六书类别 / 答案正文
  wrong: text('wrong'),             // 错误形式（易错字、拼音用；出题时故意展示的错版）
  note: text('note'),               // 辨析说明 / 解释
  payload: jsonb('payload').$type<ChinesePayload>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  // 同一类型下，同一个正面词条只保留一条
  typeFrontUnique: uniqueIndex('ChineseItems_type_front_unique').on(table.type, table.front),
}));

// --- 关系定义 (RELATIONS) ---
export const questionBanksRelations = relations(questionBanks, ({ one, many }) => ({
  questions: many(questions, {
    relationName: 'bankToQuestions'
  }),

  // parent 和 subBanks 是同一个自关联关系的两面，relationName 必须完全一致
  parent: one(questionBanks, {
    fields: [questionBanks.parentId],
    references: [questionBanks.id],
    relationName: 'parentSubBankRelationship',
  }),
  subBanks: many(questionBanks, {
    relationName: 'parentSubBankRelationship',
  }),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  bank: one(questionBanks, {
    fields: [questions.bankId],
    references: [questionBanks.id],
    relationName: 'bankToQuestions'
  }),
}));

// --- 类型定义 ---
export type QuestionBank = typeof questionBanks.$inferSelect & {
  questions?: Question[];
  subBanks?: (QuestionBank & { questions?: Question[] })[];
};
export type NewQuestionBank = typeof questionBanks.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Word = typeof words.$inferSelect;
export type NewWord = typeof words.$inferInsert;
export type ChineseItem = typeof chineseItems.$inferSelect;
export type NewChineseItem = typeof chineseItems.$inferInsert;
