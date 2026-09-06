// supabase/seed/seed.sql 생성. 실행: npm run seed:gen
import fs from 'fs';
import path from 'path';
import { buildSeedSql } from '../app/lib/bom/seed';

const out = path.join(process.cwd(), 'supabase', 'seed', 'seed.sql');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, buildSeedSql(), 'utf8');
console.log(`시드 SQL 생성: ${out}`);
