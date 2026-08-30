import { GameCover } from "./game-cover";
import { EmptyShelf } from "./shelf";
import { type Status } from "@/lib/status";
import { getMessage, type MessageContext } from "@/lib/personality";

type LibraryGame = {
  status: string;
  rating: string | null;
  platform: string | null;
  gameId: number;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/**
 * The full collection.
 *
 * Uses the same `GameCover` object as the shelves so artwork is treated
 * identically everywhere — the grid is just a shelf that wrapped. Columns are
 * sized by cover width rather than a fixed count, so the collection stays dense
 * and poster-like at every breakpoint instead of stretching into big cards.
 *
 * `status` is the active tab, so the empty state can speak to the specific
 * shelf you're looking at rather than emitting one generic line for all five.
 */
export function GamesGrid({
  games,
  status = "all",
}: {
  games: LibraryGame[];
  status?: Status | "all";
}) {
  if (games.length === 0) {
    const context: MessageContext =
      status === "all" ? "empty.library" : (`empty.${status}` as MessageContext);
    return (
      <div className="py-6">
        <EmptyShelf
          message={getMessage(context)}
          hint="Search a game to add it to your shelf."
          slots={4}
        />
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-x-5 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(132px,1fr))]">
      {games.map((g, i) => (
        <li key={g.gameId} className="min-w-0">
          <GameCover
            game={g}
            size="full"
            priorityIndex={i < 18 ? i : undefined}
            platform={g.platform}
            /* Catalog number. A collection that's been kept is a collection
               that's been counted — this is what turns a grid of images into
               someone's numbered shelf. */
            catalogNumber={i + 1}
          />
        </li>
      ))}
    </ul>
  );
}
