import type { DeveloperPage, GameDetail, GameProvider, GameSummary } from "./types";

/**
 * Mock provider — lets us build and demo the whole app with zero credentials.
 * Covers come from placehold.co so search results render real-looking cards.
 */

const GAMES: Omit<GameSummary, "coverUrl">[] = [
  { id: 1, name: "Elden Ring", slug: "elden-ring", releaseYear: 2022 },
  { id: 2, name: "The Witcher 3: Wild Hunt", slug: "the-witcher-3", releaseYear: 2015 },
  { id: 3, name: "Hollow Knight", slug: "hollow-knight", releaseYear: 2017 },
  { id: 4, name: "Hades", slug: "hades", releaseYear: 2020 },
  { id: 5, name: "Stardew Valley", slug: "stardew-valley", releaseYear: 2016 },
  { id: 6, name: "The Legend of Zelda: Breath of the Wild", slug: "botw", releaseYear: 2017 },
  { id: 7, name: "Dark Souls III", slug: "dark-souls-iii", releaseYear: 2016 },
  { id: 8, name: "Disco Elysium", slug: "disco-elysium", releaseYear: 2019 },
  { id: 9, name: "Celeste", slug: "celeste", releaseYear: 2018 },
  { id: 10, name: "Red Dead Redemption 2", slug: "rdr2", releaseYear: 2018 },
  { id: 11, name: "Baldur's Gate 3", slug: "baldurs-gate-3", releaseYear: 2023 },
  { id: 12, name: "Cyberpunk 2077", slug: "cyberpunk-2077", releaseYear: 2020 },
  { id: 13, name: "God of War", slug: "god-of-war", releaseYear: 2018 },
  { id: 14, name: "Hollow Knight: Silksong", slug: "silksong", releaseYear: 2025 },
  { id: 15, name: "Halo Infinite", slug: "halo-infinite", releaseYear: 2021 },
];

function coverFor(name: string): string {
  const text = encodeURIComponent(name);
  return `https://placehold.co/300x400/1f1f1f/e5e5e5?text=${text}`;
}

export const mockProvider: GameProvider = {
  async searchGames(query, limit = 12) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Simulate a touch of network latency so loading states are exercised.
    await new Promise((r) => setTimeout(r, 120));

    return GAMES.filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, limit)
      .map((g) => ({ ...g, coverUrl: coverFor(g.name) }));
  },

  async getGame(slugOrId): Promise<GameDetail | null> {
    const g = GAMES.find(
      (x) => x.slug === String(slugOrId) || x.id === Number(slugOrId),
    );
    if (!g) return null;
    return {
      ...g,
      coverUrl: coverFor(g.name),
      description: `A mock entry for ${g.name}.`,
      releaseDate: g.releaseYear ? `${g.releaseYear}-01-01` : null,
      platforms: ["PC", "PlayStation", "Xbox"],
      genres: ["Action", "Adventure"],
      developers: [{ name: "Mock Studio", slug: "mock-studio" }],
      publishers: [{ name: "Mock Publisher", slug: "mock-publisher" }],
      playtimeHours: 20,
      externalRating: 4.2,
      metacritic: 88,
      screenshots: [],
      similar: GAMES.filter((x) => x.id !== g.id)
        .slice(0, 6)
        .map((x) => ({ ...x, coverUrl: coverFor(x.name) })),
    };
  },

  async getDeveloper(): Promise<DeveloperPage | null> {
    return {
      name: "Mock Studio",
      games: GAMES.slice(0, 6).map((g) => ({ ...g, coverUrl: coverFor(g.name) })),
    };
  },

  async getPopularGames(limit = 12): Promise<GameSummary[]> {
    return GAMES.slice(0, limit).map((g) => ({ ...g, coverUrl: coverFor(g.name) }));
  },
};
