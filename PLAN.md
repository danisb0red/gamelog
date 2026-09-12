# GameLog — iOS Build Plan

Living document. Updated as work lands. Status legend: ☐ todo · ◐ in progress · ☑ done · ⚠ blocked

---

## Goal — CHANGED 2026-09-11

**Launch the web app for $0. Defer the iOS app until there are users.**

Budget went to zero, and the App Store's $99/yr buys *distribution only* — the
web app is already feature-complete without it. A PWA manifest means people can
Add to Home Screen on iOS and get an icon and a full-screen app with no Apple
account, no review queue and no fee.

This is a return to the project's original June plan ("Web/PWA first, chosen for
$0 cost"). **None of the iOS work is wasted** — it's committed and working, and
the `/api/v1` surface plus RLS were built for it. Resume when there's a reason
to spend $99.

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

---

## CURRENT STATE (2026-09-11) — start here if resuming

Repo: **github.com/danisb0red/gamelog** (private)
Branch: `build/gamelog-web-and-ios` · `main` is still the empty CRA skeleton

### Done
- ☑ Everything committed and pushed (3 commits)
- ☑ DB hardened: RLS on 6 tables / 21 policies, 6 indexes,
  `profiles.id → auth.users` FK. Boundary verified, not just configured.
- ☑ Mobile nav on the web header (was `hidden md:flex` — phones had no nav)
- ☑ PWA manifest + icons + `viewport` export → installable on iOS
- ☑ iOS app builds natively and works (deferred, not abandoned)
- ☑ **Deployed:** https://gamelog-liard.vercel.app (Vercel Hobby, free)
- ☑ Keep-alive cron (`.github/workflows/keepalive.yml`, daily) so the DB never
  idles 7 days and pauses itself
- ☑ Sign-up collects a **name**, shown instead of the email address
- ☑ Shelf filters are client-side — no reload, no scroll jump

### In progress — web launch
- ☐ Wire `igdb_cache` table into the provider (table exists; provider still
  uses a module-level Map, which is cold on every serverless instance).
  Cold `/` was 6.9s.
- ☐ Optionally merge `build/gamelog-web-and-ios` → `main`
- ☐ No way to *edit* a display name after sign-up yet — the only paths in are
  sign-up and the email-local-part fallback.

### Display names
`ensureProfile` (`src/lib/auth.ts`) resolves a name in this order:
`user_metadata.display_name` (set at sign-up) → the local part of the email →
null (the page then falls back to `@username`). Rows written before sign-up
asked for a name stored the **whole email address**, so the upsert heals those
on next sign-in — matching only null-or-contains-`@`, so a real chosen name is
never overwritten.

### "You" is a nav destination, not a dropdown item
Lists, Wishlist and Favorites render **only** on the profile, and the avatar
dropdown was the only link to your own profile anywhere in the app (the other
two `/u/<name>` links point at *other* people — a list owner, a reviewer). So
three features sat behind an unlabelled circle plus a menu. The profile now has
a permanent slot: a fifth tab on mobile (78px each, past the 44pt minimum) and
a header nav item on desktop, both labelled **You**.
The avatar menu keeps only what navigation doesn't already show — identity and
Sign out. Rule of thumb for that menu: if it has a permanent home elsewhere at
every breakpoint, it does not belong in there.

### Shelf is its own page
`/u/[username]/shelf` is the collection; `/u/[username]` is identity plus a
"Recently logged" strip. The Shelf tab and the desktop nav point at the shelf;
the profile is reached from the avatar menu. Still four tabs.
Old `/u/x?status=…` links are 307'd in **`src/proxy.ts`**, not in the page —
the profile now streams a `loading` shell, and once that has flushed Next can
no longer send an HTTP redirect, degrading to a `<meta refresh>` with a 200.
Edge redirect happens before anything renders.

### Related games
"More like this" on every game page, from IGDB's curated `similar_games`,
expanded **inside the existing detail query** to stay under the 4 req/s cap.
Falls back to same-genre + ±4 years when a game has no curated list, re-ranked
by genre overlap (Adventure and Indie are dropped from the *filter* when a
narrower genre exists — matching on them just returns whatever is popular).
The detail query **retries once without the expansion** if it 400s: an unknown
field in `fields` is a hard error, and IGDB has renamed a field under us before
(`category` → `game_type`), so the related shelf must not be able to take the
whole game page down.

### `/` was 8.4s cold — IGDB cache now shared
The `igdb_cache` table was declared in `schema.ts` but **had never been created**
(`relation "igdb_cache" does not exist`). `scripts/add-igdb-cache.ts` creates it;
RLS is enabled with **zero policies** on purpose — it is server infrastructure,
the app reaches it as `postgres` (which bypasses RLS) and nobody else should.
The provider is now two-tier: L1 in-process Map, L2 the shared table, write-
through and awaited. Keys are `endpoint:sha256(body)` because a Postgres btree
entry caps near 2.7kB and an expanded Apicalypse body is not far off.
Measured on a fresh instance with L1 empty: **9.6s → 1.26s**, 18ms warm.

