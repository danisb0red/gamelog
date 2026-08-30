import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

/**
 * Creates a pre-confirmed demo account (so you can sign in without the email
 * confirmation step) and seeds a few logs so the app isn't empty. Idempotent.
 */

const DEMO_EMAIL = "gamelogdemo@gmail.com";
const DEMO_PASSWORD = "gamelog123";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const RAWG_KEY = process.env.RAWG_API_KEY!;

const adminHeaders = {
  apikey: SECRET,
  Authorization: `Bearer ${SECRET}`,
  "Content-Type": "application/json",
};

async function getOrCreateUser(): Promise<string> {
  // Try to create a confirmed user.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    }),
  });

  if (res.ok) {
    const user = await res.json();
    return user.id as string;
  }

  // Already exists — find them in the admin list.
  const list = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=200`, {
    headers: adminHeaders,
  });
  const data = await list.json();
  const found = (data.users as { id: string; email: string }[]).find(
    (u) => u.email === DEMO_EMAIL,
  );
  if (!found) throw new Error(`Could not create or find demo user: ${await res.text()}`);
  return found.id;
}

async function fetchGame(term: string) {
  const params = new URLSearchParams({ key: RAWG_KEY, search: term, page_size: "1" });
  const res = await fetch(`https://api.rawg.io/api/games?${params}`);
  const data = await res.json();
  const g = data.results?.[0];
  if (!g) throw new Error(`No RAWG result for "${term}"`);
  return {
    id: g.id as number,
    name: g.name as string,
    slug: g.slug as string,
    coverUrl: (g.background_image as string) ?? null,
    releaseYear: g.released ? Number(String(g.released).slice(0, 4)) : null,
  };
}

async function main() {
  const userId = await getOrCreateUser();
  console.log("✓ Demo user:", DEMO_EMAIL, userId);

  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  // Profile
  await db
    .insert(schema.profiles)
    .values({ id: userId, username: "demoplayer", displayName: "Demo Player" })
    .onConflictDoUpdate({ target: schema.profiles.id, set: { displayName: "Demo Player" } });

  // Only seed logs if this user has none yet.
  const existing = await db
    .select({ id: schema.logs.id })
    .from(schema.logs)
    .where(eq(schema.logs.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    const seeds = [
      { term: "elden ring", status: "finished", rating: "4.5", review: "FromSoft's masterpiece. Brutal and beautiful." },
      { term: "hades", status: "playing", rating: "5.0", review: "Can't put it down. One more run." },
      { term: "stardew valley", status: "backlog", rating: null as string | null, review: null as string | null },
    ];

    for (const s of seeds) {
      const g = await fetchGame(s.term);
      await db
        .insert(schema.games)
        .values({
          id: g.id,
          slug: g.slug,
          name: g.name,
          coverUrl: g.coverUrl,
          releaseYear: g.releaseYear,
        })
        .onConflictDoNothing();
      await db.insert(schema.logs).values({
        userId,
        gameId: g.id,
        status: s.status,
        rating: s.rating,
        review: s.review,
      });
      console.log(`  + logged ${g.name} (${s.status})`);
    }
  } else {
    console.log("  (logs already exist — skipping sample logs)");
  }

  console.log(`\n✓ Done. Sign in at http://localhost:3000/login`);
  console.log(`  Email:    ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
