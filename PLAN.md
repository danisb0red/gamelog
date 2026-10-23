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
- ☑ "Save file" removed from Home and Profile, "Last save" → "Last logged", memory-card glyph removed (2026-09-14 — an earlier note here claimed this before it was actually true on the web)
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

### Release calendar (`/releases`)
Month agenda of upcoming games, a spotlight for the week's biggest launch, a day
strip that follows your scroll (mini month on desktop), filters, and a wishlist
toggle on every row. Also feeds "Out this week" on Home and the empty Search
screen, and a "Coming up from your games" callout in Home's hero.

**Data rules — each one is a trap that was verified against live IGDB:**
- `release_dates` with **`date_format = 0` only**. Vaguer dates still carry a
  timestamp — "Q3 2026" is stamped **Sep 30** — so without this every
  quarter-dated game lands on the last day of the quarter.
- Release days are **00:00 UTC**. They are `YYYY-MM-DD` strings end to end and
  formatted with `timeZone: "UTC"`; turning one into a local Date moves it a day
  earlier for the Americas. "Today/Tomorrow" is computed client-side
  (`useSyncExternalStore`), since only the browser knows the viewer's date.
  Checked in Asia/Karachi and America/Los_Angeles: Wolverine is the 15th in both.
- One game → several days: IGDB `status` 34 = Advanced Access (Control Resonant
  is on PS5 the 22nd, launches the 24th), 3 = Early Access; 4/5/35/36 excluded.
- Rows more than 60 days after the game's own first release are **re-releases**
  ("New platforms") — Fallout 76 on PS5 isn't a launch. The spotlight only ever
  picks true launches.
- Query is `game.hypes > 0` (a month drops from 1,673 rows to ~576, 2 pages),
  plus a second query by id for the viewer's own games so a low-hype game on
  your wishlist still appears. Pages of 500, up to 6.

**Speed:** a cold month is ~6.8s (several pages behind the 4 req/s limit), 2ms
from `igdb_cache`. So the month header renders outside a Suspense boundary and
the calendar streams in behind a matching skeleton; Home's two consumers share
one load via React `cache()`. Release queries put a date in the cache key, so
`cacheSet` sweeps expired `igdb_cache` rows ~2% of the time to keep the table
bounded. TTL is 3h (delays land often).

**Default view is Highlights** (hype ≥ 10 or one of your games). "All" is
~280 a month and mostly unknown PC releases; a month with no highlights opens on
All instead of an empty filter.

**CSS trap found here:** the build keeps only `-webkit-backdrop-filter` from
`globals.css` and drops the standard property, so the "frosted" tab bar was never
blurred in Chrome or on Android. Blur now comes from Tailwind's
`backdrop-blur-xl` utility on the element, which survives. Don't put
backdrop-filter in `globals.css`.

### Adding games to a list
`AddGamesToList` (`src/components/add-games-to-list.tsx`) — owner-only button on
the list page that opens a search sheet. It **stays open after each add**, which
is the whole point: building a list used to mean leaving it (open a game page →
Add to list → pick list → back → repeat). Games already on the list arrive as
`existingIds` and render as "✓ On list" from the first frame, so a duplicate is
never offered — the API no-ops on one, which would otherwise look like a dead
button. No API change was needed; `POST /api/lists/:id/items` already checked
ownership, cached the game and appended.

### Auth: handles, forgot-password, email links
- **The email problem (measured, not assumed):** the project uses Supabase's
  built-in email sender, which allows ~2 auth emails an hour for the *whole
  project*. A second `recover` call minutes after the first returned
  `429 over_email_send_rate_limit`. So with "Confirm email" ON, the third signup
  in an hour fails, and forgot-password is just as limited. The UI now turns that
  code into "We're sending a lot of email right now" instead of raw text.
  **Fix is dashboard-only:** either turn "Confirm email" off (signup then needs
  no email at all; the code already handles a session coming back from signUp),
  or set custom SMTP (Gmail + app password is free, no domain needed). Forgot-
  password needs working email either way.
- **Handle picker** (`src/lib/handle.ts`): 3-20 of `[a-z0-9_]`, a reserved list,
  and `user_<8 hex>` is reserved because it is the auto-generated fallback shape.
  Live availability via `GET /api/handle` (public — handles are already public).
  The handle travels in `user_metadata.username` and is **claimed in
  `ensureProfile`**, not at signup, because with confirmation on the profile row
  doesn't exist for days. A taken handle falls through `asked` -> `asked_NNNN` ->
  `user_xxxxxxxx` instead of failing; a failure there would leave someone signed
  in with no profile. user_metadata is user-editable, so it is re-validated
  server-side. Conflict target is the id only: a bare `onConflictDoNothing()`
  would swallow a username clash and silently skip creating the profile.
  Existing accounts keep their `user_xxxxxxxx` handle (no rename UI yet).
