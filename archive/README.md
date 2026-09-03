# 归档目录

这里存放当前**不再使用**、但保留以备将来恢复的内容。主目录只保留正在使用的代码和数据。

本目录不参与构建：`tsconfig.json` 里已经把 `archive` 加入 `exclude`，Tailwind 的 `content` 也不扫描这里，
所以里面的 `.tsx` 不会被类型检查、打包或部署。

## 目录说明

| 路径 | 内容 |
| :--- | :--- |
| `question-banks.archived.ts` | 归档前 `scripts/question-banks.ts` 的完整题库清单（含所有题库定义，可直接复制恢复） |
| `data/` | 归档题库的题目 JSON（原 `scripts/data/` 下除 `mcq/` 外的全部目录） |
| `covers/` | 归档题库的封面图（原 `public/covers/`） |
| `quiz-modes/` | 归档的背题模式组件：`pos` / `verb_forms` / `sbs` / `contextual_cloze` / `poetry_pair` / `poetry_completion` / `layered_reveal` / `initial_hint` |
| `hooks/` | 只服务于上述批次模式的 hook：`use-batch-processor.ts`、`use-media-query.ts` |

## 如何恢复一个题库

1. 从 `question-banks.archived.ts` 里把对应的条目复制回 `scripts/question-banks.ts` 的 `banksToSeed`。
2. 把它的数据目录从 `archive/data/<name>/` 移回 `scripts/data/<name>/`。
3. 把封面图从 `archive/covers/xxx.png` 移回 `public/covers/`。
4. 如果它用的是已归档的模式（比如 `layered_reveal`），把对应组件从 `archive/quiz-modes/` 移回
   `components/quiz/`，在 `components/quiz/quiz-client.tsx` 里重新加上 `dynamic()` 导入和 `switch` 分支，
   并把该 mode 加回 `lib/schema.ts` 与 `scripts/question-banks.ts` 的 mode 联合类型。
   批次类模式（`pos` / `verb_forms` / `sbs` / `contextual_cloze`）还需要把 `archive/hooks/` 里的两个 hook
   移回 `hooks/`，并恢复 `use-quiz-engine.ts` / `use-quiz-state.ts` 里的批次逻辑（见 git 历史）。
5. 运行 `npm run db:seed` 重新灌库。

> ⚠️ `npm run db:seed` 会**清空并重建** `QuestionBanks` 和 `Questions` 两张表。
> 背单词的 `Words` 表是独立的，不受影响。
