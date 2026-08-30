"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Filters the games library by platform via the `platform` query param. */
export function PlatformFilter({
  platforms,
  current,
}: {
  platforms: string[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("platform", value);
    else params.delete("platform");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  if (platforms.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-500">
      Platform
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-800 bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent [color-scheme:dark]"
      >
        <option value="">All platforms</option>
        {platforms.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
    </label>
  );
}
