/**
 * Provider-agnostic game types and the GameProvider contract.
 *
 * The rest of the app only ever talks to a GameProvider — never to IGDB/RAWG
 * directly. That keeps the data source swappable: mock today, IGDB or RAWG later,
 * with no changes to UI or routes.
 */

export type GameSummary = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

/** A named entity (developer, publisher) that has its own page. */
export type NamedRef = { name: string; slug: string };

export type GameDetail = GameSummary & {
  description: string | null;
  releaseDate: string | null; // "YYYY-MM-DD"
  platforms: string[];
  genres: string[];
  developers: NamedRef[];
  publishers: NamedRef[];
  playtimeHours: number | null;
  externalRating: number | null; // provider's own rating, 0–5
  metacritic: number | null; // 0–100
  screenshots: string[];
  /** Games to send the reader to next. Empty when the provider has none — the
   *  game page then renders no related shelf at all. */
  similar: GameSummary[];
};

export type DeveloperPage = {
  name: string;
  games: GameSummary[];
};

/** Sort orders for game lists. Maps to RAWG `ordering` values. */
export type GameSort = "-released" | "released" | "-rating" | "name" | "-added";

export const GAME_SORTS: { value: GameSort; label: string }[] = [
  { value: "-released", label: "Release date (newest)" },
  { value: "released", label: "Release date (oldest)" },
  { value: "-rating", label: "Rating" },
  { value: "-added", label: "Popularity" },
  { value: "name", label: "Name (A–Z)" },
];

export interface GameProvider {
  /** Fuzzy name search for the instant-search UI. */
  searchGames(query: string, limit?: number): Promise<GameSummary[]>;
  /** Full detail for a single game by slug or id. Null if not found. */
  getGame(slugOrId: string | number): Promise<GameDetail | null>;
  /** A developer and the games they've made. Null if not found. */
  getDeveloper(slugOrId: string | number, sort?: GameSort): Promise<DeveloperPage | null>;
  /** Currently popular games, for the home page. */
  getPopularGames(limit?: number): Promise<GameSummary[]>;
}
