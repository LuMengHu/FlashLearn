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
  mode: text('mode', { enum: ['qa', 'mcq', 'pos', 'sbs', 'verb_forms', 'poetry_pair', 'poetry_completion', 'layered_reveal', 'initial_hint', 'contextual_cloze'] }).notNull(),
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

// --- 关系定义 (RELATIONS) ---
export const questionBanksRelations = relations(questionBanks, ({ one, many }) => ({
  questions: many(questions, {
    relationName: 'bankToQuestions'
  }),

  // 【核心修复】parent 和 subBanks 是同一关系的两面，必须使用同一个 relationName
  parent: one(questionBanks, {
    fields: [questionBanks.parentId],
    references: [questionBanks.id],
    relationName: 'parentSubBankRelationship', // <-- 使用一个统一的、描述性的名称
  }),
  subBanks: many(questionBanks, {
    relationName: 'parentSubBankRelationship', // <-- 使用与上面完全相同的名称
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
