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
import { relations } from 'drizzle-orm';

export const questionBanks = pgTable('QuestionBanks', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  cover_image_url: text('cover_image_url'),
  mode: text('mode', { enum: ['qa', 'mcq', 'P_pair', 'P_completion', 'lr'] }).notNull(),
  category: text('category').notNull().default('General'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  parentId: bigint('parent_id', { mode: 'number' }).references((): any => questionBanks.id),
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

// --- 关系定义 (RELATIONS) ---
export const questionBanksRelations = relations(questionBanks, ({ one, many }) => ({
  // 【修复】为关系添加唯一的 relationName，并明确关联字段
  questions: many(questions, {
    relationName: 'bankToQuestions'
  }),
  parent: one(questionBanks, {
    fields: [questionBanks.parentId],
    references: [questionBanks.id],
    relationName: 'subBanks',
  }),
  subBanks: many(questionBanks, {
    relationName: 'subBanks',
  }),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  // 【修复】使用与上面匹配的 relationName
  bank: one(questionBanks, {
    fields: [questions.bankId],
    references: [questionBanks.id],
    relationName: 'bankToQuestions'
  }),
}));

// --- 类型定义 ---
export type QuestionBank = typeof questionBanks.$inferSelect;
export type NewQuestionBank = typeof questionBanks.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
