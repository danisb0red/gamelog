import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  // The emailed link signs you in (see /auth/callback) and sends you here. No
  // session means the link was stale, or this URL was typed in directly.
  const user = await getUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-5 py-16">
      {user ? (
        <>
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50">New password</h1>
            <p className="mt-2.5 text-[15px] text-neutral-400">Choose one you haven&apos;t used here before.</p>
          </div>
          <ResetPasswordForm />
        </>
      ) : (
        <>
          <div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50">Link expired</h1>
            <p className="mt-2.5 text-[15px] text-neutral-400">
              Reset links work once and don&apos;t last long. Request a fresh one.
            </p>
          </div>
          <Link
            href="/login?mode=forgot"
            className="px-cut block w-full bg-accent py-3 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-accent-foreground transition hover:brightness-110"
          >
            Send a new link
          </Link>
        </>
      )}
    </main>
  );
}
