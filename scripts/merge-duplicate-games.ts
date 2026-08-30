/**
 * Merge duplicate `games` rows left behind by the RAWG → IGDB switch.
 *
 * `games.id` is the *provider's* id used as the primary key. When the provider
 * changed, the same game acquired a second row under its IGDB id, and logs
 * written before and after the switch point at different rows — which is why a
 * shelf can show one game twice.
 *
 * Strategy: for each name with more than one row, ask IGDB which id is
 * authoritative for that slug, repoint every reference to it, then delete the
 * loser. `games.id` itself is never rewritten — rows are merged, not renumbered,
 * so no foreign key is ever dangling mid-flight.
 *
 * Usage:
 *   npx tsx scripts/merge-duplicate-games.ts          # dry run
 *   npx tsx scripts/merge-duplicate-games.ts --apply
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!;
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function token(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" },
  );
  return ((await res.json()) as { access_token: string }).access_token;
}

async function igdbId(tok: string, slug: string): Promise<number | null> {
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${tok}`,
      "Content-Type": "text/plain",
    },
    body: `fields id; where slug = "${slug.replace(/"/g, '\\"')}"; limit 1;`,
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { id: number }[];
  return rows[0]?.id ?? null;
}

async function main() {
  const tok = await token();

  const groups = (await sql`
    select name, array_agg(id order by id) ids, min(slug) slug
    from games group by name having count(*) > 1 order by name
  `) as { name: string; ids: string[]; slug: string }[];

  console.log(`${groups.length} duplicated titles\n`);
  let merged = 0, moved = 0, skipped = 0;

  for (const g of groups) {
    const ids = g.ids.map(Number);
    const keep = await igdbId(tok, g.slug);
    await sleep(300); // IGDB allows 4 req/s

    if (keep === null || !ids.includes(keep)) {
      console.log(`  SKIP  ${g.name} — IGDB says ${keep}, rows are ${ids.join(", ")}`);
      skipped++;
      continue;
    }

    const losers = ids.filter((i) => i !== keep);
    console.log(`  MERGE ${g.name}: keep ${keep}, absorb ${losers.join(", ")}`);
    merged++;

    if (!APPLY) continue;

    for (const loser of losers) {
      // logs: no uniqueness constraint, so every row can move.
      const l = await sql`update logs set game_id = ${keep} where game_id = ${loser} returning id`;
      moved += (l as unknown[]).length;

      // favorites and list_items have unique constraints that the move could
      // violate. Drop the rows that would collide, then move the rest.
      await sql`
        delete from favorites f
        where f.game_id = ${loser}
          and exists (select 1 from favorites k where k.user_id = f.user_id and k.game_id = ${keep})`;
      await sql`update favorites set game_id = ${keep} where game_id = ${loser}`;

      await sql`
        delete from list_items li
        where li.game_id = ${loser}
          and exists (select 1 from list_items k where k.list_id = li.list_id and k.game_id = ${keep})`;
      await sql`update list_items set game_id = ${keep} where game_id = ${loser}`;

      await sql`delete from games where id = ${loser}`;
    }
  }

  console.log(
    `\n${APPLY ? "APPLIED" : "DRY RUN"} — ${merged} merged, ${skipped} skipped` +
      (APPLY ? `, ${moved} logs repointed` : ""),
  );
  if (!APPLY) console.log("Re-run with --apply to write.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
