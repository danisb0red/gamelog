import Link from "next/link";
import { getUser, ensureProfile } from "@/lib/auth";
import { getProfileById } from "@/lib/db/queries";
import { HeaderSearch } from "./header-search";
import { ProfileMenu } from "./profile-menu";
import { BottomNav } from "./bottom-nav";

/**
 * Persistent top bar.
 *
 * Reworked from a centred SaaS navbar into a game-menu register: a wordmark
 * with a blocky mark, uppercase letterspaced mono destinations, and a hairline
 * rather than a solid border. Nav labels are the user's own sections (SHELF,
 * DIARY) rather than product nouns — the site is addressed to one person about
 * their own collection.
 *
 * On phones this is one row and one row only. The destinations moved to the
 * BottomNav tab bar (thumb reach, always-visible current section) and search
 * moved to /search, which gave the header back the ~140px it was squeezing the
 * search box into.
 */
export async function AppHeader() {
  const user = await getUser();
  let profile = null;
  if (user) {
    await ensureProfile(user);
    profile = await getProfileById(user.id);
  }

  // Same order as the mobile tab bar. Diary is reached from You.
  const nav = [
    { href: "/", label: "Home" },
    ...(profile ? [{ href: `/u/${profile.username}/shelf`, label: "Shelf" }] : []),
    { href: "/releases", label: "Releases" },
    ...(profile ? [{ href: `/u/${profile.username}`, label: "You" }] : []),
  ];

  return (
    <>
    <header className="safe-t sticky top-0 z-40 border-b border-neutral-800/70 bg-surface-0/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-5 py-3">
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

        <div className="hidden flex-1 justify-center md:flex">
          <HeaderSearch />
        </div>

        {/* Phones push everything else to the right edge; the search box that
            used to sit here had ~140px and clipped its own placeholder, so it
            became a tab instead. */}
        <div className="flex-1 md:hidden" />

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

    {/* Rendered here rather than in the layout so it shares the header's
        already-resolved profile — one auth round trip, not two. */}
    <BottomNav username={profile?.username ?? null} />
    </>
  );
}
