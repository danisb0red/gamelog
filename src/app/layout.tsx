import type { Metadata } from "next";
import { Figtree, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { Konami } from "@/components/konami";
import { HiddenMark } from "@/components/hidden-mark";

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

/** Metadata — counts, dates, platforms, status. The save-file register. */
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "GameLog",
  description: "Track, rate, and review the games you play.",
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
        <div className="relative z-[2] flex flex-1 flex-col">{children}</div>
        <HiddenMark />
        <Konami />
      </body>
    </html>
  );
}
