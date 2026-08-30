import {
  bigint,
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Profiles — public user data. The id will line up with Supabase Auth's
 * auth.users.id once auth is wired in; for now we seed a demo profile so logs
 * have an owner.
 */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Games — a local cache of provider (RAWG/IGDB) data, written lazily the first
 * time a game is logged or viewed. `id` is the provider's id.
 */
export const games = pgTable("games", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  coverUrl: text("cover_url"),
  releaseYear: integer("release_year"),
  // Cached aggregates, recomputed on log writes.
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 }),
  ratingCount: integer("rating_count").default(0).notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Logs — the core table. One row = one user's relationship to one game.
 * A rating is a log with a number; a review is a log with text.
 */
export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  gameId: bigint("game_id", { mode: "number" })
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // playing | finished | backlog | dropped | replaying
  rating: numeric("rating", { precision: 2, scale: 1 }), // 0.5–5.0, nullable
  review: text("review"),
  platform: text("platform"), // e.g. "PC", "PlayStation 5" — what they played it on
  loggedAt: timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Lists — user-curated collections of games (e.g. "Favorite RPGs"), optionally
 * ranked. The signature Letterboxd-style feature.
 */
export const lists = pgTable("lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  isRanked: boolean("is_ranked").default(false).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const listItems = pgTable(
  "list_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listId: uuid("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    gameId: bigint("game_id", { mode: "number" })
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull(), // ordering within the list
    note: text("note"),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.listId, t.gameId)], // a game appears at most once per list
);

/** Up to 4 favorite games shown at the top of a profile (Letterboxd-style). */
export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    gameId: bigint("game_id", { mode: "number" })
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [unique().on(t.userId, t.gameId)],
);

export type Profile = typeof profiles.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Log = typeof logs.$inferSelect;
export type List = typeof lists.$inferSelect;
export type ListItem = typeof listItems.$inferSelect;
