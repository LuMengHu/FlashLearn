# 本地运行
    npm run dev
    yarn dev
    pnpm dev
    bun dev**

# 运行种子脚本
    npm run db:seed

  **npx drizzle-kit generate**
预期输出: drizzle-kit 会连接到你的 Neon 数据库，进行比较，然后你会看到类似 ✔ Migration generated successfully! 的提示。同时，在你的项目根目录下会出现一个新的文件夹 drizzle，里面包含了一个 .sql 文件，文件的内容大致如下：
  //ALTER TABLE "QuestionBanks" ADD COLUMN "category" text DEFAULT 'General' NOT NULL;//

最后一步，我们将这个生成的 SQL 文件推送到 Neon 数据库执行。
  **npx drizzle-kit push**
预期输出: drizzle-kit 会将 drizzle 文件夹下的 SQL 推送到 Neon 执行。你会看到类似 ✔ Schema pushed successfully! 的提示。
验证: 此时，如果你登录 Neon 控制台，查看 QuestionBanks 表的结构，你会惊喜地发现 category 这一列已经被成功添加了！
    