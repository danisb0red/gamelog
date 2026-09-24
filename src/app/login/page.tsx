import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage() {
  // Already signed in? Go home.
  const user = await getUser();
  if (user) redirect("/");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-8 px-5 py-16">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-50">
          Sign in
        </h1>
        <p className="mt-2.5 text-[15px] text-neutral-400">
          Or create an account to start logging.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