### Tapping HOME felt dead
Not an input bug — the tap target measured 98x56px. `/` is `force-dynamic` and
had **no `loading.tsx`**, so Next had nothing to show during navigation and the
old page just sat there: 3.7s of no feedback, so you tap again. `src/app/loading.tsx`
gives the route a prefetchable shell — measured **131ms to first paint** with `/`
artificially delayed 3s. `nav-pending.tsx` (`useLinkStatus`) adds a sweep on the
pressed tab for when a prefetch has not finished.

### Phones
The site was laid out for a desktop and left to reflow, which read as a tall web
page rather than something you hold. What changed, and why it has to stay:

- **Tab bar** (`bottom-nav.tsx`), rendered by `AppHeader` so it reuses the
  already-resolved profile. Replaces the second header row, which put the
  destinations in the furthest corner from your thumb and cost 36px on every
  page. Hidden from `md`.
- **`/search`** is a real screen. The header's search box had ~140px on a phone
  and clipped its own placeholder; it is now `hidden md:flex`.
- **Sheets** (`sheet.tsx`). Modals slide up from the bottom edge on phones.
  `SheetOverlay` **portals to `<body>`** — this is load-bearing: the layout wraps
  pages in `relative z-[2]` (to clear the fixed grain at z-1), which is a
  stacking context, so a modal rendered inside it could never out-rank the tab
  bar at z-50 no matter its z-index.
- **Safe areas.** `viewportFit: "cover"` was set with no `env(safe-area-inset-*)`
  anywhere, so content ran under the home indicator. See `.safe-b` / `.pad-tabbar`.
- **Grid is 3-up on phones** (`minmax(100px)` + `gap-x-3`); at `minmax(112px)`
  + `gap-x-5` only two fitted.
- **`--breakpoint-xs: 400px`** — Tailwind's smallest default stop is 640px.

**Two CSS traps found here, both live in this codebase:**
1. `.reg-mark`, `.hud-label` etc. are *unlayered* CSS that set `display`.
   Unlayered rules beat `@layer utilities`, so a Tailwind `hidden` on those
   elements does nothing. Wrap the element instead.
2. `PixelMemoryCard` hardcodes `inline-block`; Tailwind emits `.inline-block`
   *after* `.hidden`, so `hidden` loses there too. Same fix.
   `.hud-label` being `inline-flex` is also why the Metacritic badge sat on top
   of its own label — an inline sibling shares its line box.

Verified with Chrome at 390x844. Note: Playwright's `devices["iPhone 13"]`
emulates a retracting URL bar (layout viewport 714 vs visual 664) and pushes a
`bottom: 0` fixed bar off-screen — that is an emulation artifact, not a bug.
Shoot with `isMobile: false, hasTouch: true` instead.

### Wishlist
Its own `wishlist` table, **not** a sixth value in `logs.status`. A wishlisted
game has no rating, platform or play date, and the shelf, the diary and the
rating aggregates all iterate `STATUSES` — a new status would leak "want to
play" into every one of them. The separate table keeps the count separate by
construction; `src/lib/status.ts` is untouched.
Applied to prod with `scripts/add-wishlist.ts --apply` (idempotent, dry-run by
default): table + unique(user_id, game_id) + index + RLS with the same three
policies `favorites` has. Boundary-tested, not just configured — anon read 200,
anon insert 42501, forging another user's row 42501, own row 201/204.
Surfaces: a toggle in the game page action row (beside Log / Add to list /
Favorite), a fourth `wishlist` stat on the profile header, and its own profile
section above the shelf. No `/api/v1/wishlist` yet — the iOS app is deferred.

### Sign-in must leave the page with a full document load
`/login` sits under the root layout, and the header is *in* the root layout.
A client-side `router.push("/")` is a shared-layout transition, so Next keeps
the layout mounted rather than re-rendering it — the header stayed signed-out
("Sign in" still showing, no Shelf/Diary) until something else forced a
refresh, e.g. logging a game. `router.refresh()` does re-render layouts, but it
refreshes the route you are *still on*, and racing it against a push is why the
bug was intermittent. `login-form.tsx` now uses `window.location.assign("/")`.
Sign-out never had the bug because it is a plain form POST — a real navigation.
**If you ever add another client-side auth transition, do the same.**

### Shelf filtering
`ShelfBrowser` (`src/components/shelf-browser.tsx`) owns status + platform
state on the client. The tabs used to be `<Link href="?status=…">`, i.e. a full
server navigation per tap, which flashed `loading.tsx` and reset scroll to the
top. The whole collection is already fetched for the counts, so filtering is
local and instant; the URL is kept shareable via `history.replaceState`, which
does not navigate. The server still reads `?status`/`?platform` for the
*initial* render, so deep links and SSR still work.
`status-tabs.tsx` and `platform-filter.tsx` were deleted — folded into this.

### Vercel environment variables (values are in `.env.local`, never committed)
```
DATABASE_URL                          (transaction pooler, port 6543)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
TWITCH_CLIENT_ID
TWITCH_CLIENT_SECRET
GAMES_PROVIDER=igdb
RAWG_API_KEY                          (fallback provider, optional)
```

### Deferred to when there's $99
Apple Developer enrolment, account deletion, privacy policy, real bundle ID,
app icon, TestFlight. All tracked in the audit.

## Known risks
- Supabase free tier auto-pauses (hit twice) — production needs Pro.
- IGDB is a single point of failure and rate-limited to 4 req/s.
- Web repo still has 1 commit / 67 untracked files.
