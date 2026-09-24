import type { GameDetail } from "@/lib/games/types";
import { absoluteUrl } from "@/lib/site";
import { truncate } from "@/lib/seo";

/**
 * JSON inside <script> ends at the first "</script", and user-derived text
 * (game names, list titles) can contain anything. Escaping "<" as < is
 * still valid JSON but can never close the tag; U+2028/9 are escaped for older
 * parsers that treat them as line terminators.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replaceAll(String.fromCharCode(0x2028), "\\u2028")
    .replaceAll(String.fromCharCode(0x2029), "\\u2029");
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

/**
 * schema.org VideoGame. `aggregateRating` is GameLog's own community average
 * only, and only when someone has rated it: IGDB's score isn't our users'
 * opinion, and marking a third party's rating up as ours is what Google
 * penalises as review spam.
 */
export function GameJsonLd({
  game,
  aggregate,
}: {
  game: GameDetail;
  aggregate: { average: number | null; ratingCount: number };
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    url: absoluteUrl(`/g/${game.slug}`),
    ...(game.coverUrl && { image: game.coverUrl.replace("/t_cover_big/", "/t_720p/") }),
    ...(game.description && { description: truncate(game.description, 300) }),
    ...(game.releaseDate && { datePublished: game.releaseDate }),
    ...(game.platforms.length > 0 && { gamePlatform: game.platforms }),
    ...(game.genres.length > 0 && { genre: game.genres }),
    ...(game.developers.length > 0 && {
      author: game.developers.map((d) => ({ "@type": "Organization", name: d.name })),
    }),
    ...(game.publishers.length > 0 && {
      publisher: game.publishers.map((p) => ({ "@type": "Organization", name: p.name })),
    }),
  };
  if (aggregate.average != null && aggregate.ratingCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(aggregate.average.toFixed(2)),
      ratingCount: aggregate.ratingCount,
      bestRating: 5,
      worstRating: 0.5,
    };
  }
  return <JsonLd data={data} />;
}
