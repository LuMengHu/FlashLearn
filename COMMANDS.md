# ⚡ FlashLearn 开发指令备忘录

这份文档用来记录开发过程中常用但容易忘记的指令，方便快速查阅。

## 🛠️ 日常开发 (Daily Development)

### 启动本地开发服务器

打开 `http://localhost:3000` 即可预览。

```bash
npm run dev
```

---

## 🗃️ 数据库管理 (Database Management)

### 填充种子数据

```bash
npm run db:seed
```

### 数据库迁移 (Drizzle-Kit)

当你修改了 `lib/schema.ts` 中的表结构（例如增删字段）后，需要遵循以下三步来更新线上数据库。

**第一步：修改 Schema 文件**

手动编辑 `lib/schema.ts` 文件，例如为 `QuestionBanks` 表添加 `category` 字段。

```ts
// lib/schema.ts
export const questionBanks = pgTable('QuestionBanks', {
  // ... 其他字段
  category: text('category').default('General').notNull(), // 新增字段
});
```

**第二步：生成迁移文件**

运行以下命令，Drizzle Kit 会自动比较你的 Schema 和数据库的当前状态，并生成一个 SQL 迁移文件。

```bash
pnpm drizzle-kit generate
```

- **预期输出**: 终端会提示 `✔ Migration generated successfully!`。
- **结果**: 在项目根目录会创建一个 `drizzle` 文件夹，里面包含了一个新的 `.sql` 文件，记录了具体的数据库变更指令。

**第三步：推送迁移至数据库**

运行以下命令，将上一步生成的 SQL 文件应用到你的 Neon 数据库。

```bash
pnpm drizzle-kit push
```

- **预期输出**: 终端会提示 `✔ Schema pushed successfully!`。
- **验证**: 登录 Neon 控制台，检查对应的表结构，你会发现新的字段已经被成功添加。

