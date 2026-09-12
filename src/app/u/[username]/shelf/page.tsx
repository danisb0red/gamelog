import { notFound } from "next/navigation";
import Link from "next/link";
import { ShelfBrowser } from "@/components/shelf-browser";
import { getProfileByUsername, getUserGames } from "@/lib/db/queries";
import { isStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ShelfPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ status?: string; platform?: string }>;
}) {
  const { username } = await params;
  const { status, platform } = await searchParams;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const all = await getUserGames(profile.id);

  // Distinct platforms this user has played on.
  const platformOptions = [...new Set(all.map((g) => g.platform).filter(Boolean))].sort() as string[];
  const activePlatform = platform && platformOptions.includes(platform) ? platform : "";

  // Only the *initial* tab comes from the URL; ShelfBrowser owns it after that.
  const active = isStatus(status) ? status : "all";

  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:pb-20">
        <header className="pt-8 sm:pt-16">
          <Link
            href={`/u/${profile.username}`}
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-200"
          >
            ← {profile.displayName ?? profile.username}
          </Link>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-neutral-50 sm:text-4xl">
            Shelf
          </h1>
          {/* The whole collection, not the filtered view — the tabs below carry
              their own counts. */}
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-neutral-500">
            {all.length} {all.length === 1 ? "game" : "games"}
          </p>
        </header>

        <div className="mt-7 sm:mt-9">
          {/* Filtering happens on the client — see ShelfBrowser. The whole
              collection is already loaded for the counts, so switching tabs
              needs no navigation, no skeleton flash and no scroll reset. */}
          <ShelfBrowser
            games={all}
            platforms={platformOptions}
            initialStatus={active}
            initialPlatform={activePlatform}
          />
        </div>
      </div>
    </main>
  );
}
