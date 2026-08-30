# GameLog — iOS Build Plan

Living document. Updated as work lands. Status legend: ☐ todo · ◐ in progress · ☑ done · ⚠ blocked

---

## Goal

A real, installable iOS app backed by live data, sharing the existing Supabase
backend with the web app. The web app stays working throughout.

## Architecture (decided)

```
  Web (Next.js)  ─┐
                  ├─► Next.js /api/v1 (JSON) ─► Supabase Postgres (Drizzle)
  iOS (Expo)    ─┘            │
                              └─► IGDB (credentials stay server-side)

  iOS ─► Supabase Auth directly (JWT) ─► sent as Bearer to /api/v1
```

**Why one API for both clients:** a single authorisation implementation, and
IGDB credentials never reach a device. iOS does *not* talk to Postgres directly.

---

## Phases

### Phase 1 — Toolchain ☑
Real native build working; `mobile.app` installs and launches on the simulator.

Three separate failures, fixed in order:
1. ☑ **`SWIFT_RETURNS_RETAINED` on constructors** (`expo-modules-jsi`). Only legal
   on functions returning a `SWIFT_SHARED_REFERENCE` type; Xcode 26's Swift
   compiler enforces that where older ones ignored it.
   → `patches/expo-modules-jsi+57.0.6.patch`, applied by a `postinstall` hook.
2. ☑ **Unquoted `$PODS_TARGET_SRCROOT`** in expo-constants' script phase.
   → `post_install` hook in `ios/Podfile` (nested dep, so patch-package can't
   reach it, and `pod install` regenerates the phase anyway).
3. ☑ **Unquoted backtick expansion** in RN's "Bundle React Native code and
   images" phase. → quoted in `ios/mobile.xcodeproj/project.pbxproj`.

**Root cause of 2 and 3 is the same:** this repo lives under
`.../Summer Stuff/...` and Apple/RN tooling is full of unquoted paths. Any new
unquoted-path failure will look like
`No such file or directory: /Users/daniyalasif/Documents/Summer`.
Moving the repo to a space-free path would prevent the whole class.

- **Done when:** ☑ `npx expo run:ios` builds and launches without Expo Go.

### Phase 2 — API v1 (web repo) ☑
- ☑ `getRequestUser(request)` in `lib/auth.ts` — Bearer first, cookie fallback.
  The existing `/api/logs`, `/api/favorites`, `/api/lists*` routes were switched
  to it too, so web and iOS share one authorisation path.
- ☑ `/api/v1/me` · `/shelf` · `/diary` · `/games/[slug]` · `/search` · `/trending`
- ☑ `/api/v1/logs` is a **re-export** of the original handler, not a copy — it
  already had the validation, lazy game cache, profile upsert and rating
  aggregate refresh. Duplicating it would mean two places to fix a bug.
- **Verified with a real JWT:** me → `demoplayer, 9 games, avg 4.0`;
  shelf → `9 games / 5 playing`; diary → `12 entries`; game detail → Celeste
  with 6 screenshots; `POST /logs` → **201**. Test row deleted afterwards.

