import type { Metadata } from "next";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = { title: "Search · GameLog" };

export default function SearchPage() {
  return (
    <main className="relative flex-1">
      <div className="ambient-warm" aria-hidden="true" />
      <SearchView />
    </main>
  );
}
