import { GameCover } from "./game-cover";
import { Shelf } from "./shelf";
import type { GameSummary } from "@/lib/games/types";

/**
 * Where to go next from a game page.
 *
 * A shelf rather than a grid: it keeps the same object language as the rest of
 * the site and, on a phone, ten covers scroll sideways instead of pushing the
 * reviews half a screen further down.
 *
 * Renders nothing when there's nothing to show — a heading over an apology is
 * worse than silence.
 */
export function RelatedGames({ games }: { games: GameSummary[] }) {
  if (games.length === 0) return null;

  return (
    <Shelf title="More like this">
      {games.map((g, i) => (
        <GameCover key={g.id} game={g} size="md" priorityIndex={i} />
      ))}
    </Shelf>
  );
}
