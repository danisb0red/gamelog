import { getGameSafe } from "@/lib/games/lookup";
import { truncate } from "@/lib/seo";
import {
  C,
  Cover,
  DefaultCard,
  Frame,
  TEXT_WIDTH_FULL,
  Wordmark,
  fetchCover,
  fitFont,
  respond,
} from "@/lib/og/card";

export const alt = "Game on GameLog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Cards are built per request (the game data is cached upstream) and cached by
// the CDN through the headers set in respond().
export const dynamic = "force-dynamic";

const COVER_W = 377;
const COVER_H = 502;

function platformLine(platforms: string[]): string {
  // IGDB's "PC (Microsoft Windows)" is the one name long enough to wrap the line.
  const short = platforms.map((p) => (p === "PC (Microsoft Windows)" ? "PC" : p));
  if (short.length <= 4) return short.join(" · ");
  return `${short.slice(0, 4).join(" · ")} +${short.length - 4}`;
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return respond(async () => {
    const game = await getGameSafe(slug);
    if (!game) return <DefaultCard />;
    const cover = await fetchCover(game.coverUrl);

    const textWidth = cover ? TEXT_WIDTH_FULL - COVER_W - 56 : TEXT_WIDTH_FULL;
    // lineClamp isn't reliable in satori, so bound the text itself.
    const title = truncate(game.name, 100);
    const fs = fitFont(title, textWidth, 3);
    const meta = [game.releaseYear, platformLine(game.platforms)].filter(Boolean).join("   ·   ");

    return (
      <Frame>
        {cover && (
          <div style={{ display: "flex", marginRight: 56 }}>
            <Cover src={cover} width={COVER_W} height={COVER_H} />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: fs,
                lineHeight: 1.05,
                letterSpacing: -2,
                lineClamp: 3,
                wordBreak: "break-word",
              }}
            >
              {title}
            </div>
            {meta && (
              <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: C.muted, lineClamp: 2 }}>{meta}</div>
            )}
          </div>
          <div style={{ display: "flex" }} />
        </div>
      </Frame>
    );
  }, 60 * 60 * 24);
}
