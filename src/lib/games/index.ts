import "server-only";
import type { GameProvider } from "./types";
import { mockProvider } from "./mock";
import { rawgProvider } from "./rawg";
import { igdbProvider } from "./igdb";

export type { GameProvider, GameSummary } from "./types";

/**
 * Picks the active games data source:
 *   - GAMES_PROVIDER=rawg|igdb|mock forces a choice
 *   - otherwise: RAWG if its key exists, then IGDB if its keys exist, else mock
 *
 * This is the single swap point. The rest of the app imports `gameProvider`
 * and never knows or cares which backend is live.
 */
function selectProvider(): GameProvider {
  const forced = process.env.GAMES_PROVIDER;
  if (forced === "mock") return mockProvider;
  if (forced === "rawg") return rawgProvider;
  if (forced === "igdb") return igdbProvider;

  if (process.env.RAWG_API_KEY) return rawgProvider;
  if (process.env.TWITCH_CLIENT_ID && process.env.TWITCH_CLIENT_SECRET) return igdbProvider;
  return mockProvider;
}

export const gameProvider = selectProvider();

/**
 * Display name of the active provider, for crediting its rating in the UI.
 * Keeps pages from hardcoding a source that the swap point can change.
 */
export const gameProviderName: string =
  gameProvider === igdbProvider ? "IGDB" : gameProvider === rawgProvider ? "RAWG" : "Mock";
