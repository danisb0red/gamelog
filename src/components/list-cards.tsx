import Link from "next/link";
import { getMessage } from "@/lib/personality";

type ListCard = {
  id: string;
  title: string;
  isRanked: boolean;
  itemCount: number;
  covers: (string | null)[];
};

/** Grid of list cards, each with a small cover collage. */
export function ListCards({ lists }: { lists: ListCard[] }) {
  if (lists.length === 0) {
    return <p className="text-sm text-neutral-500">{getMessage("empty.lists")}</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {lists.map((l) => (
        <li key={l.id}>
          <Link href={`/list/${l.id}`} className="group block">
            <div className="flex aspect-[16/9] overflow-hidden rounded-sm bg-surface-2 ring-1 ring-neutral-800">
              {l.covers.slice(0, 4).map((c, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={c ?? ""}
                  alt=""
                  className="h-full flex-1 object-cover transition group-hover:opacity-90"
                />
              ))}
              {l.covers.length === 0 && (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  📋
                </div>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {l.isRanked && (
                <span className="rounded bg-violet-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
                  Ranked
                </span>
              )}
              <p className="line-clamp-1 text-sm font-medium">{l.title}</p>
            </div>
            <p className="text-xs text-neutral-500">{l.itemCount} games</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
