// lib/schema.ts

import {
  pgTable,
  bigserial,
  text,
  timestamp,
  jsonb,
  integer,
  bigint,
} from 'drizzle-orm/pg-core';
// 【新】导入 relations 相关的函数
import { relations } from 'drizzle-orm';

// 1. QuestionBanks 表 (题库表)
export const questionBanks = pgTable('QuestionBanks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  cover_image_url: text('cover_image_url'),
  // 【修改】添加 'poetry_pair' 和 'poetry_completion'
  mode: text('mode', { enum: ['qa', 'mcq', 'poetry_pair', 'poetry_completion'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// 2. Questions 表 (题目表)
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


// --- 【新】关系定义 (RELATIONS) ---
// 这部分代码是解决问题的关键

// 定义 'questionBanks' 表的关系
export const questionBanksRelations = relations(questionBanks, ({ many }) => ({
  // 一个题库 (questionBank) 可以有多个题目 (questions)
  questions: many(questions),
}));

// 定义 'questions' 表的关系
export const questionsRelations = relations(questions, ({ one }) => ({
  // 一个题目 (question) 只属于一个题库 (bank)
  bank: one(questionBanks, {
    fields: [questions.bankId], // 'questions' 表中的外键字段
    references: [questionBanks.id], // 'questionBanks' 表中被引用的主键字段
  }),
}));


// --- 类型定义 (保持不变) ---
export type QuestionBank = typeof questionBanks.$inferSelect;
export type NewQuestionBank = typeof questionBanks.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
