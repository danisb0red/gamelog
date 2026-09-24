import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getListCached } from "@/lib/db/cached";
import { getUser } from "@/lib/auth";
import { ListItems } from "@/components/list-items";
import { AddGamesToList } from "@/components/add-games-to-list";
import { NOINDEX, pageMetadata, truncate } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const list = await getListCached(id).catch((err) => {
    console.error("[seo] list lookup failed:", err);
    return null;
  });
  // A private list's title is the owner's business; don't put it in a tab
  // title or a link preview.
  if (!list || !list.isPublic) return { title: "List", robots: NOINDEX };
  const count = `${list.items.length} ${list.items.length === 1 ? "game" : "games"}`;
  const by = list.displayName ?? list.username;
  return pageMetadata({
    title: list.title,
    description: list.description
      ? truncate(list.description)
      : `A list of ${count} by ${by} on GameLog.`,
    path: `/list/${list.id}`,
    ownImage: true,
  });
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [list, user] = await Promise.all([getListCached(id), getUser()]);
  const isOwner = list != null && user?.id === list.userId;
  // A private list is the owner's alone. The metadata already hid its title
  // from link previews, but the page itself served it to anyone with the URL.
  // 404 rather than 403 so its existence isn't confirmed either.
  if (!list || (!list.isPublic && !isOwner)) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          {list.isRanked && (
            <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Ranked
            </span>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{list.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          by{" "}
          <Link href={`/u/${list.username}`} className="hover:underline">
            {list.displayName ?? list.username}
          </Link>{" "}
          · {list.items.length} {list.items.length === 1 ? "game" : "games"}
        </p>
        {list.description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-300">
            {list.description}
          </p>
        )}

        {isOwner && (
          <div className="mt-5">
            <AddGamesToList
              listId={list.id}
              existingIds={list.items.map((i) => i.gameId)}
            />
          </div>
        )}
      </header>

      <ListItems
        listId={list.id}
        items={list.items}
        isOwner={isOwner}
        isRanked={list.isRanked}
      />
    </main>
  );
}
