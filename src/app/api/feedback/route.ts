import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { feedback } from "@/lib/db/schema";
import { ensureProfile, getRequestUser } from "@/lib/auth";

const MESSAGE_MAX = 2000;
const CONTACT_MAX = 200;
/** Per sender, and across everyone, so a botnet can't fill the table either. */
const PER_SENDER_PER_HOUR = 5;
const TOTAL_PER_HOUR = 100;

/**
 * Salted so the stored hash can't be matched against a list of IP addresses.
 * It exists to rate-limit; the address itself is never written anywhere.
 */
function senderHash(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return createHash("sha256")
    .update(`${ip}:${process.env.SUPABASE_SECRET_KEY ?? ""}`)
    .digest("hex");
}

/** POST /api/feedback — anyone, signed in or not. */
export async function POST(request: Request) {
  let body: { message?: unknown; contact?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // A hidden field no person fills in. Answer as if it worked so a bot has
  // nothing to learn from, and store nothing.
  if (typeof body.website === "string" && body.website !== "") {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "Write something first." }, { status: 400 });
  if (message.length > MESSAGE_MAX)
    return NextResponse.json({ error: `Keep it under ${MESSAGE_MAX} characters.` }, { status: 400 });

  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  if (contact.length > CONTACT_MAX)
    return NextResponse.json({ error: "That contact is too long." }, { status: 400 });

  const hash = senderHash(request);
  const since = sql`now() - interval '1 hour'`;
  const [mine] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(feedback)
    .where(and(eq(feedback.senderHash, hash), gt(feedback.createdAt, since)));
  const [all] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(feedback)
    .where(gt(feedback.createdAt, since));
  if ((mine?.n ?? 0) >= PER_SENDER_PER_HOUR || (all?.n ?? 0) >= TOTAL_PER_HOUR)
    return NextResponse.json(
      { error: "That's a lot of messages in a short time. Try again a bit later." },
      { status: 429 },
    );

  // Attach the account when there is one. The profile row is the foreign key,
  // so make sure it exists before pointing at it.
  const user = await getRequestUser(request);
  if (user) await ensureProfile(user);

  await db.insert(feedback).values({
    message,
    contact: contact || null,
    userId: user?.id ?? null,
    senderHash: hash,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
