# FlashLearn

单人使用的背题网站。三个分类：**中文**（六类知识点）、**英文**（AI 整理 + 背单词）、**外交知识**（选择题库）。
Next.js 15 App Router + Drizzle + Neon Postgres，部署在 Vercel。

---

## 常用命令

```bash
npm run dev                  # 开发服务器
npm run build                # 生产构建（⚠️ 别在 dev 跑着的时候执行，会把 .next 冲掉）
npx tsc --noEmit             # 只做类型检查，最快的自检方式
```

```bash
# —— 灌数据（三块互不影响，可以单独跑）——
npm run db:seed:banks        # 外交知识题库：清空 QuestionBanks/Questions 后按 bank-list.ts 重建
npm run db:seed:chinese      # 中文条目：读 scripts/data/chinese/*.json，按 type+front 增量 upsert
npm run db:seed:words        # 英文单词：读 scripts/data/words/words.json，按 word 增量 upsert
```

```bash
# —— 英文单词的两条录入路径 ——
npm run words:import              # 读 scripts/data/words/wordlist.txt（一行一个词），逐个调 AI 生成后入库
npm run words:import -- --force   # 库里已有的也重新生成覆盖
npm run words:export              # 把库里全部单词导出成 words.json，批量编辑后再 db:seed:words 灌回去
```

```bash
# —— 中文内容生成 ——
npm run gen:chinese          # 六类全生成
npm run gen:chinese pinyin   # 只生成某一类（char_confusion/pinyin/liushu/culture/author/classical）
```

```bash
# —— 改表结构 ——
npx drizzle-kit generate                # 改完 lib/schema.ts 后生成迁移 SQL
npm run db:migrate 0006_bizarre_ego     # 执行指定迁移（不带 .sql）
```

### 环境变量（`.env`，已 gitignore）

```
DATABASE_URL=   # Neon 连接串
AI_BASE_URL=    # https://www.dmxapi.cn/v1
AI_API_KEY=
AI_MODEL=       # gemini-3.8-flash
```

部署到 Vercel 要在项目设置里单独配 `AI_*` 三个，`.env` 不会被提交。

---

## 目录结构

```
app/
  page.tsx                首页：三个分类卡片 + 总量统计
  chinese/page.tsx        中文六入口
  chinese/[type]/         中文练习页（形式由 lib/chinese-meta.ts 决定）
  english/page.tsx        英文三入口
  english/study/          背单词
  english/new/            AI 录入单词
  english/list/           单词总表（搜索 + 就地编辑）
  diplomatic/page.tsx     题库列表
  diplomatic/[bankId]/    答题页
  api/chinese|words|progress/

components/
  layout/     page-shell, entry-card, empty-state, section-tabs   —— 页面骨架
  study/      round-starter, stat-bar, round-summary              —— 练习流程通用件
  chinese/    practice-loader + judgment/choice/recall 三种练习形式
  english/    word-study, word-editor, word-form, word-table
  diplomatic/ quiz-client, mcq-card, qa-card, quiz-card-shell, sub-bank-selector
  ui/         shadcn 原语，只留还在用的

lib/     db, schema, utils, ai(单词解析), study(选题与熟练度), chinese-meta(六类配置)
hooks/   use-quiz-engine, use-quiz-state（外交知识用）, use-speech
scripts/ seed-banks, seed-chinese, seed-words, import-words, export-words,
         generate-chinese, bank-list(题库清单), apply-migration
archive/ 停用的代码与数据，tsconfig 已 exclude，不参与构建
```

---

## 四张表，谁写谁

| 表 | 内容 | 谁写 |
| :--- | :--- | :--- |
| `QuestionBanks` / `Questions` | 外交知识题库 | 只有 `db:seed:banks`（**会先清空整张表**） |
| `Words` | 英文单词全部字段 | `words:import`、`db:seed:words`、录入页/总表的 API |
| `ChineseItems` | 中文六类条目，靠 `type` 区分 | `db:seed:chinese` |
| `StudyProgress` | 熟练度，`itemType`(word/chinese) + `itemId` | 每答一题即时上报 |

**关键点：`db:seed:banks` 只清空题库那两张表**，单词、中文条目、学习进度都不受影响。所以随便重灌题库，不会丢单词。

---

## 要记住的坑

**构建**
- `npm run build` 和 `npm run dev` 共用 `.next`，同时跑会把 dev 服务器搞挂（报一堆 `_buildManifest.js.tmp` ENOENT）。改完先停 dev 再 build。
- 改了路由文件名之后 `tsc` 可能报 `.next/types/validator.ts` 找不到旧路由 —— 那是缓存，`rm -rf .next` 再跑就行。

**数据库**
- 项目历史上一直用 `drizzle-kit push`，**没有 `__drizzle_migrations` 表**，所以 `drizzle-kit migrate` 会从 0000 开始重放然后报表已存在。要执行迁移就用 `npm run db:migrate <文件名>`（`scripts/apply-migration.ts` 直接跑那个 SQL 文件）。
- `drizzle-kit push` 是交互式的，非交互 shell 里会卡在选择菜单。
- `mode` 列在数据库里是**普通 text，没有 CHECK 约束**，`lib/schema.ts` 里的 enum 只是 TS 层面的。所以加一个新 mode 不需要迁移。
- neon-http 驱动**不支持事务**，要原子性得用 `db.batch()`。

**内容/数据**
- 外交知识那个题库名用的是**繁体「外交知識」**，grep 的时候别写成简体「识」。
- `bank-list.ts` 里父题库和第一个子题库都指向 `diplomatic1.json`，所以这 100 题会被插两遍——题目总数看着偏多是这个原因，不是 bug。
- 中文那 162 条种子数据是 AI 生成的，**没有逐条人工核对过**，发现错的直接改 `scripts/data/chinese/*.json` 再 `db:seed:chinese`。
- Windows 这个 shell 打印中文会变乱码（`??????`），是控制台编码问题，**文件本身是好的**，用 Read 工具看就正常。

**逻辑**
- 选题只看等级、**不看时间**：没练过的排最前 → 等级低的优先 → 同级里最久没练的优先。答对升一级（封顶 5），答错掉回 0。故意不做复习到期时间，这样十个单词也能一直循环练，不会出现"今天练完了要等明天"。
- **外交知识不参与**这套机制，进去就是整套题库按原顺序。
- `use-quiz-engine` 里那个 `attempt` 计数是用来当卡片 `key` 一部分的，别删：选择题选完答案后题目仍留在待答队列里（要点「下一题」才出队），此时撤销如果不特殊处理会把题目重复插进队列，且卡片因为 key 没变不会重新挂载 →「下一题」按钮消失、选项锁死。
- AI 返回的 JSON 可能带 ```json 围栏，`lib/ai.ts` 的 `extractJson` 已经处理了，加新的 AI 调用记得复用。

---

## 加东西的位置

- **加一个中文入口**：`lib/chinese-meta.ts` 加一项（决定标题/图标/练习形式）→ `lib/schema.ts` 的 `CHINESE_TYPES` 加类型 → `scripts/generate-chinese.ts` 加生成规则 → 跑 gen + seed。练习形式复用现成三种（judgment 判断 / choice 单选 / recall 回忆）就不用写新组件。
- **加单词字段**：`lib/schema.ts` 的 `words` 表 → 生成并执行迁移 → `lib/ai.ts` 的 prompt 和 `normalizeDraft` → `word-form.tsx` 的标签页 → `word-study.tsx` 的展示 → `api/words/route.ts` 的 `toWordRow` 白名单（**这里不加就存不进去**）。
