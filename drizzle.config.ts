// drizzle.config.ts

// 从 'drizzle-kit' 导入 Config 类型
import type { Config } from 'drizzle-kit';
import 'dotenv/config';

// 直接导出一个符合 Config 类型的对象
export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} as Config;
