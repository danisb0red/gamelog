import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/search-view";
import { OutThisWeek } from "@/components/releases/out-this-week";

export const metadata: Metadata = { title: "Search · GameLog" };
// Dynamic: "this week" rendered at build time would be frozen at build time.
export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />
      <SearchView
        idle={
          <Suspense fallback={null}>
            <OutThisWeek />
          </Suspense>
        }
      />
    </main>
  );
}
