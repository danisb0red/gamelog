import Link from "next/link";
import { StarRating } from "./star-rating";
import { STATUS_BADGE, STATUS_LABEL, type Status } from "@/lib/status";

type Entry = {
  id: string;
  status: string;
  rating: string | null;
  review: string | null;
  platform: string | null;
  loggedAt: Date;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** Chronological diary grouped by month, like a journal of play. */
export function DiaryTimeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-sm text-neutral-500">
        No entries yet. Log a game (with a date) and it shows up here.
      </p>
    );
  }

  // Group into ordered month buckets (entries already sorted newest-first).
  const months: { label: string; items: Entry[] }[] = [];
  for (const e of entries) {
    const label = new Date(e.loggedAt).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
    let bucket = months[months.length - 1];
    if (!bucket || bucket.label !== label) {
      bucket = { label, items: [] };
      months.push(bucket);
    }
    bucket.items.push(e);
  }

  return (
    <div className="space-y-8">
      {months.map((month) => (
        <section key={month.label}>
          <h3 className="mb-3 border-b border-neutral-800/70 pb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {month.label}
          </h3>
          <ul className="space-y-4">
            {month.items.map((e) => {
              const d = new Date(e.loggedAt);
              const status = e.status as Status;
              return (
                <li key={e.id} className="flex gap-4">
                  <div className="w-10 shrink-0 text-center">
                    <div className="text-xl font-extrabold leading-none tabular-nums">
                      {d.getDate()}
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wide text-neutral-400">
                      {d.toLocaleString("en-US", { weekday: "short" })}
                    </div>
                  </div>

                  <Link href={`/g/${e.gameSlug}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={e.coverUrl ?? ""}
                      alt=""
                      className="h-16 w-12 rounded bg-surface-2 object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/g/${e.gameSlug}`}
                        className="font-medium hover:underline"
                      >
                        {e.gameName}
                      </Link>
                      {e.releaseYear && (
                        <span className="text-xs text-neutral-400">{e.releaseYear}</span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold text-white ${
                          STATUS_BADGE[status] ?? "bg-neutral-600"
                        }`}
                      >
                        {STATUS_LABEL[status] ?? e.status}
                      </span>
                      {e.rating != null && <StarRating value={Number(e.rating)} readOnly />}
                      {e.platform && (
                        <span className="text-xs text-neutral-400">on {e.platform}</span>
                      )}
                    </div>
                    {e.review && (
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-300">
                        {e.review}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
