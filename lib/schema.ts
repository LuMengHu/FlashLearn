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
  phonetic: text('phonetic'),                                          // 音标
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
