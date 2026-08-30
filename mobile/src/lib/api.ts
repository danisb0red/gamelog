import { supabase } from "./supabase";

const BASE = process.env.EXPO_PUBLIC_API_URL!;

/**
 * Thin client for the Next.js API.
 *
 * Attaches the current Supabase JWT as a Bearer token — the server accepts
 * either that or a session cookie, so web and iOS share one set of handlers.
 * Reads the session per call rather than caching it, so a refreshed token is
 * picked up without any coordination.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${path}: ${body.slice(0, 160)}`);
  }
  return res.json() as Promise<T>;
}

export type ShelfGame = {
  gameId: number;
  gameName: string;
  gameSlug: string;
  coverUrl: string | null;
  releaseYear: number | null;
  status: string;
  rating: string | null;
  platform: string | null;
};

export type DiaryEntry = ShelfGame & {
  id: string;
  review: string | null;
  loggedAt: string;
};

export type SearchResult = {
  id: number;
  name: string;
  slug: string;
  coverUrl: string | null;
  releaseYear: number | null;
};

export const api = {
  me: () =>
    request<{
      username: string | null;
      displayName: string | null;
      email: string | null;
      stats: {
        total: number;
        rated: number;
        average: number | null;
        counts: Record<string, number>;
      };
    }>("/api/v1/me"),

  shelf: (status?: string) =>
    request<{ games: ShelfGame[]; playing: ShelfGame[] }>(
      `/api/v1/shelf${status ? `?status=${status}` : ""}`,
    ),

  diary: () => request<{ entries: DiaryEntry[] }>("/api/v1/diary"),

  search: (q: string) =>
    request<{ results: SearchResult[] }>(`/api/v1/search?q=${encodeURIComponent(q)}`),

  trending: () => request<{ games: SearchResult[] }>("/api/v1/trending"),

  game: (slug: string) =>
    request<{
      game: {
        id: number;
        name: string;
        slug: string;
        coverUrl: string | null;
        releaseYear: number | null;
        description: string | null;
        genres: string[];
        platforms: string[];
        developers: { name: string; slug: string }[];
        screenshots: string[];
        metacritic: number | null;
      };
      aggregate: { average: number | null; ratingCount: number };
      reviews: { id: string; review: string; rating: string | null; username: string }[];
      mine: { status: string; rating: string | null; platform: string | null } | null;
    }>(`/api/v1/games/${slug}`),

  favorites: () =>
    request<{
      favorites: {
        gameId: number;
        gameName: string;
        gameSlug: string;
        coverUrl: string | null;
        releaseYear: number | null;
      }[];
    }>("/api/v1/favorites"),

  developer: (slug: string) =>
    request<{ name: string; games: SearchResult[] }>(`/api/v1/developers/${slug}`),

  log: (payload: {
    game: { id: number; name: string; slug: string; coverUrl: string | null; releaseYear: number | null };
    status: string;
    rating: number | null;
    review: string | null;
    platform: string | null;
    loggedAt?: string;
  }) => request<{ log: unknown }>("/api/v1/logs", { method: "POST", body: JSON.stringify(payload) }),
};
