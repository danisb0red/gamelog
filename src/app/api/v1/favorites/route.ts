import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { getUserFavorites } from "@/lib/db/queries";
import { unauthorized } from "../_lib";

export const dynamic = "force-dynamic";

/** The user's four favourites, in slot order. */
export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  return NextResponse.json({ favorites: await getUserFavorites(user.id) });
}
