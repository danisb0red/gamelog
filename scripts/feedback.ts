/**
 * Read what people sent through /feedback, newest first.
 *
 *   npx tsx scripts/feedback.ts         # last 20
 *   npx tsx scripts/feedback.ts 100     # last 100
 */
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const limit = Math.max(1, Number(process.argv[2]) || 20);
const sql = postgres(process.env.DATABASE_URL!, { prepare: false, connect_timeout: 20 });

async function main() {
  const rows = await sql<
    { created_at: Date; message: string; contact: string | null; username: string | null }[]
  >`
    select f.created_at, f.message, f.contact, p.username
    from feedback f left join profiles p on p.id = f.user_id
    order by f.created_at desc limit ${limit}`;

  if (!rows.length) console.log("No feedback yet.");
  for (const r of rows) {
    const who = [r.username && `@${r.username}`, r.contact].filter(Boolean).join(" · ") || "anonymous";
    console.log(`\n${r.created_at.toISOString().slice(0, 16).replace("T", " ")}  ${who}\n${r.message}`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
