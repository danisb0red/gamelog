/**
 * Create the `feedback` table behind /feedback.
 *
 * Like `igdb_cache` and `calendar_tokens`, RLS is enabled with **no policies**:
 * the table holds people's messages and optional email addresses, so it must be
 * unreachable with the publishable key. The app reaches it as `postgres`, which
 * bypasses RLS. A script rather than `drizzle-kit push`, which would create the
 * table wide open.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/add-feedback.ts          # dry run
 *   npx tsx scripts/add-feedback.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

const STEPS: { label: string; sql: string }[] = [
  {
    label: "create table feedback",
    sql: `create table if not exists feedback (
            id uuid primary key default gen_random_uuid(),
            message text not null,
            contact text,
            user_id uuid references profiles(id) on delete set null,
            sender_hash text not null,
            created_at timestamptz not null default now()
          )`,
  },
  // The rate limit counts recent rows per sender.
  {
    label: "index feedback(sender_hash, created_at)",
    sql: `create index if not exists feedback_sender_hash_created_at_idx on feedback (sender_hash, created_at)`,
  },
  {
    label: "enable RLS on feedback (deny-all: no policies)",
    sql: `alter table feedback enable row level security`,
  },
];

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — no changes will be made\n");

  for (const step of STEPS) {
    console.log(`  ${APPLY ? "→" : "·"} ${step.label}`);
    if (APPLY) await sql.unsafe(step.sql);
  }

  if (APPLY) {
    const rls = await sql`select c.relrowsecurity from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname='feedback'`;
    const pol = await sql`select count(*)::int n from pg_policies where schemaname='public' and tablename='feedback'`;
    const on = (rls as unknown as { relrowsecurity: boolean }[])[0]?.relrowsecurity;
    const n = (pol as unknown as { n: number }[])[0].n;
    console.log(`\nfeedback: RLS ${on ? "enabled" : "OFF"}, ${n} policies (expected 0).`);
  } else {
    console.log("\nRe-run with --apply to write.");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
