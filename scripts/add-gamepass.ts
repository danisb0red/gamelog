/**
 * Create the Game Pass snapshot tables: `gamepass_products` and `gamepass_sync`.
 *
 * New tables only — nothing existing is altered. Like `igdb_cache` they are
 * server-side infrastructure, so RLS is enabled with **no policies**: the app
 * reaches them as the `postgres` role (which bypasses RLS) while anyone holding
 * the publishable key gets nothing.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/add-gamepass.ts          # dry run
 *   npx tsx scripts/add-gamepass.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

const TABLES = ["gamepass_products", "gamepass_sync"];

const STEPS: { label: string; sql: string }[] = [
  {
    label: "create table gamepass_products",
    sql: `create table if not exists gamepass_products (
            product_id text primary key,
            igdb_game_id bigint,
            title text not null,
            state text not null,
            first_seen_at timestamptz not null default now(),
            last_seen_at timestamptz not null default now(),
            leaving_since timestamptz,
            match_checked_at timestamptz
          )`,
  },
  // Every page read is "which of these IGDB ids are on Game Pass".
  {
    label: "index gamepass_products(igdb_game_id)",
    sql: `create index if not exists gamepass_products_igdb_game_id_idx on gamepass_products (igdb_game_id)`,
  },
  {
    label: "create table gamepass_sync",
    sql: `create table if not exists gamepass_sync (
            id text primary key,
            refreshed_at timestamptz,
            attempted_at timestamptz
          )`,
  },
  ...TABLES.map((t) => ({
    label: `enable RLS on ${t} (deny-all: no policies)`,
    sql: `alter table ${t} enable row level security`,
  })),
];

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — no changes will be made\n");

  for (const step of STEPS) {
    console.log(`  ${APPLY ? "→" : "·"} ${step.label}`);
    console.log(`      ${step.sql.replace(/\s+/g, " ")}`);
    if (APPLY) await sql.unsafe(step.sql);
  }

  if (APPLY) {
    for (const t of TABLES) {
      const rls = await sql`
        select c.relrowsecurity from pg_class c
        join pg_namespace ns on ns.oid = c.relnamespace
        where ns.nspname = 'public' and c.relname = ${t}`;
      const pol = await sql`
        select count(*)::int n from pg_policies
        where schemaname = 'public' and tablename = ${t}`;
      const on = (rls as unknown as { relrowsecurity: boolean }[])[0]?.relrowsecurity;
      const n = (pol as unknown as { n: number }[])[0].n;
      console.log(`${t}: RLS ${on ? "enabled" : "OFF"}, ${n} policies (0 is correct here).`);
    }
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
