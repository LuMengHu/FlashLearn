# FlashLearn - 科学高效的背题网站

一个富有科技感和3D效果的、专注于核心背题体验的极简网站。

![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-brightgreen?style=for-the-badge&logo=vercel)![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

---

## 🚀 项目概述

**FlashLearn** 的核心目标是帮助用户更科学、高效地记忆题目。它刻意简化了功能，将所有题库管理（增删改查）完全置于后端（直接操作数据库），从而让前端专注于为用户打磨一个流畅、美观、沉浸式的核心背题体验。

### ✨ 核心设计原则

1. **无登录系统**: 项目不设用户登录和前端创建题库的功能。所有题库的增删改查都将在数据库中通过SQL指令直接完成。
2. **后端驱动**: 前端是一个纯粹的“渲染器”，它只负责展示由后端和数据库定义好的题库结构与题目类型。
3. **视觉风格**: 页面设计以深色调为主，营造强烈的科技感和现代感。
4. **模式多样**: 支持问答、选择、诗词配对、填空、分层释义等多种背题模式，灵活性高。

---

## 🛠️ 技术栈


| 分类       | 技术                                                                                                       |
| :--------- | :--------------------------------------------------------------------------------------------------------- |
| **框架**   | [Next.js](https://nextjs.org/) (App Router)                                                                |
| **UI**     | [React](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) |
| **动画**   | [Swiper.js](https://swiperjs.com/) (用于轮播), [Framer Motion](https://www.framer.com/motion/) (可选)      |
| **数据库** | [Neon](https://neon.tech/) (Serverless Postgres)                                                           |
| **ORM**    | [Drizzle ORM](https://orm.drizzle.team/)                                                                   |
| **部署**   | [Vercel](https://vercel.com/)                                                                              |

---

## 🏁 快速开始

### 依赖环境

- Node.js (v18.17 或更高版本)
- `npm`

### 安装与运行

1. **克隆仓库**

   ```bash
   git clone https://github.com/your-username/flashlearn.git
   cd flashlearn
   ```
2. **安装依赖**

   ```bash
   npm install
   ```
3. **配置环境变量**
   复制 `.env.example` 文件为 `.env`，并填入你的 Neon 数据库连接字符串。

   ```
   DATABASE_URL="your_neon_database_url_here"
   ```
4. **本地开发**
   启动本地开发服务器。

   ```bash
   npm run dev
   ```

   在浏览器中打开 `http://localhost:3000`。

---

## ⚙️ 数据库管理

本项目的所有数据管理都在后端完成。

- **数据结构定义**: `lib/schema.ts`
- **数据填充脚本**: `scripts/seed.ts`
- **数据库迁移**: 使用 `drizzle-kit` 工具进行管理。

```bash
# 运行种子脚本，初始化数据库
npm run db:seed

# 在修改 schema 后，生成迁移文件
npx drizzle-kit generate

# 将生成的迁移文件推送到数据库
npx drizzle-kit push
```
