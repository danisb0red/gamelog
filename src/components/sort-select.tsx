"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GAME_SORTS } from "@/lib/games/types";

/** Game-list sort dropdown. Updates the `sort` query param and re-renders. */
export function SortSelect({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-neutral-500">
      Sort
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-neutral-800 bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-accent"
      >
        {GAME_SORTS.map((s) => (
          <option key={s.value} value={s.value} className="text-black">
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
