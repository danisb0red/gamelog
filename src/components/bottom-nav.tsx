"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TabPending } from "./nav-pending";

type Tab = { href: string; label: string; icon: React.ReactNode; match: (p: string) => boolean };

/**
 * Icons.
 *
 * Deliberately plain line marks rather than the pixel sprites used elsewhere on
 * the site. A whole row of pixel-art glyphs would read as a game interface, and
 * navigation is the one place that has to be boringly legible — you look at it
 * a hundred times a day and should never have to decode it.
 */
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" {...stroke}>
      <path d="M3.5 10.5 12 4l8.5 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-6v5H4.5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" {...stroke}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

/** Three standing spines — the shelf, not a generic grid. */
function IconShelf() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" {...stroke}>
      <rect x="4" y="4.5" width="4.5" height="13" rx="1" />
      <rect x="10.5" y="4.5" width="4.5" height="13" rx="1" />
      <rect x="17" y="7" width="3.5" height="10.5" rx="1" />
      <path d="M3 20h18" />
    </svg>
  );
}

function IconDiary() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" {...stroke}>
      <path d="M5.5 4h11a1 1 0 0 1 1 1v15l-3-2-3 2-3-2-3 2V5a1 1 0 0 1 1-1z" />
      <path d="M8.5 8.5h5M8.5 12h5" />
    </svg>
  );
}

/** Also the signed-out "Sign in" mark: the two are never on screen together. */
function IconYou() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" {...stroke}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" />
    </svg>
  );
}

/**
 * Mobile tab bar.
 *
 * The destinations used to live in a second row under the header — the far
 * corner of the screen from where your thumb actually is, and 36px of vertical
 * space spent on every page. Down here they are reachable one-handed, the
 * current section is always visible, and the header gets its row back.
 *
 * Hidden from `md` up, where the header nav takes over.
 */
export function BottomNav({ username }: { username: string | null }) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { href: "/", label: "Home", icon: <IconHome />, match: (p) => p === "/" },
    { href: "/search", label: "Search", icon: <IconSearch />, match: (p) => p.startsWith("/search") },
    ...(username
      ? [
          {
            href: `/u/${username}/shelf`,
            label: "Shelf",
            icon: <IconShelf />,
            match: (p: string) => p === `/u/${username}/shelf`,
          },
          {
            href: `/u/${username}/diary`,
            label: "Diary",
            icon: <IconDiary />,
            match: (p: string) => p === `/u/${username}/diary`,
          },
          // Lists, Wishlist and Favorites live on the profile and nowhere else,
          // and until this tab existed the only route to any of them was an
          // unlabelled avatar in the far corner, then a dropdown. Five tabs puts
          // each at 78px on a 390px screen — comfortably past the 44pt minimum.
          {
            href: `/u/${username}`,
            label: "You",
            icon: <IconYou />,
            // Exact: /shelf and /diary sit underneath and own their own tabs.
            match: (p: string) => p === `/u/${username}`,
          },
        ]
      : [
          {
            href: "/login",
            label: "Sign in",
            icon: <IconYou />,
            match: (p: string) => p.startsWith("/login"),
          },
        ]),
  ];

  return (
    <nav
      aria-label="Primary"
      className="tab-bar safe-b fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800/70 backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="flex">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                // min-h-14 keeps every tab a comfortable target regardless of
                // how short the label is.
                className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 transition-colors ${
                  active ? "text-accent" : "text-neutral-500"
                }`}
              >
                {/* The active marker is a short bar on the top edge, echoing the
                    underline the shelf tabs already use. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 mx-auto h-0.5 w-8 bg-accent transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                {/* Must be inside the Link — useLinkStatus reports the status
                    of the Link it is rendered within. */}
                <TabPending />
                {t.icon}
                <span className="font-mono text-[9px] uppercase tracking-[0.14em]">
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
