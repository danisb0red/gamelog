import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm, type AuthMode, type AuthNotice } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

/** What the callback route sends people back with when an emailed link misbehaves. */
const NOTICES: Record<string, NonNullable<AuthNotice>> = {
  confirmed: { tone: "ok", text: "Your email is confirmed. Sign in to continue." },
  expired: { tone: "error", text: "That link has expired or was already used. Request a new one." },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; notice?: string }>;
}) {
  // Already signed in? Go home.
  const user = await getUser();
  if (user) redirect("/");

  const { mode, notice } = await searchParams;
  const initialMode: AuthMode = mode === "signup" || mode === "forgot" ? mode : "signin";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-5 py-16">
      <LoginForm initialMode={initialMode} notice={(notice && NOTICES[notice]) || null} />
    </main>
  );
}
