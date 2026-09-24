import { getListCached } from "@/lib/db/cached";
import { truncate } from "@/lib/seo";
import { C, CoverGrid, DefaultCard, Frame, Wordmark, fetchCover, fitFont, respond } from "@/lib/og/card";

export const alt = "List on GameLog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return respond(async () => {
    const list = await getListCached(id);
    // Private lists get the site card, matching the page's own metadata.
    if (!list || !list.isPublic) return <DefaultCard />;

    const covers = (
      await Promise.all(list.items.filter((i) => i.coverUrl).slice(0, 4).map((i) => fetchCover(i.coverUrl)))
    ).filter((c): c is string => c !== null);

    const count = `${list.items.length} ${list.items.length === 1 ? "game" : "games"}`;
    const by = list.displayName ?? list.username;
    const textWidth = covers.length ? 1072 - (covers.length === 1 ? 330 : 380) - 56 : 1072;
    const title = truncate(list.title, 100);
    const fs = fitFont(title, textWidth, 3);

    return (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, minWidth: 0 }}>
          <Wordmark />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{ display: "flex", fontSize: fs, lineHeight: 1.05, letterSpacing: -2, lineClamp: 3, wordBreak: "break-word" }}
            >
              {title}
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: C.muted, lineClamp: 2 }}>
              {`by ${truncate(by, 40)}  ·  ${count}`}
            </div>
          </div>
          <div style={{ display: "flex" }} />
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
