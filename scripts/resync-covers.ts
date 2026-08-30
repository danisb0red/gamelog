/**
 * Re-resolve cached games against IGDB.
 *
 * Why this exists: the `games` table was populated while RAWG was the provider,
 * so rows cached then hold `media.rawg.io` cover URLs. RAWG is down, which means
 * those covers render as broken images all over a design that is mostly cover
 * art. This walks the cache and repoints each stale row at IGDB.
 *
 * Two hard constraints:
 *
 *  - `games.id` is NEVER touched. It's the primary key that `logs`,
 *    `favorites` and `list_items` all reference, and IGDB ids differ from RAWG
 *    ids — rewriting it would orphan every log in the database.
 *  - `slug` is only rewritten on an exact, case-insensitive name match, because
 *    the slug is what /g/[slug] routes on. A fuzzy match could silently point a
 *    logged game at a different game's page.
 *
 * Usage:
 *   npx tsx scripts/resync-covers.ts          # dry run, prints the plan
 *   npx tsx scripts/resync-covers.ts --apply  # writes
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const APPLY = process.argv.includes("--apply");
const CLIENT_ID = process.env.TWITCH_CLIENT_ID!;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET!;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET in .env.local");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

async function token(): Promise<string> {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: "POST" },
  );
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** IGDB free tier allows 4 req/s; stay comfortably under it. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Hit = { name: string; slug: string; cover?: { image_id: string } };

async function lookup(accessToken: string, name: string): Promise<Hit | null> {
  const body = `
    search "${name.replace(/"/g, '\\"')}";
    fields name, slug, cover.image_id;
    where version_parent = null & game_type = 0;
    limit 5;
  `;
  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!res.ok) {
    console.warn(`  ! IGDB ${res.status} for "${name}"`);
    return null;
  }
  const rows = (await res.json()) as Hit[];
  if (rows.length === 0) return null;
  // Prefer an exact name match; otherwise take IGDB's top-ranked result.
  return rows.find((r) => r.name.toLowerCase() === name.toLowerCase()) ?? rows[0];
}

async function main() {
  const accessToken = await token();
  const rows = (await sql`
    select id, name, slug, cover_url from games order by name
  `) as { id: number; name: string; slug: string; cover_url: string | null }[];

  const stale = rows.filter((r) => !r.cover_url || !r.cover_url.includes("igdb.com"));
  console.log(`${rows.length} cached games, ${stale.length} not on IGDB art.\n`);
  if (stale.length === 0) return;

  let fixed = 0;
  let slugged = 0;
  let missed = 0;

  for (const row of stale) {
    const hit = await lookup(accessToken, row.name);
    await sleep(300); // ~3.3 req/s

    if (!hit?.cover?.image_id) {
      console.log(`  MISS  ${row.name}`);
      missed++;
      continue;
    }

    const coverUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${hit.cover.image_id}.jpg`;
    const exact = hit.name.toLowerCase() === row.name.toLowerCase();
    const newSlug = exact && hit.slug !== row.slug ? hit.slug : null;

    console.log(
      `  FIX   ${row.name}${newSlug ? `  (slug ${row.slug} → ${newSlug})` : ""}`,
    );
    fixed++;
    if (newSlug) slugged++;

    if (APPLY) {
      if (newSlug) {
        await sql`update games set cover_url = ${coverUrl}, slug = ${newSlug}, synced_at = now() where id = ${row.id}`;
      } else {
        await sql`update games set cover_url = ${coverUrl}, synced_at = now() where id = ${row.id}`;
      }
    }
  }

  console.log(
    `\n${APPLY ? "APPLIED" : "DRY RUN"} — ${fixed} covers repointed (${slugged} slugs corrected), ${missed} not found.`,
  );
  if (!APPLY) console.log("Re-run with --apply to write.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
