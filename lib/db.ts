// lib/db.ts

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// 尝试多个环境变量，优先使用 DATABASE_URL，如果失败则尝试其他
function getDatabaseUrl(): string {
  const urls = [
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ].filter(Boolean) as string[];
  
  if (urls.length === 0) {
    throw new Error('No database URL found in environment variables. Please check your .env file.');
  }
  
  console.log(`Using database URL from ${urls[0] === process.env.DATABASE_URL ? 'DATABASE_URL' : 
               urls[0] === process.env.DATABASE_URL_UNPOOLED ? 'DATABASE_URL_UNPOOLED' :
               urls[0] === process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'POSTGRES_URL_NON_POOLING'}`);
  
  return urls[0];
}

// 创建 Neon serverless 驱动的 SQL 客户端
const databaseUrl = getDatabaseUrl();
const sql = neon(databaseUrl);

// 将 Drizzle ORM 连接到 SQL 客户端，并注入我们的 schema
export const db = drizzle(sql, { schema });
