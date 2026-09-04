// 手动执行指定的 drizzle 迁移文件：npm run db:migrate <迁移文件名，不含 .sql>
// （项目历史上用的是 drizzle-kit push，没有 __drizzle_migrations 记录表，所以用这个脚本按需执行单个迁移）
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('用法: npx tsx scripts/apply-migration.ts <迁移文件名，不含 .sql>');
    process.exit(1);
  }

  const file = path.join(__dirname, '..', 'drizzle', `${name}.sql`);
  const raw = fs.readFileSync(file, 'utf-8');
  const statements = raw
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    console.log('▶ ' + statement.split('\n')[0]);
    await sql.query(statement);
  }
  console.log(`✅ ${name} 执行完成`);
}

main().catch(err => {
  console.error('❌ 执行失败:', err);
  process.exit(1);
});