- **`/auth/callback`**: `?code=` (PKCE) and `?token_hash=&type=` (verifyOtp).
  `next` is same-site paths only (open-redirect tested). A PKCE code needs the
  verifier cookie from the browser that asked, so opening the email on another
  device fails the exchange; for signup that still means the email *is*
  confirmed, so it lands on `/login?notice=confirmed`. The robust fix for resets
  is the `token_hash` flow, which needs the email templates changed in the
  dashboard to link to `/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
  Supabase's redirect allow-list already honours any path on the site (checked
  with `generate_link`; localhost is *not* allowed, so email flows can't be
  tried from a local server).
- `/reset-password` sets the new password; no session = "Link expired".
- **Privacy:** `/privacy`, a sitewide footer (IGDB credit + privacy link), and a
  line under the signup button. No analytics/trackers exist (checked). The
  deletion contact is `NEXT_PUBLIC_CONTACT_EMAIL`; unset, the page says to reply
  to wherever the person found GameLog. There is no self-serve account deletion.
- Env: `GOOGLE_SITE_VERIFICATION` (Search Console HTML tag value) and
  `NEXT_PUBLIC_CONTACT_EMAIL`, both optional, in `.env.local.example`.
- Also fixed in the form: autocomplete hints (email / username / new-password),
  show-password toggle, friendly error text, error colour contrast (was 3.9:1).
- Empty states: `EmptyShelf` was a child of `.shelf`, where every child is
  `flex: none`, so on a phone it ran off the edge and clipped mid-word. It is now
  `w-full`, stacks below `sm`, and takes an `action` button ("Find a game").

### Discoverability: metadata, share cards, sitemap
Before this, every page was `<title>GameLog</title>` with no og tags, no JSON-LD,
no sitemap or robots, so a shared link previewed as nothing and Google had
nothing to index.
- `src/lib/site.ts`: `siteUrl()` = `NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL`
  → localhost. Set `NEXT_PUBLIC_SITE_URL` when a custom domain exists.
- `pageMetadata()` (`src/lib/seo.ts`) — one call per page. **Each page names its
  share-card URL explicitly.** Relying on Next to inject the segment's
  `opengraph-image` file worked for `/`, `/releases`, `/login` but silently did
  NOT for the dynamic routes (game, profile) — the pages people actually share
  shipped with a title and no picture. Don't go back to `ownImage`.
- Cards: `opengraph-image.tsx` at root, `g/[slug]`, `list/[id]`, `u/[username]`
  (`ImageResponse`: flexbox only, ≤500KB, bundled Space Grotesk ttf). They never
  500 — a failed cover fetch renders a text-only card.
- **Profiles, shelves and diaries are `noindex`** (no one consented to Google
  indexing their logs; there's no privacy policy yet) but previews still work, so
  `/u/` is NOT disallowed in robots.txt (a disallow can break link previews).
- `VideoGame` JSON-LD on game pages; `aggregateRating` only from GameLog's own
  users, never IGDB's (third-party ratings in markup are treated as spam).
- A missing game still answers HTTP 200 (`loading.tsx` streams first), so it
  carries `noindex`. Keep `loading.tsx` — it fixed the HOME-tap lag.
- `sitemap.ts` (~300 URLs, 1h revalidate, each source wrapped so IGDB/DB being
  down degrades to static URLs) and `robots.ts`.
- **User to-do:** verify the site in Google Search Console (HTML-tag method for a
  `.vercel.app` URL) and submit `/sitemap.xml`.

### Quick log
`+` on a search result → five status chips inline → saved. Two taps after typing
(was four plus a page load). `quick-log.tsx`, used by the mobile search screen and
the desktop dropdown. `/api/games/search` returns `mine` (the viewer's latest
entry per result). An entry made *this session* is amended in place through
`PATCH /api/logs/:id` (ownership is in the query's WHERE); an entry from an
earlier day gets a new dated entry, because playing → finished is a real diary
event. The chip row also has a dashed **Wishlist** chip: it toggles the separate
wishlist (never the diary), `/api/games/search` returns `wishlisted` beside `mine`,
and a game that is both logged and wishlisted shows its status with a bookmark.
Signed-in search costs ~0.4s more than signed-out (auth + one query) — see
the region note below.

### Community rating = one vote per person
`logs` is a diary, so one person can hold several entries for a game and each
status change carries the rating forward. The average used to count every rated
row, so one person counted several times (already true in prod: Hades stored as 2
ratings from one user). `src/lib/db/ratings.ts` takes each person's latest *rated*
entry; the write path (POST/PATCH) and the read path share it.

### Game Pass: "Leaving soon" for your games
Public unofficial feeds at `catalog.gamepass.com` (verified by feed title: PC
`fdd9e2a7…` is "All PC Games", console `f6f1f99f…`, EA Play `b8900d09…`, plus
"Recently added" and "Leaving soon"). "On Game Pass" = the union, 823 products.
Matched to IGDB by store id then by normalised title (+ release-year tiebreak);
710/823 (86%); the leaving list matched 7/7. 223 matches read by hand, 0 wrong —
**a wrong match is worse than a miss**. Feeds carry no leaving *dates* and no tier
info, so the UI says "Leaving Game Pass soon" and "US catalog", never a date.
Tables `gamepass_products` / `gamepass_sync` (RLS on, no policies). Refresh-on-read
with `after()` (fresh <12h, stale-while-revalidate, hidden after 72h, single-flight
via an atomic claim). Endpoints are unofficial: if they change shape the feature
hides and logs. First-ever refresh is ~90s inside `after()` — fine on the current
plan, watch it if function limits are ever lowered.

### Calendar feed
Private `.ics` of upcoming releases for wishlist + backlog/playing/replaying games
(not finished/dropped). Exists because iOS web push needs an installed PWA and
email needs a domain. Token = the credential; only its SHA-256 is stored
(`calendar_tokens`, RLS deny-all — never on `profiles`, which is public);
regenerate kills the old link. RFC 5545: CRLF, fold at 75 *octets*, all-day
events, **UID is per game with a constant suffix** (`game-<id>@gamelog`) so a moved
date updates in place and a domain change can't duplicate every event. A provider
failure returns 503, not an empty feed — a subscribed client treats empty as
"everything cancelled" and would wipe the user's events. Calendar apps, not us,
decide refresh timing (can be a day); reminders aren't promised.

### Vercel free-plan CPU (2026-10-23)
Hobby's 4h/month Active CPU was exceeded and Invocations hit 758K/1M. Measured in
Vercel Observability, not guessed: **`googleother` was 16K requests (~85% of bot
traffic), all on `/g/[slug]`**, plus `amazonbot` 1.6K; real Googlebot was 782.
GoogleOther is Google's research crawler, not Search indexing.
- `robots.ts` disallows `GoogleOther` and `Amazonbot`. Googlebot untouched.
- `vercel.json` pins functions to `sin1`, next to the database (was `iad1`).
- The game page used to UPDATE `games` on **every view**; it now writes in `after()`
  and only when the row is over a day old (`setWhere` on `synced_at`). Verified: no
  change on repeat hits, refreshes once the row is stale.
- `proxy.ts` returns early when there is no `sb-` cookie (nothing to refresh).
- **Not done, on purpose:** CDN-caching game pages. The page and the header in the
  root layout read the login cookie, which is also why even `/privacy` is dynamic;
  a shared cache could serve one person's header to another. Doing it properly means
  Cache Components / PPR so the header streams around a static shell.
- Share cards already send `s-maxage=86400`; their 0.2% hit rate was a crawler asking
  for each game once, which no cache can help.

### RESOLVED 2026-10-23: functions ran in Washington, the database is in Singapore (now `sin1`)
`x-vercel-id` on every live response is `bom1::iad1`: functions run in `iad1`
(US East) while Supabase is `ap-southeast-1`. Every query pays a trans-oceanic
round trip and pages run several in sequence — the likely cause of the ~3s
`/releases`, and of the ~0.5s added by any signed-in request (auth + a query).
Candidate fix: `vercel.json` `"regions": ["sin1"]`. Not yet applied.

### Working in parallel: agent worktrees
Agents build in isolated `git worktree`s (`.claude/worktrees/`), each on its own
branch and port, and the lead reviews and merges. Lessons: `.claude/` must stay
out of eslint/tsc (`eslint.config.mjs`, `tsconfig.json`) or ~18,000 phantom lint
errors appear; add `.claude/` to `.git/info/exclude` so `git add -A` can't stage
worktrees; agents can't run migrations blindly — new tables only, dry-run first,
RLS boundary-tested by the lead afterwards.

### Navigation order
Phone tab bar: **Home · Shelf · Releases · Search · You** (signed out: Home ·
Releases · Search · Sign in). Desktop nav uses the same order: Home · Shelf ·
Releases · You, with search in the header.
- **Diary has no tab.** It's your own history, so it lives on You as a Diary
  section (last 5 entries + "Full diary"). That section replaced a "Recently
  logged" cover strip that showed the same rows, and the small "Read the
  diary" header link. The You tab stays active on `/u/<you>/diary`.
- **Search stays a tab** — below `md` it is the only search on the site, and
  finding a game is the first step of logging anything.

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
