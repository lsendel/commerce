import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function columns(sql: ReturnType<typeof neon>, table: string) {
  return sql`
    select column_name
    from information_schema.columns
    where table_schema='public' and table_name=${table}
    order by ordinal_position
  `;
}

async function tableExists(sql: ReturnType<typeof neon>, table: string) {
  const rows = await sql`
    select 1 as ok
    from information_schema.tables
    where table_schema='public' and table_name=${table}
  `;
  return rows.length > 0;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const checks = ['carts', 'analytics_events', 'analytics_daily_rollups', 'analytics_funnels'];
  for (const t of checks) {
    const exists = await tableExists(sql, t);
    console.log(`${t}: ${exists ? 'exists' : 'missing'}`);
    if (exists) {
      const cols = await columns(sql, t);
      console.log(cols.map((c: any) => c.column_name).join(', '));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
