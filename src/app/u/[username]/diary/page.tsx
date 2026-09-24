import { notFound } from "next/navigation";
import Link from "next/link";
import { DiaryTimeline } from "@/components/diary-timeline";
import type { Metadata } from "next";
import { getRecentLogs } from "@/lib/db/queries";
import { getProfileCached } from "@/lib/db/cached";
import { profileMetadata } from "@/lib/seo-profile";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  return profileMetadata((await params).username, "diary");
}

export default async function DiaryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileCached(username);
  if (!profile) notFound();

  const entries = await getRecentLogs(profile.id, 500);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <header className="mb-6">
        <Link
          href={`/u/${profile.username}`}
          className="text-sm text-neutral-500 hover:text-foreground"
        >
          ← {profile.displayName ?? profile.username}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Diary</h1>
        <p className="text-sm text-neutral-500">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </header>

      <DiaryTimeline entries={entries} />
    </main>
  );
}
