import type { Metadata, Viewport } from "next";
import { Figtree, Space_Grotesk, Space_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { Konami } from "@/components/konami";
import { HiddenMark } from "@/components/hidden-mark";
import { SiteFooter } from "@/components/site-footer";
import { siteUrl } from "@/lib/site";

/** Body copy — warm, readable, carried over from the previous identity. */
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

/** Display — geometric and slightly technical. Headlines and the wordmark. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

/** Metadata — counts, dates, platforms, status. */
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  // Relative og:image / canonical URLs in every page's metadata resolve
  // against this, so they come out absolute — crawlers ignore relative ones.
  metadataBase: new URL(siteUrl()),
  title: { default: "GameLog", template: "%s · GameLog" },
  description: "Track, rate, and review the games you play.",
  openGraph: { siteName: "GameLog", type: "website", locale: "en_GB" },
  twitter: { card: "summary_large_image" },
  // Named explicitly because Google wants a favicon at a stable URL in a multiple
  // of 48px; the generated favicon.ico is 256px at a hashed address.
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-icon.png",
  },
  // Lets iOS render the home-screen app full-screen with a dark status bar
  // instead of a white browser chrome.
  appleWebApp: { capable: true, title: "GameLog", statusBarStyle: "black-translucent" },
  // Search Console "HTML tag" ownership proof for gamelog-liard.vercel.app. Not a
  // secret — it is served in every page's HTML. GOOGLE_SITE_VERIFICATION
  // overrides it, which is how to re-verify a different address (a custom
  // domain is a separate property with its own token).
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "L1osGAMzF3EjcB9HjOTGcIdx8SvXO-naIUQy8oCNb5k",
  },
};

/**
 * `viewport` is a separate export from `metadata` in Next 16 — putting
 * themeColor in `metadata` is deprecated and silently ignored.
 *
 * `viewportFit: "cover"` lets the page paint into the notch and home-indicator
 * areas, which is required for an installed PWA not to letterbox itself.
 */
export const viewport: Viewport = {
  themeColor: "#15110c",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `dark` is set unconditionally: GameLog is a dark product by design, not by
    // OS preference. See the note at the top of globals.css.
    <html
      lang="en"
      className={`dark ${figtree.variable} ${spaceGrotesk.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="grain flex min-h-full flex-col overflow-x-hidden bg-surface-0">
        <AppHeader />
        {/* pad-tabbar reserves the height of the mobile tab bar (and the home
            indicator beneath it) so the end of a page is never trapped under it. */}
        <div className="pad-tabbar relative z-[2] flex flex-1 flex-col">
          {children}
          <SiteFooter />
        </div>
        <HiddenMark />
        <Konami />
        <Analytics />
      </body>
    </html>
  );
}
