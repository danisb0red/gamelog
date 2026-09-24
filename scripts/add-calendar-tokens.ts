/**
 * Create the `calendar_tokens` table (private .ics feed credentials).
 *
 * New table only — nothing existing is altered. Like `igdb_cache` it gets RLS
 * enabled with **no policies**: the app reaches it as the `postgres` role,
 * which bypasses RLS, while anyone holding the publishable key gets nothing.
 * Only a SHA-256 of each token is stored, and the table is separate from
 * `profiles` because profiles are publicly readable.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/add-calendar-tokens.ts          # dry run
 *   npx tsx scripts/add-calendar-tokens.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

const STEPS: { label: string; sql: string }[] = [
  {
    label: "create table calendar_tokens",
    sql: `create table if not exists calendar_tokens (
            user_id uuid primary key references profiles(id) on delete cascade,
            token_hash text not null unique,
            created_at timestamptz not null default now(),
            last_used_at timestamptz
          )`,
  },
  {
    label: "enable RLS on calendar_tokens (deny-all: no policies)",
    sql: `alter table calendar_tokens enable row level security`,
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
      where ns.nspname = 'public' and c.relname = 'calendar_tokens'`;
    const pol = await sql`
      select count(*)::int n from pg_policies
      where schemaname = 'public' and tablename = 'calendar_tokens'`;
    const on = (rls as unknown as { relrowsecurity: boolean }[])[0]?.relrowsecurity;
    const n = (pol as unknown as { n: number }[])[0].n;
    console.log(`\ncalendar_tokens: RLS ${on ? "enabled" : "OFF"}, ${n} policies (0 is correct here).`);
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
