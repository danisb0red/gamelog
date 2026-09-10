/**
 * Create the `wishlist` table.
 *
 * Written as a script rather than left to `drizzle-kit push` because push
 * knows nothing about row level security: it would create the table wide open,
 * and since the iOS app talks to Supabase directly, an unpoliced table is
 * readable and writable by any authenticated client. The policies here mirror
 * `favorites` — see scripts/harden-db.ts for the same pattern on every other
 * table.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/add-wishlist.ts          # dry run
 *   npx tsx scripts/add-wishlist.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

/** Every statement, in order. Each is safe to re-run. */
const STEPS: { label: string; sql: string }[] = [
  {
    label: "create table wishlist",
    sql: `create table if not exists wishlist (
            id uuid primary key default gen_random_uuid(),
            user_id uuid not null references profiles(id) on delete cascade,
            game_id bigint not null references games(id) on delete cascade,
            added_at timestamptz not null default now()
          )`,
  },

  // The constraint name matches what drizzle-kit generates for
  // `unique().on(t.userId, t.gameId)`, so a later `db:push` sees it as already
  // present instead of trying to add a second one.
  {
    label: "unique (user_id, game_id)",
    sql: `do $$ begin
            if not exists (select 1 from pg_constraint where conname = 'wishlist_user_id_game_id_unique') then
              alter table wishlist
                add constraint wishlist_user_id_game_id_unique unique (user_id, game_id);
            end if;
          end $$`,
  },

  // Every read of this table filters on user_id — the profile page and the
  // per-game toggle both do.
  {
    label: "index wishlist(user_id)",
    sql: `create index if not exists wishlist_user_id_idx on wishlist (user_id)`,
  },

  { label: "enable RLS on wishlist", sql: `alter table wishlist enable row level security` },
];

/**
 * Policies, matching `favorites`: a wishlist is public the way the rest of a
 * profile is public, and only its owner may change it. No update policy —
 * there is nothing on a row to edit, only add and remove.
 */
const POLICIES: { table: string; name: string; sql: string }[] = [
  { table: "wishlist", name: "wishlist_read", sql: `create policy wishlist_read on wishlist for select using (true)` },
  { table: "wishlist", name: "wishlist_insert_own", sql: `create policy wishlist_insert_own on wishlist for insert with check (auth.uid() = user_id)` },
  { table: "wishlist", name: "wishlist_delete_own", sql: `create policy wishlist_delete_own on wishlist for delete using (auth.uid() = user_id)` },
];

async function main() {
  console.log(APPLY ? "APPLYING\n" : "DRY RUN — no changes will be made\n");

  for (const step of STEPS) {
    console.log(`  ${APPLY ? "→" : "·"} ${step.label}`);
    if (APPLY) await sql.unsafe(step.sql);
  }

  console.log("");
  for (const p of POLICIES) {
    const exists = await sql`select 1 from pg_policies where schemaname='public' and tablename=${p.table} and policyname=${p.name}`;
    if ((exists as unknown[]).length) {
      console.log(`  = policy ${p.name} (already present)`);
      continue;
    }
    console.log(`  ${APPLY ? "→" : "·"} policy ${p.name}`);
    if (APPLY) await sql.unsafe(p.sql);
  }

  if (APPLY) {
    const rls = await sql`select c.relrowsecurity from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relname='wishlist'`;
    const pol = await sql`select count(*)::int n from pg_policies where schemaname='public' and tablename='wishlist'`;
    const on = (rls as unknown as { relrowsecurity: boolean }[])[0]?.relrowsecurity;
    const n = (pol as unknown as { n: number }[])[0].n;
    console.log(`\nwishlist: RLS ${on ? "enabled" : "OFF"}, ${n} policies.`);
  } else {
    console.log("\nRe-run with --apply to write.");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
