import type { MetadataRoute } from "next";

/**
 * Web app manifest — what makes GameLog installable from the browser.
 *
 * This is the whole point of shipping web-first: on iOS, Add to Home Screen
 * gives you an icon and a full-screen, chrome-less app with no App Store
 * account, no review, and no $99. It isn't a native app, but for a game log it
 * covers most of what one would do.
 *
 * `display: standalone` is what removes the browser UI. The theme and
 * background colours are the site's real tokens, so the splash and status bar
 * match the app rather than flashing white on launch.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GameLog",
    short_name: "GameLog",
    description: "Track, rate, and review the games you play.",
    start_url: "/",
    display: "standalone",
    background_color: "#15110c",
    theme_color: "#15110c",
    orientation: "portrait",
    categories: ["entertainment", "games", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
