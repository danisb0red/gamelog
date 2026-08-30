/**
 * GameLog design tokens — ported verbatim from the web app's globals.css.
 *
 * This file is the whole reason the iOS app can look like GameLog rather than
 * like a generic React Native app: the identity lives in these values, not in
 * CSS. Every hex here is the exact value the website ships.
 */

export const color = {
  // Espresso, not black. Brown bias ~28° hue.
  bg: "#15110c",
  surface1: "#1d1811",
  surface2: "#262019",
  surface3: "#322a21",

  // Ivory, not white.
  fg: "#f0e5d6",

  // Aged terracotta — the old #ff7a6b read as bright UI red.
  accent: "#e5715b",
  accentFg: "#24100b",

  // Warm neutral ramp. Lights are creams, darks are coffee.
  n50: "#fbf6ee",
  n100: "#f3ebdf",
  n200: "#e7dccb",
  n300: "#cec0aa",
  n400: "#a89880",
  n500: "#978671",
  n600: "#7a6c58",
  n700: "#40372c",
  n800: "#2b241b",
  n900: "#1e1811",

  // Status is a colour language: read the shelf before reading any text.
  playing: "#6fbf88",
  finished: "#dfa646",
  backlog: "#8b8cc0",
  replaying: "#ac79c4",
  dropped: "#c06a63",
} as const;

export const statusColor: Record<string, string> = {
  playing: color.playing,
  finished: color.finished,
  backlog: color.backlog,
  replaying: color.replaying,
  dropped: color.dropped,
};

/** Three faces, three jobs — same split as the web app. */
export const font = {
  display: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  body: "Figtree_400Regular",
  bodyMedium: "Figtree_500Medium",
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_700Bold",
} as const;

/** 4pt grid. */
export const space = (n: number) => n * 4;

export const radius = {
  cover: 3,
  card: 4,
  pill: 999,
} as const;

/** Brown-black shadows — a neutral black punches a cold hole in a warm surface. */
export const shadow = {
  cover: {
    shadowColor: "#0e0804",
    shadowOpacity: 0.75,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
} as const;
