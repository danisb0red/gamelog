import { getProfileCached } from "@/lib/db/cached";
import { truncate } from "@/lib/seo";
import { getUserFavorites, getUserGames, getUserWishlist } from "@/lib/db/queries";
import { C, CoverGrid, DefaultCard, Frame, Wordmark, fetchCover, fitFont, respond } from "@/lib/og/card";

export const alt = "Profile on GameLog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 150 }}>
      <div style={{ display: "flex", fontSize: 64, letterSpacing: -2 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 24, color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return respond(async () => {
    const profile = await getProfileCached(username);
    if (!profile) return <DefaultCard />;

    const [shelf, favorites, wishlist] = await Promise.all([
      getUserGames(profile.id),
      getUserFavorites(profile.id),
      getUserWishlist(profile.id),
    ]);
    const rated = shelf.filter((g) => g.rating != null);
    const avg = rated.length ? rated.reduce((s, g) => s + Number(g.rating), 0) / rated.length : null;

    const covers = (
      await Promise.all(favorites.filter((f) => f.coverUrl).slice(0, 4).map((f) => fetchCover(f.coverUrl)))
    ).filter((c): c is string => c !== null);

    const name = truncate(profile.displayName ?? profile.username, 50);
    const textWidth = covers.length ? 1072 - (covers.length === 1 ? 330 : 380) - 56 : 1072;
    const fs = fitFont(name, textWidth, 2, [96, 80, 64, 54]);

    return (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{ display: "flex", fontSize: fs, lineHeight: 1.05, letterSpacing: -2, lineClamp: 2, wordBreak: "break-word" }}
            >
              {name}
            </div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 36, color: C.muted }}>{`@${profile.username}`}</div>
          </div>
          <div style={{ display: "flex" }}>
            <Stat value={String(shelf.length)} label="games" />
            <Stat value={String(rated.length)} label="rated" />
            <Stat value={avg == null ? "–" : avg.toFixed(1)} label="average" />
            <Stat value={String(wishlist.length)} label="wishlist" />
          </div>
        </div>
        {covers.length > 0 && (
          <div style={{ display: "flex", marginLeft: 56, alignItems: "center" }}>
            <CoverGrid covers={covers} />
          </div>
        )}
      </Frame>
    );
  }, 60 * 60);
}
