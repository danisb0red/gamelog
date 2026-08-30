/**
 * Real rows pulled from the live GameLog database, frozen into the prototype so
 * it renders identically whether or not Supabase is awake. Covers are the real
 * IGDB URLs the web app serves.
 */
export type Game = {
  name: string;
  cover: string;
  year: number;
  status: keyof typeof import("../theme/tokens").statusColor | string;
  rating: number | null;
  platform: string | null;
};

const img = (id: string) =>
  `https://images.igdb.com/igdb/image/upload/t_cover_big/${id}.jpg`;

export const playing: Game[] = [
  { name: "ROBLOX", cover: img("cociyw"), year: 2006, status: "playing", rating: null, platform: "Nintendo Switch" },
  { name: "007 First Light", cover: img("coaoiz"), year: 2026, status: "playing", rating: null, platform: null },
  { name: "Hades", cover: img("cob9kr"), year: 2020, status: "playing", rating: 5.0, platform: null },
];

export const shelf: Game[] = [
  ...playing,
  { name: "Elden Ring", cover: img("co4jni"), year: 2022, status: "finished", rating: 4.5, platform: null },
  { name: "The Legend of Zelda: Breath of the Wild", cover: img("co3p2d"), year: 2017, status: "finished", rating: 5.0, platform: "Nintendo Switch" },
  { name: "Batman: Arkham Origins", cover: img("co1nmd"), year: 2013, status: "finished", rating: 3.5, platform: "PlayStation 5" },
  { name: "Grand Theft Auto V", cover: img("co2lbd"), year: 2013, status: "backlog", rating: null, platform: "Xbox 360" },
  { name: "Stardew Valley", cover: img("coa93h"), year: 2016, status: "backlog", rating: null, platform: "PC" },
  { name: "Silent Hill 2", cover: img("co7t3n"), year: 2024, status: "dropped", rating: 2.5, platform: "PC" },
];

export const recent = [
  { name: "Hades", cover: img("cob9kr"), status: "playing", verb: "started playing", date: "AUG 14", rating: 5.0 },
  { name: "Elden Ring", cover: img("co4jni"), status: "finished", verb: "finished", date: "AUG 09", rating: 4.5,
    review: "Spent forty hours lost in Caelid and would do it again." },
  { name: "Grand Theft Auto V", cover: img("co2lbd"), status: "backlog", verb: "shelved", date: "JUL 28", rating: null },
];

export const profile = {
  name: "Demo Player",
  handle: "demoplayer",
  games: 9,
  rated: 5,
  average: 4.0,
  lastSave: "25 JUN 2026",
  completed: "3 of 9",
  platform: "Xbox 360",
};
