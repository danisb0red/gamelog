import { NextResponse } from "next/server";

/** Uniform JSON error shape so the mobile client has one thing to parse. */
export function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export const unauthorized = () => fail("Not authenticated", 401);
