import { notFound } from "next/navigation";
import Link from "next/link";
import { getList } from "@/lib/db/queries";
import { getUser } from "@/lib/auth";
import { ListItems } from "@/components/list-items";

export const dynamic = "force-dynamic";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [list, user] = await Promise.all([getList(id), getUser()]);
  if (!list) notFound();

  const isOwner = user?.id === list.userId;

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
