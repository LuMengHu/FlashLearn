# 英文词汇学习

此模块只服务个人 Cloze / Reading 备考。首页只有易混词、短语两类：分别显示「待复习」「没学过」，可以直接开始到期复习或新词学习。学习和复习共用表格：先看英文回忆中文，再揭晓；易混组每屏最多四词，短语每屏最多五条，每个词单独选择「认识／不认识」。点击英文词条、例句或辨析提示中的英文可调用浏览器 Web Speech API 朗读。

「不认识」留在没学过并在本轮末尾再出现一次；「认识」进入 1、3、7 天的复习链。同一天重复作答不会跳过间隔。网页和微信使用同一份 EnglishMemory；撤销通过 EnglishReviewEvents 恢复上次状态。词表按易混词、短语分类，练习选择器仅显示当前类别。可在管理页搜索、编辑、按组挑选、把过于简单的词移出练习，并随时恢复。笔记与辨析提示不显示材料来源或试卷位置。

## 数据来源与重建

`scripts/prepare-english-materials.py` 从用户提供的 Practice 2 HTML 解析词条，并结合对扫描版 132.pdf、Practice 1 2.1.pdf、Practice 1 2.2.pdf、Practice 3 2.1.pdf 的人工核对，生成 `scripts/data/english/curated-2026-09.json`。只保留真实易混关系、对 Cloze / Reading 有用的短语；基础拼写玩笑式对照与口语干扰项被排除。当前数据为 73 组（164 个独立易混词）与 146 条短语，共 310 条词条、7 份分类词表。

先执行 `npm run db:migrate -- 0010_english_two_categories` 增加词条排除状态和易混组标识。`npx tsx scripts/rebuild-english.ts` 会先完整备份所有英文表及英文学习进度到忽略提交的 `.local/backups/`，再在单个数据库事务中清除旧英文数据并导入整理数据。它不删除中文和外交题库，也不改 `scripts/data/words/words.json`。这是用户已确认的一次性重建；再次执行会再次清空英文学习进度。

检查：`npm run test:english`、`npx tsc --noEmit --pretty false`、`npm run build`。本机生产服务由 `FlashLearn English Local` 计划任务或 `scripts/start-english-local.ps1` 在 127.0.0.1:3000 启动；开发时可用 `npm run dev`。手机端已用真实 390px 视口检查首页、揭晓后的表格及词表管理，无横向溢出。

## 微信 / OpenClaw

腾讯的 `@tencent-weixin/openclaw-weixin` 插件管理 iLink 登录与消息收发；`integrations/openclaw` 把 `/vocab` 命令和 `flashlearn_vocab` 工具接到本站私有 `/api/english/bot`。插件不直接连接数据库。`FLASHLEARN_BOT_TOKEN` 应仅放在本机 `.env.local` 与 OpenClaw 私有配置，不能提交。两端网站与 Gateway 必须在电脑唤醒时运行。

- `/vocab 易混 5` 或 `/vocab 开始 5`：易混词小复习。
- `/vocab 短语 5`：短语小复习。
- `/vocab 词表`：查看两类词表；`/vocab 词表编号 18 5`：练指定词表（编号以当前列表为准）。
- `/vocab 答案`：揭晓；`/vocab 1` 不认识；`/vocab 2` 认识；`/vocab 继续` 恢复。

网站与微信共享词条的复习状态，但各自保存当前轮次。微信小复习用文本对照，网站提供完整表格与朗读。当前没有短文生成、Cloze 自动出题或 Reading 自动评分。
