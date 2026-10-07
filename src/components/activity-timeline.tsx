import Link from "next/link";
import { StarRating } from "./star-rating";
import { STATUS_HEX, STATUS_VERB, type Status } from "@/lib/status";
import { getMessage } from "@/lib/personality";
import { EmptyShelf } from "./shelf";

type Entry = {
  id: string;
  status: string;
  rating: string | null;
  review: string | null;
  loggedAt: Date;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

const MONTH = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Recent activity as a journal, not a feed of cards.
 *
 * A single hairline runs down the left with date markers hung off it; entries
 * are text-first with a small piece of art. This is the section that carries
 * the "journal" half of the metaphor, and its editorial rhythm is what keeps
 * the homepage from being three variations of the same grid.
 */
export function ActivityTimeline({ entries }: { entries: Entry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyShelf
        message={getMessage("empty.activity")}
        hint="Search a game to log it."
        slots={2}
        action={{ href: "/search", label: "Find a game" }}
      />
    );
  }

  return (
    <ol className="relative ml-1 border-l border-neutral-800/90 pl-6">
      {entries.map((e, i) => {
        const status = e.status as Status;
        const d = new Date(e.loggedAt);
        return (
          <li
            key={e.id}
            className="rise-in relative pb-7 last:pb-0"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            {/* Node on the spine, coloured by status. */}
            <span
              className="absolute -left-[27px] top-1.5 h-[7px] w-[7px] ring-4 ring-surface-0"
              style={{ background: STATUS_HEX[status] ?? "#83735e" }}
            />

            <div className="flex items-start gap-3.5">
              <Link href={`/g/${e.gameSlug}`} className="group shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={e.coverUrl ?? ""}
                  alt=""
                  loading="lazy"
                  className="cover aspect-[3/4] w-11 rounded-[2px] bg-surface-2 object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400">
                  {MONTH[d.getMonth()]} {String(d.getDate()).padStart(2, "0")}
                </p>

                <p className="mt-1 text-[15px] leading-snug text-neutral-300">
                  <span style={{ color: STATUS_HEX[status] ?? undefined }}>
                    {STATUS_VERB[status] ?? e.status}
                  </span>{" "}
                  <Link
                    href={`/g/${e.gameSlug}`}
                    className="font-medium text-neutral-100 decoration-neutral-600 underline-offset-4 hover:underline"
                  >
                    {e.gameName}
                  </Link>
                </p>

                {e.rating != null && (
                  <div className="mt-1.5">
                    <StarRating value={Number(e.rating)} readOnly />
                  </div>
                )}

                {e.review && (
                  <p className="mt-2 line-clamp-3 border-l-2 border-neutral-800 pl-3 text-sm italic leading-relaxed text-neutral-400">
                    {e.review}
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
