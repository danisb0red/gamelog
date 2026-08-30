import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/signout — clears the session and returns home. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
