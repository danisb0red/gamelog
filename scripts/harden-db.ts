/**
 * Production hardening: RLS, indexes, and the missing auth foreign key.
 *
 * Why this is needed now: the iOS app is moving to talking to Supabase
 * directly, which means Postgres itself becomes the thing enforcing "you can
 * only touch your own rows". Today that rule lives only in the Next.js route
 * handlers, and the database would happily let any authenticated client read
 * every user's logs.
 *
 * Safe to run against the live app. The web server connects as `postgres`,
 * which has BYPASSRLS, so enabling RLS changes nothing for it — the policies
 * only take effect for clients using an `anon`/`authenticated` JWT.
 *
 * Idempotent. Usage:
 *   npx tsx scripts/harden-db.ts          # dry run
 *   npx tsx scripts/harden-db.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

/** Every statement, in order. Each is safe to re-run. */
const STEPS: { label: string; sql: string }[] = [
  // ── Orphan cleanup ────────────────────────────────────────────────────
  // Pre-auth seed rows have no matching auth.users entry and would block the
  // foreign key below. Cascades to their logs.
  {
    label: "remove profiles with no auth user",
    sql: `delete from profiles p where not exists (select 1 from auth.users u where u.id = p.id)`,
  },

  // ── Link profiles to auth ─────────────────────────────────────────────
  // Without this, deleting an account leaves its profile and every log behind
  // — which directly conflicts with Apple's account-deletion requirement.
  { label: "drop profiles.id default", sql: `alter table profiles alter column id drop default` },
  {
    label: "profiles.id -> auth.users(id) on delete cascade",
    sql: `do $$ begin
            if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey') then
              alter table profiles
                add constraint profiles_id_fkey
                foreign key (id) references auth.users(id) on delete cascade;
            end if;
          end $$`,
  },

  // ── Indexes ───────────────────────────────────────────────────────────
  // Every profile, shelf and diary query filters on these. Without them each
  // one is a sequential scan.
  { label: "index logs(user_id)", sql: `create index if not exists logs_user_id_idx on logs (user_id)` },
  { label: "index logs(game_id)", sql: `create index if not exists logs_game_id_idx on logs (game_id)` },
  { label: "index logs(user_id, logged_at desc)", sql: `create index if not exists logs_user_logged_idx on logs (user_id, logged_at desc)` },
  { label: "index lists(user_id)", sql: `create index if not exists lists_user_id_idx on lists (user_id)` },
  { label: "index list_items(list_id)", sql: `create index if not exists list_items_list_id_idx on list_items (list_id)` },
  { label: "index favorites(user_id)", sql: `create index if not exists favorites_user_id_idx on favorites (user_id)` },

  // ── RLS ───────────────────────────────────────────────────────────────
  ...["profiles", "games", "logs", "lists", "list_items", "favorites"].map((t) => ({
    label: `enable RLS on ${t}`,
    sql: `alter table ${t} enable row level security`,
  })),
];

/**
 * Policies.
 *
 * Reads are public where the web app already makes them public — profiles,
 * community reviews and ratings are visible to everyone by design. Writes are
 * always restricted to the owner.
 */
const POLICIES: { table: string; name: string; sql: string }[] = [
  // profiles — anyone can read; you may only create/edit your own
  { table: "profiles", name: "profiles_read", sql: `create policy profiles_read on profiles for select using (true)` },
  { table: "profiles", name: "profiles_insert_own", sql: `create policy profiles_insert_own on profiles for insert with check (auth.uid() = id)` },
  { table: "profiles", name: "profiles_update_own", sql: `create policy profiles_update_own on profiles for update using (auth.uid() = id)` },

  // games — a shared catalogue. Readable by all; any signed-in user may cache
  // a row, because logging a new game requires inserting it first.
  { table: "games", name: "games_read", sql: `create policy games_read on games for select using (true)` },
  { table: "games", name: "games_insert_auth", sql: `create policy games_insert_auth on games for insert to authenticated with check (true)` },
  { table: "games", name: "games_update_auth", sql: `create policy games_update_auth on games for update to authenticated using (true)` },

  // logs — public to read (that's what community reviews are), owner to write
  { table: "logs", name: "logs_read", sql: `create policy logs_read on logs for select using (true)` },
  { table: "logs", name: "logs_insert_own", sql: `create policy logs_insert_own on logs for insert with check (auth.uid() = user_id)` },
  { table: "logs", name: "logs_update_own", sql: `create policy logs_update_own on logs for update using (auth.uid() = user_id)` },
  { table: "logs", name: "logs_delete_own", sql: `create policy logs_delete_own on logs for delete using (auth.uid() = user_id)` },

  // favorites
  { table: "favorites", name: "favorites_read", sql: `create policy favorites_read on favorites for select using (true)` },
  { table: "favorites", name: "favorites_insert_own", sql: `create policy favorites_insert_own on favorites for insert with check (auth.uid() = user_id)` },
  { table: "favorites", name: "favorites_delete_own", sql: `create policy favorites_delete_own on favorites for delete using (auth.uid() = user_id)` },

  // lists
  { table: "lists", name: "lists_read", sql: `create policy lists_read on lists for select using (true)` },
  { table: "lists", name: "lists_insert_own", sql: `create policy lists_insert_own on lists for insert with check (auth.uid() = user_id)` },
  { table: "lists", name: "lists_update_own", sql: `create policy lists_update_own on lists for update using (auth.uid() = user_id)` },
  { table: "lists", name: "lists_delete_own", sql: `create policy lists_delete_own on lists for delete using (auth.uid() = user_id)` },

  // list_items — ownership is inherited from the parent list
  { table: "list_items", name: "list_items_read", sql: `create policy list_items_read on list_items for select using (true)` },
  {
    table: "list_items", name: "list_items_insert_own",
    sql: `create policy list_items_insert_own on list_items for insert
          with check (exists (select 1 from lists l where l.id = list_id and l.user_id = auth.uid()))`,
  },
  {
    table: "list_items", name: "list_items_update_own",
    sql: `create policy list_items_update_own on list_items for update
          using (exists (select 1 from lists l where l.id = list_id and l.user_id = auth.uid()))`,
  },
  {
    table: "list_items", name: "list_items_delete_own",
    sql: `create policy list_items_delete_own on list_items for delete
          using (exists (select 1 from lists l where l.id = list_id and l.user_id = auth.uid()))`,
  },
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
    const rls = await sql`select count(*)::int n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='public' and c.relkind='r' and c.relrowsecurity`;
    const pol = await sql`select count(*)::int n from pg_policies where schemaname='public'`;
    console.log(`\nRLS enabled on ${(rls as { n: number }[])[0].n}/6 tables, ${(pol as { n: number }[])[0].n} policies.`);
  } else {
    console.log("\nRe-run with --apply to write.");
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
