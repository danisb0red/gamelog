import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/lib/db/schema";

/**
 * Seeds a fixed demo profile so logs have an owner before real auth exists.
 * The id is stable so the app can reference it. Safe to run repeatedly.
 */
export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client, { schema });

  await db
    .insert(schema.profiles)
    .values({
      id: DEMO_USER_ID,
      username: "demo",
      displayName: "Demo Player",
    })
    .onConflictDoNothing();

  console.log("✓ Seeded demo profile:", DEMO_USER_ID);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
