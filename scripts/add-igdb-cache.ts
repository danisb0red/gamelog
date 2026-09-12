/**
 * Create the `igdb_cache` table.
 *
 * `src/lib/db/schema.ts` has declared this table for a while, but it was never
 * actually created — `select from igdb_cache` errors with "relation does not
 * exist". So the IGDB response cache has only ever been the in-process Map,
 * which every new serverless instance starts empty. That is why `/` takes 8s
 * cold and ~0.8s warm: the first render on each instance pays for IGDB again.
 *
 * Unlike every other table here, this one gets **RLS enabled with no policies
 * at all**. It is server-side infrastructure, not user content: the app reaches
 * it as the `postgres` role, which bypasses RLS, while anyone holding the
 * publishable key gets nothing. Enabling RLS without policies is the deny-all
 * posture — leaving RLS off would expose the table to any client.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/add-igdb-cache.ts          # dry run
 *   npx tsx scripts/add-igdb-cache.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

const STEPS: { label: string; sql: string }[] = [
  {
    label: "create table igdb_cache",
    sql: `create table if not exists igdb_cache (
            key text primary key,
            value jsonb not null,
            expires_at timestamptz not null
          )`,
  },
  // Every read filters on expiry, and the sweep below deletes by it.
  {
    label: "index igdb_cache(expires_at)",
    sql: `create index if not exists igdb_cache_expires_at_idx on igdb_cache (expires_at)`,
  },
  {
    label: "enable RLS on igdb_cache (deny-all: no policies)",
    sql: `alter table igdb_cache enable row level security`,
  },
];

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — no changes will be made\n");

  for (const step of STEPS) {
    console.log(`  ${APPLY ? "→" : "·"} ${step.label}`);
    if (APPLY) await sql.unsafe(step.sql);
  }

  if (APPLY) {
    const rls = await sql`
      select c.relrowsecurity from pg_class c
      join pg_namespace ns on ns.oid = c.relnamespace
      where ns.nspname = 'public' and c.relname = 'igdb_cache'`;
    const pol = await sql`
      select count(*)::int n from pg_policies
      where schemaname = 'public' and tablename = 'igdb_cache'`;
    const on = (rls as unknown as { relrowsecurity: boolean }[])[0]?.relrowsecurity;
    const n = (pol as unknown as { n: number }[])[0].n;
    console.log(`\nigdb_cache: RLS ${on ? "enabled" : "OFF"}, ${n} policies (0 is correct here).`);
  } else {
    console.log("\nRe-run with --apply to write.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
