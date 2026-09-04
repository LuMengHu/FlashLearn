# 归档目录

存放当前**不再使用**、但保留以备将来恢复的内容。主目录只留正在跑的代码。

不参与构建：`tsconfig.json` 的 `exclude` 里有 `archive`，Tailwind 的 `content` 也不扫这里，
所以里面的 `.tsx` 不会被类型检查、打包或部署。

## 目录说明

| 路径 | 内容 |
| :--- | :--- |
| `question-banks.archived.ts` | 精简前的完整题库清单，含全部题库定义，可直接复制恢复 |
| `data/` | 归档题库的题目 JSON（原 `scripts/data/` 下除外交知识外的目录） |
| `covers/` | 归档题库的封面图 |
| `quiz-modes/` | 8 个已停用的背题模式组件：`pos` / `verb_forms` / `sbs` / `contextual_cloze` / `poetry_pair` / `poetry_completion` / `layered_reveal` / `initial_hint` |
| `hooks/` | 只服务于批次模式的 hook：`use-batch-processor.ts`、`use-media-query.ts` |
| `home-carousel/` | 旧首页的 Swiper 轮播那一套：`bank-card` / `bank-carousel` / `bank-selection-sheet` / `category-tabs`，以及只被它们用到的 `sheet.tsx`、`scroll-area.tsx` |

## 恢复一个题库

1. 从 `question-banks.archived.ts` 把对应条目复制回 `scripts/bank-list.ts` 的 `banksToSeed`。
2. 数据目录移回：`archive/data/<name>/` → `scripts/data/<name>/`。
3. 封面移回：`archive/covers/xxx.png` → `public/covers/`。
4. 如果它用的是已停用的模式（如 `layered_reveal`），把组件从 `archive/quiz-modes/` 移回
   `components/diplomatic/`，在 `quiz-client.tsx` 里加回 `dynamic()` 导入和 `switch` 分支，
   并把该 mode 加回 `lib/schema.ts` 与 `scripts/bank-list.ts` 的 mode 联合类型。
   批次类模式（`pos`/`verb_forms`/`sbs`/`contextual_cloze`）还要把 `archive/hooks/` 的两个 hook
   移回 `hooks/`，并恢复 `use-quiz-engine.ts`/`use-quiz-state.ts` 里的批次逻辑（见 git 历史）。
5. `npm run db:seed:banks`。

## 恢复旧首页轮播

`home-carousel/` 里的组件依赖 `swiper`（和 `sheet` 依赖的 `@radix-ui/react-dialog`、
`scroll-area` 依赖的 `@radix-ui/react-scroll-area`），这些包**已经卸载**，恢复时要先装回来。
另外旧轮播还依赖 `app/globals.css` 里的 `.swiper-*` 样式，那部分也已删除，需要从 git 历史找回。
