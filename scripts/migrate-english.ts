import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function main(){
 const sql=neon(process.env.DATABASE_URL!);
 const [state]=await sql.query(`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='Words' AND column_name='kind') AS migrated`);
 if(state.migrated){console.log('English schema is already present. No migration applied.');return;}
 const [before]=await sql.query('SELECT count(*)::int AS count FROM "Words"');
 const snapshot={words:await sql.query('SELECT * FROM "Words"'),progress:await sql.query('SELECT * FROM "StudyProgress" WHERE item_type=$1',['word'])};
 const backupDir=path.resolve('.local/backups');await mkdir(backupDir,{recursive:true});
 await writeFile(path.join(backupDir,`english-before-${Date.now()}.json`),JSON.stringify(snapshot,null,2));
 const source=await readFile(path.resolve('drizzle/0008_english_workspace.sql'),'utf8');
 const statements=source.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
 await sql.transaction(statements.map(statement=>sql.query(statement)));
 const [after]=await sql.query('SELECT count(*)::int AS count FROM "Words"');
 console.log(JSON.stringify({migrated:true,wordsBefore:before.count,wordsAfter:after.count,backup:'.local/backups'},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
