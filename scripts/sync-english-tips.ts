import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Group = { tip: string };
async function main() {
  const source = join(process.cwd(), 'scripts/data/english/curated-2026-09.json');
  const groups = (JSON.parse(readFileSync(source, 'utf8')) as { groups: Group[] }).groups;
  if (groups.length !== 73 || groups.some(group => !group.tip?.trim())) throw new Error('辨析提示数量或内容不正确，停止同步。');
  const sql = neon(process.env.DATABASE_URL!);
  const before = await sql.query('SELECT group_key,tip FROM "EnglishConfusions" WHERE group_key LIKE $1 ORDER BY group_key,id', ['curated:%']);
  const existingKeys = new Set(before.map(row => String(row.group_key)));
  if (existingKeys.size !== groups.length || groups.some((_, index) => !existingKeys.has('curated:' + index))) {
    throw new Error('数据库中的易混组与整理文件不匹配，停止同步。');
  }
  const folder = join(process.cwd(), '.local', 'backups');
  mkdirSync(folder, { recursive: true });
  const path = join(folder, 'english-tips-before-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json');
  writeFileSync(path, JSON.stringify(before, null, 2), { encoding: 'utf8', flag: 'wx' });
  const rows = groups.map((group, index) => ({ groupKey: 'curated:' + index, tip: group.tip }));
  const updated = await sql.query('UPDATE "EnglishConfusions" AS c SET tip=x.tip FROM jsonb_to_recordset($1::jsonb) AS x("groupKey" text, tip text) WHERE c.group_key=x."groupKey" RETURNING c.group_key', [JSON.stringify(rows)]);
  if (updated.length !== before.length) throw new Error('更新条数不匹配，请检查备份：' + path);
  console.log(JSON.stringify({ groups: existingKeys.size, pairs: updated.length, backup: path }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
