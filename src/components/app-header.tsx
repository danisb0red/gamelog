import Link from "next/link";
import { getUser, ensureProfile } from "@/lib/auth";
import { getProfileById } from "@/lib/db/queries";
import { HeaderSearch } from "./header-search";
import { ProfileMenu } from "./profile-menu";

/**
 * Persistent top bar.
 *
 * Reworked from a centred SaaS navbar into a game-menu register: a wordmark
 * with a blocky mark, uppercase letterspaced mono destinations, and a hairline
 * rather than a solid border. Nav labels are the user's own sections (SHELF,
 * DIARY) rather than product nouns — the site is addressed to one person about
 * their own collection.
 */
export async function AppHeader() {
  const user = await getUser();
  let profile = null;
  if (user) {
    await ensureProfile(user);
    profile = await getProfileById(user.id);
  }

  const nav = profile
    ? [
        { href: "/", label: "Home" },
        { href: `/u/${profile.username}`, label: "Shelf" },
        { href: `/u/${profile.username}/diary`, label: "Diary" },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/70 bg-surface-0/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3.5">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          {/* Cartridge mark: a notched block. Reads as an object, not an icon set. */}
          <span
            aria-hidden="true"
            className="block h-4 w-4 bg-accent transition-transform duration-300 group-hover:rotate-90"
            style={{ clipPath: "polygon(0 0,100% 0,100% 70%,70% 100%,0 100%)" }}
          />
          <span className="font-display text-[17px] font-bold lowercase tracking-tight text-neutral-100">
            game<span className="text-accent">log</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-neutral-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 justify-end md:justify-center">
          <HeaderSearch />
        </div>

        <div className="shrink-0">
          {profile ? (
            <ProfileMenu username={profile.username} displayName={profile.displayName} />
          ) : (
            <Link
              href="/login"
              className="px-cut bg-accent px-4 py-2 font-mono text-[11px] uppercase tracking-[0.15em] text-accent-foreground transition hover:brightness-110"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