### Phase 3 — Mobile foundation ☑
- ☑ `src/lib/supabase.ts` — auth only, **AsyncStorage not SecureStore** (a
  Supabase session exceeds SecureStore's 2048-byte limit).
- ☑ `src/lib/api.ts` — typed client, reads the session per call so a refreshed
  token is picked up with no coordination.
- ☑ Sign in / sign up screen
- ☑ Auth gate + custom tab bar (hand-rolled: three tabs and one pushed screen
  don't justify a navigator, and a navigator would fight the custom tab bar).

### Phase 4 — Screens ☑
- ☑ **Home** — ambient artwork wash, currently-playing shelf, collection stats
  with segmented meter, activity timeline, numbered shelf grid, pull to refresh
- ☑ **Search** — debounced, seeded with trending so the tab is never empty
- ☑ **Game detail** — ambient wash, cover, ratings, description, screenshots
- ☑ **Log flow** — a bottom **sheet** (the native idiom) not a centred dialog:
  status chips, stars, review, `SAVED` confirmation
- ☑ **Profile** — identity plate, stats, status breakdown, sign out
- Diary is folded into Home's activity section for v1.

### Phase 5 — Build & verify ◐
- ☑ Native build installs and launches (`com.anonymous.mobile`)
- ☑ Sign-in screen renders in the native binary
- ☐ App icon + splash still the Expo defaults
- ☐ Bundle id still `com.anonymous.mobile` — needs a real reverse-DNS id
- ☐ Release build (currently Debug, needs Metro)

### Deferred to submission (not needed for a working app)
Account deletion (App Store 5.1.1(v) blocker), privacy policy, nutrition
labels, screenshots, TestFlight. Tracked in the audit, not here.

---

## Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-08-16 | Expo over Capacitor/Swift | Next 16 dynamic App Router can't static-export, so Capacitor = remote WebView = App Store 4.2 risk. UI reuse is 0% under every option. |
| 2026-08-16 | iOS → own API, not direct Postgres | One authorisation implementation; IGDB creds stay server-side. |
| 2026-08-16 | Design tokens ported by value | Identity lives in the hex values + type hierarchy, not in CSS. |

### Round 2 — review feedback ☑ (2026-08-16)
- ☑ "Save file" removed from Home and Profile (no game-vocabulary labels left)
- ☑ Favourites on Profile — four slots, empty ones drawn; new `GET /api/v1/favorites`
- ☑ Developer name on a game page is now tappable → Developer screen;
  new `GET /api/v1/developers/[slug]`
- ☑ Community reviews rendered on game detail (the data was already being
  fetched and thrown away)
- ☑ Shelf status sections: All / Playing / Backlog / Played / Replaying / Dropped
- ☑ Uniform cover widths on the shelf (the featured-first cover was arbitrary)
- ☑ **Duplicate games fixed at the data layer.** Nine titles had two `games`
  rows — leftover RAWG ids alongside the new IGDB ids, because `games.id` is
  the provider id used as the primary key. `scripts/merge-duplicate-games.ts`
  asks IGDB which id is authoritative per slug, repoints logs/favorites/
  list_items, then deletes the loser. Never rewrites `games.id`, so no FK is
  ever dangling. Applied: 9 merged, 12 logs repointed, 13 logs preserved.
  (Batman showing 3× was *not* a bug — three dated diary entries, by design.)

### Round 3 — layout feedback ☑ (2026-08-16)
- ☑ **Shelf moved to its own tab.** Tabs are now Home / Shelf / Search / You.
  A full collection grid sitting under an activity feed made Home endless —
  Letterboxd separates your films from what's happening for the same reason.
  Home keeps hero, currently playing, stats and recent activity.
- ☑ **Grid density fixed properly.** Cover width is computed from the viewport
  (`useWindowDimensions`) instead of a hardcoded 104px, which had been leaving
  a dead column. On a 390pt phone: `(390 − 40 gutters − 24 gaps) / 3 = 108px`,
  so covers are **3 per row and slightly larger** than before, edge to edge.
  Tablets get 5 columns. Applied to Shelf, Developer and the favourites row.

### Round 4 — diary & detail ☑ (2026-08-16)
- ☑ **Metacritic is a coloured chip**, using Metacritic's own convention —
  green ≥75, yellow ≥50, red below. A bare number carried none of that meaning.
- ☑ **Diary screen** (`src/screens/Diary.tsx`): the full log history grouped by
  month with sticky headers, day-of-week column, status colour, rating and
  review. A game appears once per dated entry — that's the difference between
  the diary ("what did I do") and the shelf ("what do I have").
  `SectionList` so long histories stay cheap and month headers stick.
- ☑ Reachable two ways: **ALL →** beside Recent activity on Home, and a
  **DIARY** row on the You tab.
- ☑ **Your reviews** — the same screen with `reviewsOnly`, filtering to entries
  that have written text. No new endpoint needed; the diary payload already
  carries the review field.

### Round 5 — production hardening ☑ (2026-08-16)
- ☑ **Committed.** Branch `build/gamelog-web-and-ios`, 149 files tracked, 0
  untracked, 3.1MB. `ios/` is deliberately **not** ignored (Expo's default)
  because it carries the two path-quoting build fixes; without them a fresh
  clone can't compile. Verified no secrets staged.
- ☑ **`scripts/harden-db.ts`** — idempotent, dry-run by default:
  - orphan `demo` profile removed (pre-auth seed, blocked the FK)
  - `profiles.id → auth.users(id) ON DELETE CASCADE` + dropped the random
    default. Account deletion now actually cascades, which Apple requires.
  - 6 indexes on the columns every shelf/diary/profile query filters by
  - **RLS on all 6 tables, 21 policies.** Reads are public where the web app
    already made them public (profiles, community reviews); writes are
    owner-only.
- ☑ **Verified the boundary, not just the config:** anon *can* read reviews,
  anon *cannot* insert, an authenticated user *cannot* forge a row under
  another user's id (`42501` both times). Web app unaffected — it connects as
  `postgres`, which has BYPASSRLS.

## Known risks
- Supabase free tier auto-pauses (hit twice) — production needs Pro.
- IGDB is a single point of failure and rate-limited to 4 req/s.
- Web repo still has 1 commit / 67 untracked files.
