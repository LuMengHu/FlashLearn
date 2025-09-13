// lib/db.ts

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

// 创建 Neon serverless 驱动的 SQL 客户端
const sql = neon(process.env.DATABASE_URL!);

// 将 Drizzle ORM 连接到 SQL 客户端，并注入我们的 schema
export const db = drizzle(sql, { schema });
