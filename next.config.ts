import type { NextConfig } from "next";

// One address for the site. www and the old vercel.app address both serve the
// whole app, which splits search ranking across three copies and signs people in
// separately on each (cookies are per host). Redirect them to the canonical
// domain, keeping the path and query so existing shared links still land.
// Only exact hosts match, so preview deployments are untouched.
const CANONICAL = "https://gamelog.live";
const ALIASES = ["www.gamelog.live", "gamelog-liard.vercel.app"];

const nextConfig: NextConfig = {
  async redirects() {
    return ALIASES.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${CANONICAL}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;
