import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Shared pieces of the 1200x630 share cards. Satori (behind ImageResponse)
 * supports flexbox only — every element with more than one child needs an
 * explicit display:flex, and there is no grid.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const C = {
  bg: "#15110c",
  ivory: "#f0e5d6",
  muted: "#a09080",
  accent: "#e5715b",
  plate: "#241d16",
  edge: "#3a3026",
} as const;

const PAD = 64;

let fontPromise: Promise<Buffer> | null = null;
function loadFont() {
  // process.cwd() + a literal path is the form the file tracer follows when it
  // decides what to ship with the serverless function.
  fontPromise ??= readFile(join(process.cwd(), "src/assets/SpaceGrotesk-Bold.ttf"));
  return fontPromise;
}

/** IGDB's cover_big is 264x374 — soft at card size. 720p is ~540x720. */
function sharpCover(url: string): string {
  return url.replace("/t_cover_big/", "/t_720p/");
}

/**
 * Fetches a cover as a data URL, or null on any failure. The card is a
 * nice-to-have: a slow or dead image host must degrade it to text, never
 * fail the route (satori throws on an unfetchable <img src>).
 */
export async function fetchCover(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(sharpCover(url), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    // Satori decodes png/jpeg/gif; webp would throw at render time.
    if (!/image\/(jpeg|png|gif)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 3_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Largest of a few sizes at which `text` should fit in `maxLines` lines. */
export function fitFont(text: string, width: number, maxLines: number, sizes = [88, 76, 64, 54, 46]): number {
  for (const s of sizes) {
    const perLine = Math.floor(width / (s * 0.58));
    // Words don't break evenly; assume the last line of each wrap wastes ~15%.
    if (Math.ceil(text.length / (perLine * 0.85)) <= maxLines) return s;
  }
  return sizes[sizes.length - 1];
}

export function Wordmark({ size: fs = 40 }: { size?: number }) {
  return (
    <div style={{ display: "flex", fontSize: fs, letterSpacing: -1, color: C.ivory }}>
      game<span style={{ color: C.accent }}>log</span>
    </div>
  );
}

export function Cover({ src, width, height }: { src: string; width: number; height: number }) {
  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        borderRadius: 8,
        overflow: "hidden",
        background: C.plate,
        border: `2px solid ${C.edge}`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={width} height={height} style={{ objectFit: "cover" }} alt="" />
    </div>
  );
}

/** Up to four covers, 2x2. One cover gets a larger single slot. */
export function CoverGrid({ covers }: { covers: string[] }) {
  if (covers.length === 0) return null;
  const solo = covers.length === 1;
  const w = solo ? 330 : 180;
  const h = solo ? 440 : 240;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        width: solo ? w : w * 2 + 20,
        justifyContent: "center",
        alignContent: "center",
        gap: 20,
      }}
    >
      {covers.slice(0, 4).map((src, i) => (
        <Cover key={i} src={src} width={w} height={h} />
      ))}
    </div>
  );
}

export function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: C.bg,
        color: C.ivory,
        fontFamily: "Space Grotesk",
        padding: PAD,
        position: "relative",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: 8,
          background: C.accent,
        }}
      />
    </div>
  );
}

export const TEXT_WIDTH_FULL = size.width - PAD * 2;

/**
 * Renders a card, and on any failure renders the default site card instead —
 * a share-card route must never 500, because the consumer is a chat app that
 * would then show a broken image next to the link.
 *
 * `maxAge` is how long shared caches may keep it; a fallback gets a short
 * lifetime so a transient failure doesn't stick for a day.
 */
export async function respond(build: () => Promise<React.ReactElement>, maxAge: number) {
  const fonts = [{ name: "Space Grotesk", data: await loadFont(), weight: 700 as const, style: "normal" as const }];
  const cache = (s: number) => ({
    "Cache-Control": `public, max-age=300, s-maxage=${s}, stale-while-revalidate=${s * 7}`,
  });
  // ImageResponse renders lazily as its body is read, so a satori error would
  // escape a try/catch around the constructor. Reading the bytes here is what
  // makes the fallback reachable.
  const png = async (el: React.ReactElement, s: number) => {
    const bytes = await new ImageResponse(el, { ...size, fonts }).arrayBuffer();
    return new Response(bytes, { headers: { "Content-Type": contentType, ...cache(s) } });
  };
  try {
    return await png(await build(), maxAge);
  } catch (err) {
    console.error("[og] card failed, serving default:", err);
    return png(<DefaultCard />, 60);
  }
}

export function DefaultCard() {
  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%" }}>
        <Wordmark size={168} />
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: C.muted }}>
          Track, rate and review the games you play.
        </div>
      </div>
    </Frame>
  );
}
