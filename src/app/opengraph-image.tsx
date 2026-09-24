import { DefaultCard, respond } from "@/lib/og/card";

export const alt = "GameLog — track, rate and review the games you play";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return respond(async () => <DefaultCard />, 60 * 60 * 24);
}
